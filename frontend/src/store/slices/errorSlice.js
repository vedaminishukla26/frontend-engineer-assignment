import { createSlice } from '@reduxjs/toolkit';
import { report } from '../../report.js';

/**
 * Generate unique key for a failure incident
 */
function getErrorKey(region, screenId, elementKey, retryCount = 0) {
  return `${region}_${screenId || 'null'}_${elementKey || 'none'}_#${retryCount}`;
}

const errorSlice = createSlice({
  name: 'error',
  initialState: {
    // Current active error by region
    regionErrors: {
      board: null,
      layers: null,
      details: null,
      inspector: null,
      preview: {}, // { [screenId]: error }
      'layers-row': {}, // { [rowId]: error }
    },
    // Set of error keys already reported
    reportedErrorKeys: [],
    // Retry attempts per key
    retryCounters: {},
    // Runtime uncaught errors reported by preview iframes (R6.3)
    pageErrorsByScreen: {}, // { [screenId]: Array<{ message, filename, lineno, timestamp }> }
    // Dev failure simulation flags
    devSimulatedFailures: {
      screensFail: false,
      previewTimeout: false,
      layersFail: false,
      layerRowTimeout: false,
      detailsFail: false,
      inspectorRenderFail: false,
    },
  },
  reducers: {
    recordRegionalError: (state, action) => {
      const { region, screenId = null, elementKey = null, error } = action.payload;
      const errorMsg = typeof error === 'string' ? error : error?.message || 'An error occurred';

      // Set active error in state
      if (region === 'preview') {
        state.regionErrors.preview[screenId] = errorMsg;
      } else if (region === 'layers-row') {
        const rowId = action.payload.rowId || elementKey || 'unknown';
        state.regionErrors['layers-row'][rowId] = errorMsg;
      } else {
        state.regionErrors[region] = errorMsg;
      }

      // Track retry count
      const baseKey = `${region}_${screenId || 'null'}_${elementKey || 'none'}`;
      const count = state.retryCounters[baseKey] || 0;
      const incidentKey = getErrorKey(region, screenId, elementKey, count);

      // Report exactly once for this failure incident
      if (!state.reportedErrorKeys.includes(incidentKey)) {
        state.reportedErrorKeys.push(incidentKey);
        try {
          report(new Error(errorMsg), {
            region,
            screenId,
            ...(elementKey ? { elementKey } : {}),
          });
        } catch (e) {
          console.error('[ErrorReporter] Failed calling report()', e);
        }
      }
    },

    clearRegionalError: (state, action) => {
      const { region, screenId = null, elementKey = null } = action.payload;
      if (region === 'preview' && screenId) {
        delete state.regionErrors.preview[screenId];
      } else if (region === 'layers-row') {
        const rowId = action.payload.rowId || elementKey;
        if (rowId) delete state.regionErrors['layers-row'][rowId];
      } else {
        state.regionErrors[region] = null;
      }

      // Increment retry counter so next failure on retry is treated as new incident
      const baseKey = `${region}_${screenId || 'null'}_${elementKey || 'none'}`;
      state.retryCounters[baseKey] = (state.retryCounters[baseKey] || 0) + 1;
    },

    addPageRuntimeError: (state, action) => {
      const { screenId, message, filename, lineno } = action.payload;
      if (!state.pageErrorsByScreen[screenId]) {
        state.pageErrorsByScreen[screenId] = [];
      }
      state.pageErrorsByScreen[screenId].push({
        message,
        filename,
        lineno,
        timestamp: Date.now(),
      });
    },

    setDevSimulatedFailure: (state, action) => {
      const { failureKey, enabled } = action.payload;
      state.devSimulatedFailures[failureKey] = enabled;
    },
  },
});

export const {
  recordRegionalError,
  clearRegionalError,
  addPageRuntimeError,
  setDevSimulatedFailure,
} = errorSlice.actions;

export default errorSlice.reducer;

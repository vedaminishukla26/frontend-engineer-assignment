import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_BASE = 'http://localhost:4000';

export const fetchElementDetails = createAsyncThunk(
  'inspector/fetchElementDetails',
  async ({ key, latency, fail }, { rejectWithValue, signal }) => {
    if (!key) return null;
    try {
      const url = new URL(`${API_BASE}/elements/${encodeURIComponent(key)}`);
      if (latency) url.searchParams.set('latency', latency);
      if (fail) url.searchParams.set('fail', fail);

      const res = await fetch(url.toString(), { signal });
      if (res.status === 404) {
        return { is404: true, key };
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      return { key, ...data };
    } catch (err) {
      if (err.name === 'AbortError') {
        return rejectWithValue('aborted');
      }
      return rejectWithValue(err.message || 'Failed to fetch element details');
    }
  }
);

const inspectorSlice = createSlice({
  name: 'inspector',
  initialState: {
    detailsByKey: {}, // cache of { [key]: details }
    currentKey: null,
    detailsStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed' | 'notFound' | 'noKey'
    detailsError: null,
  },
  reducers: {
    setCurrentKey: (state, action) => {
      state.currentKey = action.payload;
      if (!action.payload) {
        state.detailsStatus = 'noKey';
        state.detailsError = null;
      }
    },
    clearDetails: (state) => {
      state.currentKey = null;
      state.detailsStatus = 'idle';
      state.detailsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchElementDetails.pending, (state, action) => {
        state.detailsStatus = 'loading';
        state.detailsError = null;
      })
      .addCase(fetchElementDetails.fulfilled, (state, action) => {
        if (!action.payload) {
          state.detailsStatus = 'noKey';
          return;
        }
        if (action.payload.is404) {
          state.detailsStatus = 'notFound';
          return;
        }
        state.detailsStatus = 'succeeded';
        state.detailsByKey[action.payload.key] = action.payload;
      })
      .addCase(fetchElementDetails.rejected, (state, action) => {
        if (action.payload === 'aborted') {
          // Ignore cancelled requests
          return;
        }
        state.detailsStatus = 'failed';
        state.detailsError = action.payload || 'Failed to fetch details';
      });
  },
});

export const { setCurrentKey, clearDetails } = inspectorSlice.actions;

export default inspectorSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_BASE = 'http://localhost:4000';

export function getDefaultScreenPosition(index) {
  const col = index % 4;
  const row = Math.floor(index / 4);
  return {
    x: 80 + col * (1280 + 100),
    y: 80 + row * (844 + 120),
  };
}

export const fetchScreens = createAsyncThunk(
  'board/fetchScreens',
  async (params = {}, { rejectWithValue }) => {
    try {
      const url = new URL(`${API_BASE}/screens`);
      if (params.latency) url.searchParams.set('latency', params.latency);
      if (params.fail) url.searchParams.set('fail', params.fail);

      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error(`Failed to fetch screens: HTTP ${res.status}`);
      }
      const data = await res.json();
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch screens');
    }
  }
);

const boardSlice = createSlice({
  name: 'board',
  initialState: {
    mode: 'select', // 'select' | 'interact'
    pan: { x: 80, y: 80 },
    zoom: 1.0, // 0.25 to 4.0
    showLayers: true,
    showInspector: true,
    screens: [],
    screenPositions: {}, // { [screenId]: { x, y } }
    screensStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
    screensError: null,
  },
  reducers: {
    toggleLayers: (state) => {
      state.showLayers = !state.showLayers;
    },
    toggleInspector: (state) => {
      state.showInspector = !state.showInspector;
    },
    setShowLayers: (state, action) => {
      state.showLayers = Boolean(action.payload);
    },
    setShowInspector: (state, action) => {
      state.showInspector = Boolean(action.payload);
    },
    setMode: (state, action) => {
      state.mode = action.payload;
    },
    toggleMode: (state) => {
      state.mode = state.mode === 'select' ? 'interact' : 'select';
    },
    setPan: (state, action) => {
      state.pan = action.payload;
    },
    updatePan: (state, action) => {
      state.pan.x += action.payload.dx;
      state.pan.y += action.payload.dy;
    },
    setZoom: (state, action) => {
      state.zoom = Math.min(4.0, Math.max(0.25, action.payload));
    },
    zoomAtPoint: (state, action) => {
      const { clientX, clientY, factor, canvasRect } = action.payload;
      const oldZoom = state.zoom;
      const newZoom = Math.min(4.0, Math.max(0.25, oldZoom * factor));
      if (newZoom === oldZoom) return;

      const originX = clientX - (canvasRect ? canvasRect.left : 0);
      const originY = clientY - (canvasRect ? canvasRect.top : 0);

      // Adjust pan so point under cursor stays invariant
      state.pan.x = originX - ((originX - state.pan.x) * newZoom) / oldZoom;
      state.pan.y = originY - ((originY - state.pan.y) * newZoom) / oldZoom;
      state.zoom = newZoom;
    },
    resetView: (state) => {
      state.pan = { x: 80, y: 80 };
      state.zoom = 1.0;
    },
    fitToScreen: (state) => {
      state.pan = { x: 40, y: 40 };
      state.zoom = 0.35;
    },
    setScreenPosition: (state, action) => {
      const { screenId, x, y } = action.payload;
      state.screenPositions[screenId] = { x, y };
    },
    resetScreenPositions: (state) => {
      const newPos = {};
      state.screens.forEach((s, idx) => {
        newPos[s.id] = getDefaultScreenPosition(idx);
      });
      state.screenPositions = newPos;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchScreens.pending, (state) => {
        state.screensStatus = 'loading';
        state.screensError = null;
      })
      .addCase(fetchScreens.fulfilled, (state, action) => {
        state.screensStatus = 'succeeded';
        state.screens = action.payload;
        const initialPos = {};
        action.payload.forEach((screen, idx) => {
          initialPos[screen.id] = getDefaultScreenPosition(idx);
        });
        state.screenPositions = initialPos;
      })
      .addCase(fetchScreens.rejected, (state, action) => {
        state.screensStatus = 'failed';
        state.screensError = action.payload || 'Failed to load screens';
      });
  },
});

export const {
  toggleLayers,
  toggleInspector,
  setShowLayers,
  setShowInspector,
  setMode,
  toggleMode,
  setPan,
  updatePan,
  setZoom,
  zoomAtPoint,
  resetView,
  fitToScreen,
  setScreenPosition,
  resetScreenPositions,
} = boardSlice.actions;

export default boardSlice.reducer;


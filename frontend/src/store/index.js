import { configureStore } from '@reduxjs/toolkit';
import boardReducer from './slices/boardSlice.js';
import selectionReducer from './slices/selectionSlice.js';
import layersReducer from './slices/layersSlice.js';
import inspectorReducer from './slices/inspectorSlice.js';
import errorReducer from './slices/errorSlice.js';

export const store = configureStore({
  reducer: {
    board: boardReducer,
    selection: selectionReducer,
    layers: layersReducer,
    inspector: inspectorReducer,
    error: errorReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;

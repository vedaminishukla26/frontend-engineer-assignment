import { createSlice } from '@reduxjs/toolkit';

const layersSlice = createSlice({
  name: 'layers',
  initialState: {
    treeByScreen: {}, // { [screenId]: { [parentPath]: childNodes[] } }
    expandedByScreen: {}, // { [screenId]: string[] (set of expanded node paths/keys) }
    scrollPosByScreen: {}, // { [screenId]: number }
    loadingRows: {}, // { [rowKey]: boolean }
    errorRows: {}, // { [rowKey]: string }
    searchQuery: '',
    searchResults: null, // null or array of matched items
  },
  reducers: {
    setTreeNodes: (state, action) => {
      const { screenId, parentPath, children } = action.payload;
      if (!state.treeByScreen[screenId]) {
        state.treeByScreen[screenId] = {};
      }
      state.treeByScreen[screenId][parentPath || 'body'] = children;
    },
    toggleExpandNode: (state, action) => {
      const { screenId, nodePath } = action.payload;
      if (!state.expandedByScreen[screenId]) {
        state.expandedByScreen[screenId] = [];
      }
      const list = state.expandedByScreen[screenId];
      const idx = list.indexOf(nodePath);
      if (idx >= 0) {
        list.splice(idx, 1);
      } else {
        list.push(nodePath);
      }
    },
    expandAncestors: (state, action) => {
      const { screenId, ancestors } = action.payload;
      if (!state.expandedByScreen[screenId]) {
        state.expandedByScreen[screenId] = [];
      }
      const list = state.expandedByScreen[screenId];
      ancestors.forEach((anc) => {
        if (!list.includes(anc)) {
          list.push(anc);
        }
      });
    },
    setRowLoading: (state, action) => {
      const { rowKey, loading } = action.payload;
      if (loading) {
        state.loadingRows[rowKey] = true;
        delete state.errorRows[rowKey];
      } else {
        delete state.loadingRows[rowKey];
      }
    },
    setRowError: (state, action) => {
      const { rowKey, error } = action.payload;
      delete state.loadingRows[rowKey];
      if (error) {
        state.errorRows[rowKey] = error;
      } else {
        delete state.errorRows[rowKey];
      }
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
      if (!action.payload) {
        state.searchResults = null;
      }
    },
    setSearchResults: (state, action) => {
      state.searchResults = action.payload;
    },
    setScrollPos: (state, action) => {
      const { screenId, pos } = action.payload;
      state.scrollPosByScreen[screenId] = pos;
    },
    resetScreenTree: (state, action) => {
      const { screenId } = action.payload;
      delete state.treeByScreen[screenId];
      delete state.expandedByScreen[screenId];
      delete state.scrollPosByScreen[screenId];
    },
  },
});

export const {
  setTreeNodes,
  toggleExpandNode,
  expandAncestors,
  setRowLoading,
  setRowError,
  setSearchQuery,
  setSearchResults,
  setScrollPos,
  resetScreenTree,
} = layersSlice.actions;

export default layersSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { hostProtocol } from '../../ipc/hostProtocol.js';
import { IPC_MESSAGES } from '../../ipc/messageTypes.js';

export const fetchTreeChildren = createAsyncThunk(
  'layers/fetchTreeChildren',
  async ({ screenId, parentPath = 'body', parentKey = null }, { dispatch, rejectWithValue }) => {
    const rowKey = `${screenId}:${parentPath}`;
    dispatch(setRowLoading({ rowKey, loading: true }));

    try {
      const res = await hostProtocol.sendRpc(
        screenId,
        IPC_MESSAGES.QUERY_CHILDREN_REQ,
        { parentPath, parentKey },
        3000 // 3s timeout per R4.2
      );

      dispatch(
        setTreeNodes({
          screenId,
          parentPath: res?.parentPath || parentPath,
          children: res?.children || [],
        })
      );
      dispatch(setRowLoading({ rowKey, loading: false }));
      return { screenId, parentPath, children: res?.children || [] };
    } catch (err) {
      const errorMsg = err.message || 'Failed to load children';
      dispatch(setRowError({ rowKey, error: errorMsg }));
      return rejectWithValue({ rowKey, error: errorMsg });
    }
  }
);

export const searchTree = createAsyncThunk(
  'layers/searchTree',
  async ({ screenId, query }, { dispatch, rejectWithValue }) => {
    if (!query || !query.trim()) {
      dispatch(setSearchResults(null));
      return null;
    }

    try {
      const res = await hostProtocol.sendRpc(
        screenId,
        IPC_MESSAGES.QUERY_SEARCH_REQ,
        { query: query.trim() },
        3000
      );

      const results = res?.results || [];
      dispatch(setSearchResults(results));

      // Auto-expand all ancestor paths of matched items (R4.5)
      const allAncestors = new Set();
      results.forEach((item) => {
        (item.ancestors || []).forEach((anc) => allAncestors.add(anc));
      });

      if (allAncestors.size > 0) {
        dispatch(
          expandAncestors({
            screenId,
            ancestors: Array.from(allAncestors),
          })
        );
      }

      return results;
    } catch (err) {
      return rejectWithValue(err.message || 'Search failed');
    }
  }
);

const layersSlice = createSlice({
  name: 'layers',
  initialState: {
    treeByScreen: {}, // { [screenId]: { [parentPath]: childNodes[] } }
    expandedByScreen: {}, // { [screenId]: string[] (paths of expanded nodes) }
    scrollPosByScreen: {}, // { [screenId]: number }
    loadingRows: {}, // { [rowKey]: boolean }
    errorRows: {}, // { [rowKey]: string }
    searchQuery: '',
    searchResults: null, // null | Array<{ element, ancestors }>
    focusedNodePath: null,
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
    setFocusedNodePath: (state, action) => {
      state.focusedNodePath = action.payload;
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
  setFocusedNodePath,
  setScrollPos,
  resetScreenTree,
} = layersSlice.actions;

export default layersSlice.reducer;

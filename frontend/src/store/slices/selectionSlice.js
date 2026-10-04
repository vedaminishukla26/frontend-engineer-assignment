import { createSlice } from '@reduxjs/toolkit';

const selectionSlice = createSlice({
  name: 'selection',
  initialState: {
    activeScreenId: null,
    selectedElements: [], // [{ id, path, key, name, tag, rect, computedStyles, screenId }]
    hoverElement: null, // { screenId, id, name, tag, rect }
    lastSelectedId: null,
    isElementDeleted: false,
  },
  reducers: {
    setActiveScreenId: (state, action) => {
      state.activeScreenId = action.payload;
    },
    setHoverElement: (state, action) => {
      state.hoverElement = action.payload;
    },
    clearHoverElement: (state) => {
      state.hoverElement = null;
    },
    selectElement: (state, action) => {
      const { screenId, element, multiSelect } = action.payload;
      state.isElementDeleted = false;

      // If selecting in a different preview without multi-select or with multi-select across previews:
      // README R3.2: "Shift + click adds or removes an element in the same preview. Shift + click in a different preview replaces the selection with that element."
      if (state.activeScreenId !== screenId) {
        state.activeScreenId = screenId;
        state.selectedElements = [{ ...element, screenId }];
        state.lastSelectedId = element.id;
        return;
      }

      if (multiSelect) {
        const existingIndex = state.selectedElements.findIndex((e) => e.id === element.id);
        if (existingIndex >= 0) {
          state.selectedElements.splice(existingIndex, 1);
          state.lastSelectedId =
            state.selectedElements.length > 0
              ? state.selectedElements[state.selectedElements.length - 1].id
              : null;
        } else {
          state.selectedElements.push({ ...element, screenId });
          state.lastSelectedId = element.id;
        }
      } else {
        state.selectedElements = [{ ...element, screenId }];
        state.lastSelectedId = element.id;
      }
    },
    setSingleSelection: (state, action) => {
      const { screenId, element } = action.payload;
      state.activeScreenId = screenId;
      state.selectedElements = element ? [{ ...element, screenId }] : [];
      state.lastSelectedId = element ? element.id : null;
      state.isElementDeleted = false;
    },
    clearSelection: (state) => {
      state.selectedElements = [];
      state.lastSelectedId = null;
    },
    updateSelectedRects: (state, action) => {
      const { screenId, updatedSelections, vanishedIds } = action.payload;
      if (state.activeScreenId !== screenId) return;

      if (vanishedIds && vanishedIds.length > 0) {
        state.selectedElements = state.selectedElements.filter(
          (el) => !vanishedIds.includes(el.id)
        );
        if (state.selectedElements.length === 0) {
          state.isElementDeleted = true;
        }
      }

      if (updatedSelections) {
        state.selectedElements = state.selectedElements.map((el) => {
          const match = updatedSelections.find((u) => u.id === el.id);
          return match ? { ...el, ...match } : el;
        });
      }
    },
    markElementDeleted: (state, action) => {
      state.isElementDeleted = Boolean(action.payload);
    },
  },
});

export const {
  setActiveScreenId,
  setHoverElement,
  clearHoverElement,
  selectElement,
  setSingleSelection,
  clearSelection,
  updateSelectedRects,
  markElementDeleted,
} = selectionSlice.actions;

export default selectionSlice.reducer;

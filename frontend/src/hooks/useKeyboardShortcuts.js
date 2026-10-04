import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setMode } from '../store/slices/boardSlice.js';
import { clearSelection } from '../store/slices/selectionSlice.js';
import { hostProtocol } from '../ipc/hostProtocol.js';
import { IPC_MESSAGES } from '../ipc/messageTypes.js';

export function useKeyboardShortcuts() {
  const dispatch = useDispatch();
  const activeScreenId = useSelector((state) => state.selection.activeScreenId);
  const selectedElements = useSelector((state) => state.selection.selectedElements);
  const lastSelectedId = useSelector((state) => state.selection.lastSelectedId);

  const stateRef = useRef({ activeScreenId, selectedElements, lastSelectedId });
  useEffect(() => {
    stateRef.current = { activeScreenId, selectedElements, lastSelectedId };
  }, [activeScreenId, selectedElements, lastSelectedId]);

  useEffect(() => {
    const handleAction = ({ key, shiftKey }) => {
      const { activeScreenId: currentScreenId, selectedElements: curSelections, lastSelectedId: curLastId } = stateRef.current;

      if (key === 'Escape') {
        dispatch(clearSelection());
        return;
      }

      if (key === 'v' || key === 'V') {
        dispatch(setMode('select'));
        return;
      }

      if (key === 'i' || key === 'I') {
        dispatch(setMode('interact'));
        return;
      }

      // Tree Navigation (Enter, Shift+Enter, Tab, Shift+Tab)
      if (!currentScreenId || !curLastId || curSelections.length === 0) return;

      const lastEl = curSelections.find((el) => el.id === curLastId) || curSelections[curSelections.length - 1];
      const currentKey = lastEl?.key;

      if (key === 'Enter') {
        const direction = shiftKey ? 'parent' : 'first_child';
        hostProtocol.postToScreen(currentScreenId, IPC_MESSAGES.KEYBOARD_NAV_REQ, {
          direction,
          currentId: curLastId,
          currentKey,
        });
      } else if (key === 'Tab') {
        const direction = shiftKey ? 'prev_sibling' : 'next_sibling';
        hostProtocol.postToScreen(currentScreenId, IPC_MESSAGES.KEYBOARD_NAV_REQ, {
          direction,
          currentId: curLastId,
          currentKey,
        });
      }
    };

    // 1. Host window listener
    const handleHostKeyDown = (e) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes(e.target?.tagName);
      if (isInput && e.key !== 'Escape') return;

      const navKeys = ['Enter', 'Tab', 'Escape', 'v', 'V', 'i', 'I'];
      if (navKeys.includes(e.key)) {
        if (e.key === 'Tab' || e.key === 'Enter') {
          e.preventDefault();
        }
        handleAction({
          key: e.key,
          shiftKey: Boolean(e.shiftKey),
          ctrlKey: Boolean(e.ctrlKey),
          metaKey: Boolean(e.metaKey),
        });
      }
    };

    // 2. Guest iframe forwarded shortcuts listener
    const unsubscribe = hostProtocol.subscribe((type, payload) => {
      if (type === IPC_MESSAGES.KEYBOARD_SHORTCUT) {
        handleAction({
          key: payload.key,
          shiftKey: Boolean(payload.shiftKey),
          ctrlKey: Boolean(payload.ctrlKey),
          metaKey: Boolean(payload.metaKey),
        });
      }
    });

    window.addEventListener('keydown', handleHostKeyDown);

    return () => {
      window.removeEventListener('keydown', handleHostKeyDown);
      unsubscribe();
    };
  }, [dispatch]);
}

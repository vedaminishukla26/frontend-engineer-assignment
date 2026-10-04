import React, { useRef, useEffect, useState, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { hostProtocol } from '../ipc/hostProtocol.js';
import { IPC_MESSAGES } from '../ipc/messageTypes.js';
import {
  setActiveScreenId,
  setHoverElement,
  clearHoverElement,
  selectElement,
  setSingleSelection,
  clearSelection,
  updateSelectedRects,
} from '../store/slices/selectionSlice.js';
import HoverOverlay from './HoverOverlay.jsx';
import SelectionOverlay from './SelectionOverlay.jsx';
import { AlertTriangle, RefreshCw } from 'lucide-react';

function ScreenPreview({ screen, index }) {
  const dispatch = useDispatch();
  const iframeRef = useRef(null);
  const containerRef = useRef(null);

  // Granular selector: only re-render if THIS screen becomes active/inactive
  const isActive = useSelector((state) => state.selection.activeScreenId === screen.id);
  const selectedElements = useSelector((state) => state.selection.selectedElements);
  const mode = useSelector((state) => state.board.mode);

  const selectedElementsRef = useRef(selectedElements);
  const isActiveRef = useRef(isActive);
  useEffect(() => {
    selectedElementsRef.current = selectedElements;
  }, [selectedElements]);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const [isConnected, setIsConnected] = useState(false);
  const [pageError, setPageError] = useState(null);
  const [connectionTimeout, setConnectionTimeout] = useState(false);

  // Register iframe with Host Protocol on mount
  useEffect(() => {
    const iframe = iframeRef.current;
    if (iframe) {
      hostProtocol.registerIframe(screen.id, iframe);
    }

    // 10 second connection timeout check (R6.2)
    const timeoutTimer = setTimeout(() => {
      if (!isConnected) {
        setConnectionTimeout(true);
      }
    }, 10000);

    return () => {
      clearTimeout(timeoutTimer);
      hostProtocol.unregisterIframe(screen.id);
    };
  }, [screen.id, isConnected]);

  // Subscribe to IPC messages for this screen
  useEffect(() => {
    const unsubscribe = hostProtocol.subscribe((type, payload, url, sourceWin) => {
      const currentWin = iframeRef.current?.contentWindow;
      if (sourceWin !== currentWin) return;

      if (type === IPC_MESSAGES.PROBE_INIT || type === IPC_MESSAGES.PROBE_ACK) {
        setIsConnected(true);
        setConnectionTimeout(false);
        // Send current mode to probe
        hostProtocol.postToScreen(screen.id, IPC_MESSAGES.SET_MODE, { mode });
      } else if (type === IPC_MESSAGES.ELEMENT_HOVER) {
        if (payload?.element) {
          dispatch(setHoverElement({ screenId: screen.id, ...payload.element }));
        }
      } else if (type === IPC_MESSAGES.ELEMENT_UNHOVER) {
        dispatch(clearHoverElement());
      } else if (type === IPC_MESSAGES.ELEMENT_SELECT) {
        if (payload?.element) {
          dispatch(
            selectElement({
              screenId: screen.id,
              element: payload.element,
              multiSelect: Boolean(payload.shiftKey),
            })
          );
        }
      } else if (type === IPC_MESSAGES.CLEAR_SELECTION) {
        dispatch(clearSelection());
      } else if (type === IPC_MESSAGES.DOM_MUTATED || type === IPC_MESSAGES.GEOMETRY_CHANGED) {
        if (isActiveRef.current && selectedElementsRef.current.length > 0) {
          hostProtocol.postToScreen(screen.id, IPC_MESSAGES.RECONCILE_REQ, {
            requestId: Date.now(),
            descriptors: selectedElementsRef.current.map((el) => ({
              id: el.id,
              key: el.key,
              path: el.path,
            })),
          });
        }
      } else if (type === IPC_MESSAGES.RECONCILE_RESP) {
        dispatch(
          updateSelectedRects({
            screenId: screen.id,
            updatedSelections: payload?.updated || [],
            vanishedIds: payload?.vanishedIds || [],
          })
        );
      } else if (type === IPC_MESSAGES.KEYBOARD_NAV_RESP) {
        if (payload?.element) {
          dispatch(
            setSingleSelection({
              screenId: screen.id,
              element: payload.element,
            })
          );
        }
      } else if (type === IPC_MESSAGES.PAGE_ERROR) {
        setPageError(payload?.message || 'Page script error');
      } else if (type === IPC_MESSAGES.PAGE_NAVIGATED) {
        setPageError(null);
        dispatch(clearSelection());
      }
    });

    return () => unsubscribe();
  }, [screen.id, mode, dispatch]);

  const handleFrameClick = () => {
    dispatch(setActiveScreenId(screen.id));
  };

  const handleReload = (e) => {
    e.stopPropagation();
    setConnectionTimeout(false);
    setIsConnected(false);
    setPageError(null);
    if (iframeRef.current) {
      iframeRef.current.src = screen.url;
    }
  };

  return (
    <div
      ref={containerRef}
      data-screen-id={screen.id}
      onClick={handleFrameClick}
      className={`relative flex flex-col rounded-2xl transition-shadow duration-200 group ${
        isActive
          ? 'ring-2 ring-indigo-500/90 shadow-[0_0_50px_-5px_rgba(99,102,241,0.4)]'
          : 'ring-1 ring-white/[0.08] hover:ring-white/[0.18] shadow-2xl'
      } bg-[#0e1013]`}
      style={{
        width: 1280,
        contain: 'layout paint',
        transform: 'translateZ(0)',
      }}
    >
      {/* Precision Frame Header Bar */}
      <div
        className={`h-11 px-4 rounded-t-2xl flex items-center justify-between border-b transition-colors select-none ${
          isActive
            ? 'bg-[#15181e] border-indigo-500/30'
            : 'bg-[#121418] border-white/[0.06] group-hover:bg-[#15171b]'
        }`}
      >
        {/* Left: Screen Name & Index Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-[11px] font-mono text-zinc-400">
            <span className="text-zinc-500">#{index + 1}</span>
            <span className="text-zinc-200 font-semibold">{screen.name}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="text-[11px] font-mono text-zinc-500 truncate max-w-[300px]">
              {screen.url}
            </span>
          </div>
        </div>

        {/* Right: Screen Dimensions, Connection Dot & Status Badges */}
        <div className="flex items-center gap-2.5">
          {/* Page Error Badge (R6.3) */}
          {pageError && (
            <div
              title={pageError}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/60 border border-rose-500/30 text-rose-300 text-[10px] font-medium"
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Page error</span>
            </div>
          )}

          {/* Connection Status Indicator */}
          {connectionTimeout ? (
            <button
              onClick={handleReload}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-500/30 text-amber-300 text-[10px] font-medium hover:bg-amber-900/60 transition-all"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry connection</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-[10px] font-mono text-zinc-400">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-emerald-400 live-dot' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span>{isConnected ? 'Connected' : 'Connecting'}</span>
            </div>
          )}

          {/* 1280x800 Dimension Tag */}
          <div className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-zinc-400">
            1280 × 800
          </div>
        </div>
      </div>

      {/* Frame Preview Viewport (1280 × 800) */}
      <div
        className="relative overflow-hidden bg-white rounded-b-2xl"
        style={{ width: 1280, height: 800 }}
      >
        <iframe
          ref={iframeRef}
          src={screen.url}
          title={screen.name}
          loading="eager"
          className="w-full h-full border-none select-none"
          style={{
            pointerEvents: 'auto',
          }}
        />

        {/* 1px Hover Overlay & Label (R2) */}
        <HoverOverlay screenId={screen.id} />

        {/* 2px Indigo Selection Overlay & Label (R3) */}
        <SelectionOverlay screenId={screen.id} />

        {/* Connection Failure Overlay (R6.2) */}
        {connectionTimeout && !isConnected && (
          <div className="absolute inset-0 bg-[#0e1013]/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
            <div className="text-sm font-semibold text-zinc-100">
              Couldn't connect to this preview
            </div>
            <p className="text-xs text-zinc-400 max-w-sm">
              The preview script did not respond within 10 seconds. Verify the preview server is running on :4001.
            </p>
            <button
              type="button"
              onClick={handleReload}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md active:scale-[0.98] transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Memoize ScreenPreview so it NEVER re-renders on canvas pan/zoom
export default memo(ScreenPreview, (prevProps, nextProps) => {
  return (
    prevProps.screen.id === nextProps.screen.id &&
    prevProps.screen.url === nextProps.screen.url &&
    prevProps.index === nextProps.index
  );
});

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setPan, setZoom } from '../store/slices/boardSlice.js';
import { clearSelection, clearHoverElement } from '../store/slices/selectionSlice.js';
import { hostProtocol } from '../ipc/hostProtocol.js';
import { IPC_MESSAGES } from '../ipc/messageTypes.js';
import ScreenPreview from './ScreenPreview.jsx';

import RegionErrorBoundary from '../components/common/RegionErrorBoundary.jsx';
import { clearRegionalError } from '../store/slices/errorSlice.js';
import { AlertCircle, RefreshCw } from 'lucide-react';

function BoardCanvasContent() {
  const dispatch = useDispatch();
  const { pan, zoom, screens } = useSelector((state) => state.board);
  const boardError = useSelector((state) => state.error.regionErrors.board);

  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Centralized Zoom Helper: zoom centered on a specific viewport point (cx, cy)
  const applyPointerZoom = useCallback(
    (cx, cy, deltaY) => {
      // Clear hover during zoom (R2.3)
      dispatch(clearHoverElement());

      const zoomFactor = Math.pow(1.002, -deltaY);
      const newZoom = Math.min(4.0, Math.max(0.25, zoom * zoomFactor));
      if (newZoom === zoom) return;

      // World point before zoom
      const wx = (cx - pan.x) / zoom;
      const wy = (cy - pan.y) / zoom;

      // New pan to keep world point under pointer
      const newPanX = cx - wx * newZoom;
      const newPanY = cy - wy * newZoom;

      dispatch(setZoom(newZoom));
      dispatch(setPan({ x: newPanX, y: newPanY }));
    },
    [pan, zoom, dispatch]
  );

  // Wheel listener on canvas container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd + wheel: Zoom centered on pointer (R1.3)
        applyPointerZoom(cx, cy, e.deltaY);
      } else {
        // Regular wheel over empty space: Pan board (R1.2)
        dispatch(
          setPan({
            x: pan.x - e.deltaX,
            y: pan.y - e.deltaY,
          })
        );
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [pan, zoom, applyPointerZoom, dispatch]);

  // Handle Ctrl/Cmd + wheel forwarded from preview iframes (R1.3)
  useEffect(() => {
    const unsubscribe = hostProtocol.subscribe((type, payload, url, sourceWin) => {
      if (type === IPC_MESSAGES.WHEEL_ZOOM && payload) {
        const container = containerRef.current;
        if (!container) return;

        // Find which iframe sent this message
        let iframeEl = null;
        const iframes = container.querySelectorAll('iframe');
        for (const iframe of iframes) {
          if (iframe.contentWindow === sourceWin) {
            iframeEl = iframe;
            break;
          }
        }

        if (iframeEl) {
          const iframeRect = iframeEl.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          const pointerX = iframeRect.left + payload.clientX * zoom - containerRect.left;
          const pointerY = iframeRect.top + payload.clientY * zoom - containerRect.top;
          applyPointerZoom(pointerX, pointerY, payload.deltaY);
        }
      }
    });

    return () => unsubscribe();
  }, [zoom, applyPointerZoom]);

  // Drag Panning on Canvas Background
  const handleMouseDown = (e) => {
    // Only start drag on left click or middle click, on canvas background
    const isCanvasBg =
      e.target === containerRef.current ||
      e.target.getAttribute('data-canvas-bg') === 'true' ||
      e.button === 1;

    if (!isCanvasBg) return;

    if (e.button === 0) {
      // Clicking empty board space clears selection (R3.3) and hover (R2.3)
      dispatch(clearSelection());
      dispatch(clearHoverElement());
    }

    setIsDragging(true);
    dispatch(clearHoverElement());
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      dispatch(
        setPan({
          x: dragStartRef.current.panX + dx,
          y: dragStartRef.current.panY + dy,
        })
      );
    },
    [isDragging, dispatch]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      data-canvas-bg="true"
      onMouseDown={handleMouseDown}
      className={`relative w-full h-full overflow-hidden bg-fanout-grid select-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={{
        touchAction: 'none',
      }}
    >
      {/* Board Error Overlay (R6.2) */}
      {boardError ? (
        <div className="absolute inset-0 z-50 bg-[#0c0d10]/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-950/50 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md">
            <h2 className="text-base font-bold text-rose-200 uppercase tracking-wider">
              Board Failure
            </h2>
            <p className="text-xs text-rose-300 leading-relaxed">{boardError}</p>
          </div>
          <button
            type="button"
            onClick={() => dispatch(clearRegionalError({ region: 'board' }))}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-lg active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Board</span>
          </button>
        </div>
      ) : (
        /* 2D Zoom & Pan Transform Container */
        <div
          data-canvas-bg="true"
          className="absolute top-0 left-0"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
            transformOrigin: '0 0',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
          }}
        >
          {/* 24-Screen Grid Layout (4 columns x 6 rows) */}
          <div
            data-canvas-bg="true"
            className="grid grid-cols-4 gap-x-20 gap-y-24 p-24"
            style={{ width: 'max-content' }}
          >
            {screens.map((screen, idx) => (
              <ScreenPreview key={screen.id} screen={screen} index={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Transparent Drag Interaction Shield (Prevents iframe mouse throttling during pan) */}
      {isDragging && (
        <div className="absolute inset-0 z-50 cursor-grabbing pointer-events-auto" />
      )}
    </div>
  );
}

export default function BoardCanvas() {
  const dispatch = useDispatch();
  return (
    <RegionErrorBoundary
      region="board"
      regionName="Board"
      onError={(err) =>
        dispatch(
          clearRegionalError({ region: 'board' })
        )
      }
    >
      <BoardCanvasContent />
    </RegionErrorBoundary>
  );
}

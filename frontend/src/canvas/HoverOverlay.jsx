import React, { memo } from 'react';
import { useSelector } from 'react-redux';

function HoverOverlay({ screenId }) {
  const hoverElement = useSelector((state) => state.selection.hoverElement);
  const mode = useSelector((state) => state.board.mode);

  // R1.5 / R2.1: Only render in Select mode, and only for the single hovered element on this screen
  if (mode !== 'select' || !hoverElement || hoverElement.screenId !== screenId || !hoverElement.rect) {
    return null;
  }

  const { rect, name, tag } = hoverElement;
  const isLabelBelow = rect.top < 24;

  return (
    <div
      className="absolute pointer-events-none z-20 transition-none"
      style={{
        left: rect.left,
        top: rect.top,
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
        border: '1px solid #38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.06)',
        boxShadow: '0 0 0 1px rgba(56, 189, 248, 0.2)',
      }}
    >
      {/* Name Label Badge (R2.1 / R3.4: Auto-flip below when near top edge) */}
      <div
        className="absolute left-0 flex items-center gap-1 z-30 select-none whitespace-nowrap"
        style={{
          top: isLabelBelow ? rect.height + 2 : -22,
        }}
      >
        <span className="px-1.5 py-0.5 rounded bg-[#0284c7] text-white text-[10px] font-mono font-semibold shadow-md shadow-sky-950/50 leading-none">
          {name || tag}
        </span>
      </div>
    </div>
  );
}

export default memo(HoverOverlay);

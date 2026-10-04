import React, { memo } from 'react';
import { useSelector } from 'react-redux';

function SelectionOverlay({ screenId }) {
  const selectedElements = useSelector((state) => state.selection.selectedElements);
  const activeScreenId = useSelector((state) => state.selection.activeScreenId);
  const mode = useSelector((state) => state.board.mode);

  // R1.5 / R3.1: Selection outline is only visible in Select mode for the active screen
  if (mode !== 'select' || activeScreenId !== screenId || !selectedElements || selectedElements.length === 0) {
    return null;
  }

  return (
    <>
      {selectedElements.map((el) => {
        const { id, rect, name, tag } = el;
        if (!rect) return null;

        // Check if element is completely scrolled out of the 1280x800 preview bounds (R3.4)
        const isOutOfView =
          rect.top + rect.height < 0 ||
          rect.top > 800 ||
          rect.left + rect.width < 0 ||
          rect.left > 1280;

        if (isOutOfView) return null;

        const isLabelBelow = rect.top < 26;

        return (
          <div
            key={id}
            className="absolute pointer-events-none z-30 transition-none"
            style={{
              left: rect.left,
              top: rect.top,
              width: Math.max(2, rect.width),
              height: Math.max(2, rect.height),
              border: '2px solid #6366f1',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              boxShadow: '0 0 0 1px rgba(99, 102, 241, 0.3), 0 0 12px rgba(99, 102, 241, 0.25)',
            }}
          >
            {/* 2px Selection Label Badge (R3.1 / R3.4: Auto-flip below when near top edge) */}
            <div
              className="absolute left-0 flex items-center gap-1 z-40 select-none whitespace-nowrap"
              style={{
                top: isLabelBelow ? rect.height + 3 : -24,
              }}
            >
              <span className="px-1.5 py-0.5 rounded bg-[#4f46e5] text-white text-[10px] font-mono font-bold shadow-lg shadow-indigo-950/60 leading-none">
                {name || tag}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}

export default memo(SelectionOverlay);

import React, { memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleInspector } from '../../store/slices/boardSlice.js';
import { Sliders, PanelRightClose } from 'lucide-react';

function InspectorPanel() {
  const dispatch = useDispatch();
  const showInspector = useSelector((state) => state.board.showInspector);
  const selectedElements = useSelector((state) => state.selection.selectedElements);
  const isElementDeleted = useSelector((state) => state.selection.isElementDeleted);

  const count = selectedElements.length;

  return (
    <aside
      className={`relative border-l border-white/[0.08] bg-[#0d0f11]/75 backdrop-blur-2xl flex flex-col shrink-0 z-20 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] ${
        showInspector ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none pointer-events-none'
      }`}
    >
      <div className="p-3 border-b border-white/[0.08] flex items-center justify-between min-w-[320px]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => dispatch(toggleInspector())}
            title="Collapse Inspector Panel"
            className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            Inspector
          </span>
        </div>

        <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
          {count > 0 ? `${count} Selected` : 'Properties'}
        </span>
      </div>

      {/* Content / Empty State */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center text-xs text-zinc-500 space-y-2 min-w-[320px]">
        <div className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-500">
          <Sliders className="w-4 h-4" />
        </div>
        {isElementDeleted ? (
          <>
            <p className="text-amber-400 font-medium">This element no longer exists</p>
            <p className="text-[11px] text-zinc-500 max-w-[200px]">
              The element was removed by a dynamic page update.
            </p>
          </>
        ) : count === 0 ? (
          <>
            <p className="text-zinc-400 font-medium">No element selected</p>
            <p className="text-[11px] text-zinc-500 max-w-[200px]">
              Select any element inside a preview to inspect its live computed styles and API metadata.
            </p>
          </>
        ) : (
          <>
            <p className="text-zinc-200 font-medium">{count === 1 ? '1 element' : `${count} elements`}</p>
            <p className="text-[11px] text-zinc-400 max-w-[200px]">
              Ready for Phase 5 live style metrics inspection.
            </p>
          </>
        )}
      </div>
    </aside>
  );
}

export default memo(InspectorPanel);

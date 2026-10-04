import React, { memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleLayers } from '../../store/slices/boardSlice.js';
import { Layers, Search, PanelLeftClose } from 'lucide-react';

function LayersPanel() {
  const dispatch = useDispatch();
  const showLayers = useSelector((state) => state.board.showLayers);
  const activeScreenId = useSelector((state) => state.selection.activeScreenId);

  return (
    <aside
      className={`relative border-r border-white/[0.08] bg-[#0d0f11]/75 backdrop-blur-2xl flex flex-col shrink-0 z-20 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] ${
        showLayers ? 'w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none pointer-events-none'
      }`}
    >
      <div className="p-3 border-b border-white/[0.08] flex items-center justify-between min-w-[288px]">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          Layers
        </span>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">
            {activeScreenId ? `Active: ${activeScreenId}` : 'Active'}
          </span>

          <button
            type="button"
            onClick={() => dispatch(toggleLayers())}
            title="Collapse Layers Panel"
            className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search Bar Input */}
      <div className="p-3 border-b border-white/[0.06] min-w-[288px]">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search hierarchy..."
            className="w-full pl-8 pr-9 py-1.5 bg-[#16191c]/80 backdrop-blur-md border border-white/[0.08] rounded-lg text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono"
          />
          <kbd className="kbd-badge absolute right-2 pointer-events-none">⌘K</kbd>
        </div>
      </div>

      {/* Layer Tree Content / Empty State */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center text-xs text-zinc-500 space-y-2 min-w-[288px]">
        <div className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-zinc-500">
          <Layers className="w-4 h-4" />
        </div>
        <p className="text-zinc-400 font-medium">
          {activeScreenId ? 'Loading preview hierarchy...' : 'No preview selected'}
        </p>
        <p className="text-[11px] text-zinc-500 max-w-[180px]">
          {activeScreenId
            ? 'Fetching element nodes for this preview.'
            : 'Click inside any preview frame on the board to view its layer tree.'}
        </p>
      </div>
    </aside>
  );
}

export default memo(LayersPanel);

import React, { memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setMode,
  resetView,
  fitToScreen,
  resetScreenPositions,
  toggleLayers,
  toggleInspector,
} from '../../store/slices/boardSlice.js';
import {
  MousePointer2,
  Hand,
  Maximize2,
  LayoutGrid,
  RotateCcw,
  PanelLeft,
  PanelRight,
  Layers,
  Sliders,
} from 'lucide-react';
import DevFailureMenu from './DevFailureMenu.jsx';

// Zoom badge isolated so only this tiny text updates on zoom
const ZoomBadge = memo(function ZoomBadge() {
  const zoom = useSelector((state) => state.board.zoom);
  return (
    <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono bg-[#111315]/80 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/[0.08]">
      <span className="text-[10px] text-zinc-500">SCALE</span>
      <span className="font-semibold text-zinc-200">{Math.round(zoom * 100)}%</span>
    </div>
  );
});

// Mode switcher isolated so only this updates on mode change
const ModeSwitcher = memo(function ModeSwitcher() {
  const dispatch = useDispatch();
  const mode = useSelector((state) => state.board.mode);

  return (
    <div className="flex items-center bg-[#111315]/80 backdrop-blur-md p-1 rounded-xl border border-white/[0.08] shadow-inner">
      <button
        type="button"
        onClick={() => dispatch(setMode('select'))}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
          mode === 'select'
            ? 'bg-[#1c2024] text-[#ffffff] shadow-sm ring-1 ring-white/[0.12] border border-white/[0.05]'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
        }`}
      >
        <MousePointer2 className="w-3.5 h-3.5 text-indigo-400" />
        <span>Select</span>
        <kbd className="kbd-badge ml-1">V</kbd>
      </button>

      <button
        type="button"
        onClick={() => dispatch(setMode('interact'))}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
          mode === 'interact'
            ? 'bg-[#1c2024] text-[#ffffff] shadow-sm ring-1 ring-white/[0.12] border border-white/[0.05]'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
        }`}
      >
        <Hand className="w-3.5 h-3.5 text-emerald-400" />
        <span>Interact</span>
        <kbd className="kbd-badge ml-1">I</kbd>
      </button>
    </div>
  );
});

function TopNavbar() {
  const dispatch = useDispatch();
  const screenCount = useSelector((state) => state.board.screens.length);
  const showLayers = useSelector((state) => state.board.showLayers);
  const showInspector = useSelector((state) => state.board.showInspector);

  return (
    <header className="h-13 px-4 surface-topbar flex items-center justify-between z-30 shrink-0 border-b border-white/[0.08]">
      {/* Left: Brand Identity & Active Status & Layers Toggle */}
      <div className="flex items-center gap-3">
        {/* Toggle Layers Sidebar Button */}
        <button
          type="button"
          onClick={() => dispatch(toggleLayers())}
          title={showLayers ? 'Hide Layers (Left Sidebar)' : 'Show Layers (Left Sidebar)'}
          className={`p-1.5 rounded-lg border transition-all duration-150 ${
            showLayers
              ? 'bg-[#1c2024] border-white/[0.14] text-indigo-400 shadow-sm'
              : 'bg-[#121417]/70 border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
          }`}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 ring-1 ring-white/20">
            <span className="font-extrabold text-[13px] text-white tracking-tighter">F</span>
          </div>
          <span className="font-bold text-[13px] tracking-tight text-[#f4f4f5]">
            Figr Studio
          </span>
        </div>

        <div className="h-4 w-px bg-white/[0.08]" />

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#16191c]/80 backdrop-blur-md border border-white/[0.08] text-[11px] text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot" />
          <span className="font-medium text-zinc-300">{screenCount || 24} Previews</span>
        </div>
      </div>

      {/* Center: Precision Segmented Mode Switcher */}
      <ModeSwitcher />

      {/* Right: Zoom Level Readout, Reset Canvas Action, & Inspector Toggle */}
      <div className="flex items-center gap-2">
        <ZoomBadge />

        <button
          type="button"
          onClick={() => dispatch(fitToScreen())}
          title="Fit All Screens in Overview (35%)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#16191c]/80 backdrop-blur-md hover:bg-[#1c2024] text-zinc-300 hover:text-white border border-white/[0.08] transition-all shadow-sm active:scale-[0.98]"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
          <span>Fit Grid</span>
        </button>

        <button
          type="button"
          onClick={() => dispatch(resetView())}
          title="Actual Size (100% 1:1 Scale)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#16191c]/80 backdrop-blur-md hover:bg-[#1c2024] text-zinc-300 hover:text-white border border-white/[0.08] transition-all shadow-sm active:scale-[0.98]"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>100%</span>
        </button>

        <button
          type="button"
          onClick={() => dispatch(resetScreenPositions())}
          title="Reset Screen Layout to Grid"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#16191c]/80 backdrop-blur-md hover:bg-[#1c2024] text-zinc-300 hover:text-white border border-white/[0.08] transition-all shadow-sm active:scale-[0.98]"
        >
          <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
          <span>Reset Layout</span>
        </button>

        <div className="h-4 w-px bg-white/[0.08]" />

        {/* Dev Failure Trigger Menu (R6.7) */}
        <DevFailureMenu />

        {/* Toggle Inspector Sidebar Button */}
        <button
          type="button"
          onClick={() => dispatch(toggleInspector())}
          title={showInspector ? 'Hide Inspector (Right Sidebar)' : 'Show Inspector (Right Sidebar)'}
          className={`p-1.5 rounded-lg border transition-all duration-150 ${
            showInspector
              ? 'bg-[#1c2024] border-white/[0.14] text-indigo-400 shadow-sm'
              : 'bg-[#121417]/70 border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
          }`}
        >
          <PanelRight className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

export default memo(TopNavbar);


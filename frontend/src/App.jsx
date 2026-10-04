import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  setMode,
  resetView,
  fetchScreens,
} from './store/slices/boardSlice.js';
import { hostProtocol } from './ipc/hostProtocol.js';
import { IPC_MESSAGES } from './ipc/messageTypes.js';
import {
  MousePointer2,
  Hand,
  Maximize2,
  Layers,
  Sliders,
  Search,
  RefreshCw,
  AlertCircle,
  Radio,
  Terminal,
} from 'lucide-react';

export default function App() {
  const dispatch = useDispatch();
  const { mode, zoom, screens, screensStatus, screensError } = useSelector(
    (state) => state.board
  );

  // Sync mode changes to all connected preview iframes
  useEffect(() => {
    hostProtocol.broadcast(IPC_MESSAGES.SET_MODE, { mode });
  }, [mode]);

  // Initial load of screens from API
  useEffect(() => {
    dispatch(fetchScreens());
  }, [dispatch]);

  // Global Keyboard shortcuts: V for Select, I for Interact
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'v' || e.key === 'V') {
        dispatch(setMode('select'));
      } else if (e.key === 'i' || e.key === 'I') {
        dispatch(setMode('interact'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0b0d0e] text-[#ededed] font-sans select-none antialiased">
      {/* Top Application Navbar */}
      <header className="h-13 px-4 surface-topbar flex items-center justify-between z-30 shrink-0 border-b border-white/[0.08]">
        {/* Left: Brand Identity & Active Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 ring-1 ring-white/20">
              <span className="font-extrabold text-[13px] text-white tracking-tighter">F</span>
            </div>
            <span className="font-bold text-[13px] tracking-tight text-[#f4f4f5]">
              Figr Studio
            </span>
          </div>

          <div className="h-4 w-px bg-white/[0.08]" />

          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#16191c] border border-white/[0.08] text-[11px] text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot" />
            <span className="font-medium text-zinc-300">24 Previews</span>
          </div>
        </div>

        {/* Center: Precision Segmented Mode Switcher */}
        <div className="flex items-center bg-[#111315] p-1 rounded-xl border border-white/[0.08] shadow-inner">
          <button
            type="button"
            onClick={() => dispatch(setMode('select'))}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              mode === 'select'
                ? 'bg-[#1c2024] text-[#ffffff] shadow-sm ring-1 ring-white/[0.12] border border-white/[0.05]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]'
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
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]'
            }`}
          >
            <Hand className="w-3.5 h-3.5 text-emerald-400" />
            <span>Interact</span>
            <kbd className="kbd-badge ml-1">I</kbd>
          </button>
        </div>

        {/* Right: Zoom Level Readout & Reset Canvas Action */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono bg-[#111315] px-2.5 py-1.5 rounded-lg border border-white/[0.08]">
            <span className="text-[10px] text-zinc-500">SCALE</span>
            <span className="font-semibold text-zinc-200">{Math.round(zoom * 100)}%</span>
          </div>

          <button
            type="button"
            onClick={() => dispatch(resetView())}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#16191c] hover:bg-[#1c2024] text-zinc-300 hover:text-white border border-white/[0.08] transition-all shadow-sm active:scale-[0.98]"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Reset View</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Layers Panel Sidebar */}
        <aside className="w-72 border-r border-white/[0.08] bg-[#111315]/90 backdrop-blur-xl flex flex-col shrink-0 z-20">
          <div className="p-3 border-b border-white/[0.08] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Layers
            </span>
            <span className="text-[10px] font-mono text-zinc-500 bg-[#16191c] px-1.5 py-0.5 rounded border border-white/[0.05]">
              Active
            </span>
          </div>

          {/* Search Bar Input */}
          <div className="p-3 border-b border-white/[0.06]">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search hierarchy..."
                className="w-full pl-8 pr-9 py-1.5 bg-[#16191c] border border-white/[0.08] rounded-lg text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono"
              />
              <kbd className="kbd-badge absolute right-2 pointer-events-none">⌘K</kbd>
            </div>
          </div>

          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center text-xs text-zinc-500 space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#16191c] border border-white/[0.06] flex items-center justify-center text-zinc-500">
              <Layers className="w-4 h-4" />
            </div>
            <p className="text-zinc-400 font-medium">No preview selected</p>
            <p className="text-[11px] text-zinc-500 max-w-[180px]">
              Click inside any preview frame on the board to view its layer tree.
            </p>
          </div>
        </aside>

        {/* Center: Infinite Canvas Viewport */}
        <main className="flex-1 relative overflow-hidden bg-fanout-grid flex items-center justify-center">
          {screensStatus === 'loading' && (
            <div className="flex items-center gap-2.5 text-xs text-zinc-300 bg-[#16191c]/90 border border-white/[0.1] px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Connecting to mock backend (:4000)...</span>
            </div>
          )}

          {screensStatus === 'failed' && (
            <div className="flex flex-col items-center gap-2.5 text-xs text-rose-300 bg-rose-950/20 border border-rose-500/30 p-5 rounded-2xl shadow-2xl backdrop-blur-md max-w-md text-center">
              <AlertCircle className="w-5 h-5 text-rose-400" />
              <div className="font-semibold text-rose-200">Failed to connect to API</div>
              <p className="text-rose-400/80 text-[11px]">{screensError}</p>
              <button
                type="button"
                onClick={() => dispatch(fetchScreens())}
                className="mt-2 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg text-xs transition-all shadow-md active:scale-[0.98]"
              >
                Retry Connection
              </button>
            </div>
          )}

          {screensStatus === 'succeeded' && (
            <div className="surface-card p-6 rounded-2xl text-center text-xs text-zinc-400 space-y-3 max-w-sm border border-white/[0.08]">
              <div className="w-8 h-8 mx-auto rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                ✓
              </div>
              <div className="text-sm font-bold text-zinc-100">
                Phase 0 Setup Ready
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Loaded {screens.length} screens from API (:4000). Probe SDK injected into preview pages (:4001). Ready for Phase 1.
              </p>
            </div>
          )}

          {/* Floating Canvas HUD (Bottom Left) */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-[#111315]/90 border border-white/[0.08] px-3 py-1.5 rounded-xl shadow-2xl backdrop-blur-md text-[11px] font-mono text-zinc-400">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <Radio className="w-3 h-3 text-indigo-400 animate-pulse" />
              <span>Canvas 2D</span>
            </span>
            <span className="text-zinc-600">|</span>
            <span>Zoom: {Math.round(zoom * 100)}%</span>
            <span className="text-zinc-600">|</span>
            <span className="text-emerald-400">Probe Active</span>
          </div>
        </main>

        {/* Right: Inspector Sidebar */}
        <aside className="w-80 border-l border-white/[0.08] bg-[#111315]/90 backdrop-blur-xl flex flex-col shrink-0 z-20">
          <div className="p-3 border-b border-white/[0.08] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              Inspector
            </span>
            <span className="text-[10px] font-mono text-zinc-500 bg-[#16191c] px-1.5 py-0.5 rounded border border-white/[0.05]">
              Properties
            </span>
          </div>

          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center text-xs text-zinc-500 space-y-2">
            <div className="w-8 h-8 rounded-full bg-[#16191c] border border-white/[0.06] flex items-center justify-center text-zinc-500">
              <Sliders className="w-4 h-4" />
            </div>
            <p className="text-zinc-400 font-medium">No element selected</p>
            <p className="text-[11px] text-zinc-500 max-w-[200px]">
              Select any element inside a preview to inspect its live computed styles and API metadata.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

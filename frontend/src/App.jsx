import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setMode, fetchScreens } from './store/slices/boardSlice.js';
import { hostProtocol } from './ipc/hostProtocol.js';
import { IPC_MESSAGES } from './ipc/messageTypes.js';
import BoardCanvas from './canvas/BoardCanvas.jsx';
import TopNavbar from './components/layout/TopNavbar.jsx';
import LayersPanel from './components/layers/LayersPanel.jsx';
import InspectorPanel from './components/inspector/InspectorPanel.jsx';
import CanvasHUD from './components/canvas/CanvasHUD.jsx';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function App() {
  const dispatch = useDispatch();

  // Granular subscription: App only cares if screens status/error changes, NOT on pan/zoom
  const screensStatus = useSelector((state) => state.board.screensStatus);
  const screensError = useSelector((state) => state.board.screensError);
  const mode = useSelector((state) => state.board.mode);

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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#08090a] text-[#ededed] font-sans select-none antialiased">
      {/* Top Application Navbar (Memoized) */}
      <TopNavbar />

      {/* Main Workspace 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Layers Panel Sidebar (Memoized) */}
        <LayersPanel />

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

          {screensStatus === 'succeeded' && <BoardCanvas />}

          {/* Floating Canvas HUD (Bottom Left) */}
          <CanvasHUD />
        </main>

        {/* Right: Inspector Sidebar (Memoized) */}
        <InspectorPanel />
      </div>
    </div>
  );
}

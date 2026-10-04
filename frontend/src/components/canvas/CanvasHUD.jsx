import React, { memo } from 'react';
import { useSelector } from 'react-redux';
import { Radio } from 'lucide-react';

function CanvasHUD() {
  const zoom = useSelector((state) => state.board.zoom);
  const mode = useSelector((state) => state.board.mode);

  return (
    <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-[#111315]/90 border border-white/[0.08] px-3 py-1.5 rounded-xl shadow-2xl backdrop-blur-md text-[11px] font-mono text-zinc-400 z-10 pointer-events-none">
      <span className="flex items-center gap-1.5 text-zinc-300">
        <Radio className="w-3 h-3 text-indigo-400 animate-pulse" />
        <span className="capitalize">{mode} Mode</span>
      </span>
      <span className="text-zinc-600">|</span>
      <span>Zoom: {Math.round(zoom * 100)}%</span>
      <span className="text-zinc-600">|</span>
      <span className="text-emerald-400">Probe Active</span>
    </div>
  );
}

export default memo(CanvasHUD);

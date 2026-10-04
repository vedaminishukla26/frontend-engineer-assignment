import React, { useState, useRef, useEffect, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  recordRegionalError,
  clearRegionalError,
  addPageRuntimeError,
  setDevSimulatedFailure,
} from '../../store/slices/errorSlice.js';
import {
  Bug,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Layers,
  Monitor,
  CheckCircle2,
  FileCode,
  XCircle,
} from 'lucide-react';

function DevFailureMenu() {
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const activeScreenId = useSelector((state) => state.selection.activeScreenId) || 'scr-1';
  const regionErrors = useSelector((state) => state.error.regionErrors);
  const reportedKeysCount = useSelector((state) => state.error.reportedErrorKeys.length);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const triggerBoardError = () => {
    dispatch(
      recordRegionalError({
        region: 'board',
        error: 'GET /screens failed: 500 Internal Server Error',
      })
    );
  };

  const triggerPreviewTimeout = () => {
    dispatch(
      recordRegionalError({
        region: 'preview',
        screenId: activeScreenId,
        error: "Couldn't connect to this preview",
      })
    );
  };

  const triggerPageScriptError = () => {
    dispatch(
      addPageRuntimeError({
        screenId: activeScreenId,
        message: 'Uncaught TypeError: Cannot read properties of undefined (reading "items")',
        filename: 'app.js',
        lineno: 42,
      })
    );
  };

  const triggerLayersRowError = () => {
    dispatch(
      recordRegionalError({
        region: 'layers-row',
        screenId: activeScreenId,
        rowId: `${activeScreenId}:body > div.wrap`,
        error: 'Couldn\'t load',
      })
    );
  };

  const triggerDetailsError = () => {
    dispatch(
      recordRegionalError({
        region: 'details',
        screenId: activeScreenId,
        elementKey: 'cta-primary',
        error: 'GET /elements/cta-primary failed (500 Server Error)',
      })
    );
  };

  const triggerInspectorError = () => {
    dispatch(
      recordRegionalError({
        region: 'inspector',
        error: 'Render error in Inspector panel component',
      })
    );
  };

  const handleResetAll = () => {
    dispatch(clearRegionalError({ region: 'board' }));
    dispatch(clearRegionalError({ region: 'preview', screenId: activeScreenId }));
    dispatch(clearRegionalError({ region: 'layers' }));
    dispatch(clearRegionalError({ region: 'inspector' }));
    dispatch(clearRegionalError({ region: 'details' }));
    dispatch(clearRegionalError({ region: 'layers-row', rowId: `${activeScreenId}:body > div.wrap` }));
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Dev Failure Menu (R6.7 - Trigger failures for Loom video)"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${
          isOpen || reportedKeysCount > 0
            ? 'bg-rose-950/50 text-rose-300 border-rose-500/40 shadow-sm'
            : 'bg-[#16191c]/80 backdrop-blur-md text-zinc-300 hover:text-white border-white/[0.08] hover:bg-[#1c2024]'
        }`}
      >
        <Bug className="w-3.5 h-3.5 text-rose-400" />
        <span>Dev Failures</span>
        {reportedKeysCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-rose-500 text-white">
            {reportedKeysCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-[#121418] border border-white/[0.12] rounded-xl shadow-2xl z-50 p-2 text-xs space-y-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-white/[0.08] flex items-center justify-between">
            <span className="font-bold text-zinc-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Dev Failure Triggers (R6.7)
            </span>
            <span className="text-[9px] font-mono text-zinc-500">
              Active: {activeScreenId}
            </span>
          </div>

          <div className="py-1 space-y-0.5">
            <button
              type="button"
              onClick={triggerBoardError}
              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-950/40 text-zinc-300 hover:text-rose-200 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                <span>Board (`GET /screens`) Fail</span>
              </div>
              <span className="text-[9px] font-mono text-zinc-500">R6.2</span>
            </button>

            <button
              type="button"
              onClick={triggerPreviewTimeout}
              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-950/40 text-zinc-300 hover:text-rose-200 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Preview 10s Timeout ({activeScreenId})</span>
              </div>
              <span className="text-[9px] font-mono text-zinc-500">R6.2</span>
            </button>

            <button
              type="button"
              onClick={triggerPageScriptError}
              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-950/40 text-zinc-300 hover:text-rose-200 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileCode className="w-3.5 h-3.5 text-rose-400" />
                <span>Page Script Error Badge ({activeScreenId})</span>
              </div>
              <span className="text-[9px] font-mono text-zinc-500">R6.3</span>
            </button>

            <button
              type="button"
              onClick={triggerLayersRowError}
              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-950/40 text-zinc-300 hover:text-rose-200 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Layers Row 3s Timeout</span>
              </div>
              <span className="text-[9px] font-mono text-zinc-500">R6.2</span>
            </button>

            <button
              type="button"
              onClick={triggerDetailsError}
              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-950/40 text-zinc-300 hover:text-rose-200 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Details API (`GET /elements`) Fail</span>
              </div>
              <span className="text-[9px] font-mono text-zinc-500">R6.2</span>
            </button>

            <button
              type="button"
              onClick={triggerInspectorError}
              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-rose-950/40 text-zinc-300 hover:text-rose-200 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Inspector Render Crash</span>
              </div>
              <span className="text-[9px] font-mono text-zinc-500">R6.2</span>
            </button>
          </div>

          <div className="pt-2 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={handleResetAll}
              className="w-full py-1.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3 h-3 text-emerald-400" />
              <span>Reset All Failures</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(DevFailureMenu);

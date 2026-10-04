import React, { useEffect, useRef, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleInspector } from '../../store/slices/boardSlice.js';
import { fetchElementDetails, setCurrentKey } from '../../store/slices/inspectorSlice.js';
import {
  Sliders,
  PanelRightClose,
  Box,
  Tag,
  Maximize2,
  Move,
  Type,
  Palette,
  Info,
  FileQuestion,
  AlertCircle,
  RefreshCw,
  Loader2,
  UserCheck,
  ShieldCheck,
  Layers3,
  AlignLeft,
} from 'lucide-react';

// --- Multi-Element Aggregation Helper (R5.2) ---
function getAggregatedValue(elements, getValueFn) {
  if (!elements || elements.length === 0) return null;
  const first = getValueFn(elements[0]);
  const allMatch = elements.every((el) => getValueFn(el) === first);
  return allMatch ? first : 'Mixed';
}

// --- Helper component to display a property row with Mixed badge support ---
function PropertyRow({ label, value, isCode = false, isColor = false, isMultiline = false }) {
  const isMixed = value === 'Mixed';

  return (
    <div className="flex flex-col py-1.5 border-b border-white/[0.04] last:border-none">
      <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mb-0.5">
        {label}
      </span>
      {isMixed ? (
        <span className="w-fit text-[10px] font-mono italic text-amber-300 bg-amber-950/40 border border-amber-500/20 px-1.5 py-0.5 rounded">
          Mixed
        </span>
      ) : isColor && value && value !== '—' ? (
        <div className="flex items-center gap-2 mt-0.5">
          <div
            className="w-3.5 h-3.5 rounded border border-white/20 shrink-0 shadow-sm"
            style={{ backgroundColor: value }}
            title={value}
          />
          <span className="font-mono text-xs text-zinc-200 truncate">{value}</span>
        </div>
      ) : isCode ? (
        <span className="font-mono text-xs text-indigo-300 bg-indigo-950/30 border border-indigo-500/20 px-1.5 py-0.5 rounded w-fit max-w-full truncate">
          {value || '—'}
        </span>
      ) : isMultiline ? (
        <p className="text-xs text-zinc-300 line-clamp-3 bg-[#14161a] p-2 rounded border border-white/[0.06] font-sans mt-0.5 leading-relaxed">
          {value || '—'}
        </p>
      ) : (
        <span className="text-xs text-zinc-200 truncate font-mono">{value || '—'}</span>
      )}
    </div>
  );
}

// --- Component Status Badge ---
function StatusBadge({ status }) {
  if (!status) return null;
  const s = status.toLowerCase();
  let colorClasses = 'bg-zinc-800 text-zinc-400 border-zinc-700';
  if (s === 'stable') {
    colorClasses = 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30';
  } else if (s === 'beta') {
    colorClasses = 'bg-amber-950/50 text-amber-300 border-amber-500/30';
  } else if (s === 'deprecated') {
    colorClasses = 'bg-rose-950/50 text-rose-300 border-rose-500/30';
  }

  return (
    <span
      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${colorClasses}`}
    >
      {status}
    </span>
  );
}

import RegionErrorBoundary from '../common/RegionErrorBoundary.jsx';
import { recordRegionalError, clearRegionalError } from '../../store/slices/errorSlice.js';

function InspectorPanelContent() {
  const dispatch = useDispatch();
  const currentPromiseRef = useRef(null);

  const showInspector = useSelector((state) => state.board.showInspector);
  const selectedElements = useSelector((state) => state.selection.selectedElements);
  const isElementDeleted = useSelector((state) => state.selection.isElementDeleted);

  const inspectorError = useSelector((state) => state.error.regionErrors.inspector);
  const detailsRegionError = useSelector((state) => state.error.regionErrors.details);

  const detailsByKey = useSelector((state) => state.inspector.detailsByKey);
  const detailsStatus = useSelector((state) => state.inspector.detailsStatus);
  const detailsError = useSelector((state) => state.inspector.detailsError);

  const count = selectedElements.length;
  const singleElement = count === 1 ? selectedElements[0] : null;
  const elementKey = singleElement?.key || null;

  // --- Fetch API details on selection change with Cancellation control (R5.1, R5.3) ---
  useEffect(() => {
    if (count === 1 && elementKey) {
      if (currentPromiseRef.current) {
        currentPromiseRef.current.abort();
      }
      const promise = dispatch(fetchElementDetails({ key: elementKey }));
      currentPromiseRef.current = promise;
    } else {
      dispatch(setCurrentKey(null));
    }

    return () => {
      if (currentPromiseRef.current) {
        currentPromiseRef.current.abort();
      }
    };
  }, [count, elementKey, dispatch]);

  const handleRetryDetails = () => {
    dispatch(clearRegionalError({ region: 'details' }));
    if (elementKey) {
      dispatch(fetchElementDetails({ key: elementKey }));
    }
  };

  // --- Multi-Element Aggregated Live Values (R5.2) ---
  const tagVal = getAggregatedValue(selectedElements, (el) => el.tag || '—');
  const nameVal = getAggregatedValue(selectedElements, (el) => el.name || '—');
  const idVal = getAggregatedValue(selectedElements, (el) => el.elementId || el.id || '—');
  const classVal = getAggregatedValue(selectedElements, (el) => el.className || '—');
  const widthVal = getAggregatedValue(selectedElements, (el) =>
    el.rect ? `${Math.round(el.rect.width)}px` : '—'
  );
  const heightVal = getAggregatedValue(selectedElements, (el) =>
    el.rect ? `${Math.round(el.rect.height)}px` : '—'
  );
  const posVal = getAggregatedValue(selectedElements, (el) =>
    el.rect ? `X: ${Math.round(el.rect.left)}px, Y: ${Math.round(el.rect.top)}px` : '—'
  );
  const textVal = getAggregatedValue(selectedElements, (el) =>
    el.text ? el.text.slice(0, 120) : '—'
  );

  const colorVal = getAggregatedValue(
    selectedElements,
    (el) => el.computedStyles?.color || '—'
  );
  const bgColorVal = getAggregatedValue(
    selectedElements,
    (el) => el.computedStyles?.backgroundColor || '—'
  );
  const fontFamilyVal = getAggregatedValue(
    selectedElements,
    (el) => el.computedStyles?.fontFamily || '—'
  );
  const fontSizeVal = getAggregatedValue(
    selectedElements,
    (el) => el.computedStyles?.fontSize || '—'
  );
  const fontWeightVal = getAggregatedValue(
    selectedElements,
    (el) => el.computedStyles?.fontWeight || '—'
  );

  const cachedDetails = elementKey ? detailsByKey[elementKey] : null;
  const activeDetailsError = detailsRegionError || detailsError;

  return (
    <aside
      className={`relative border-l border-white/[0.08] bg-[#0c0d10] flex flex-col shrink-0 z-20 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        showInspector ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none pointer-events-none'
      }`}
    >
      {/* Header Bar */}
      <div className="p-3 border-b border-white/[0.08] flex items-center justify-between min-w-[320px] bg-[#0f1115]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => dispatch(toggleInspector())}
            title="Collapse Inspector Panel"
            className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            Inspector
          </span>
        </div>

        <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.08]">
          {count > 1 ? `${count} Selected` : count === 1 ? '1 Selected' : 'Properties'}
        </span>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-w-[320px] bg-[#0c0d10] scrollbar-thin">
        {inspectorError ? (
          <div className="p-6 flex flex-col items-center justify-center text-center text-xs space-y-3 h-full">
            <div className="w-10 h-10 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-rose-200 uppercase tracking-wider">
                Inspector Error
              </p>
              <p className="text-[11px] text-rose-400/90">{inspectorError}</p>
            </div>
            <button
              type="button"
              onClick={() => dispatch(clearRegionalError({ region: 'inspector' }))}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Inspector</span>
            </button>
          </div>
        ) : isElementDeleted ? (
          <div className="p-6 flex flex-col items-center justify-center text-center text-xs space-y-2 h-full">
            <div className="w-9 h-9 rounded-xl bg-amber-950/30 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-amber-300 font-medium">This element no longer exists</p>
            <p className="text-[11px] text-zinc-500 max-w-[220px]">
              The element was removed from the DOM by a dynamic page re-render.
            </p>
          </div>
        ) : count === 0 ? (
          <div className="p-6 flex flex-col items-center justify-center text-center text-xs text-zinc-500 space-y-2 h-full">
            <div className="w-9 h-9 rounded-xl bg-[#14161a] border border-white/[0.06] flex items-center justify-center text-zinc-400">
              <Sliders className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-zinc-300 font-medium">No element selected</p>
            <p className="text-[11px] text-zinc-500 max-w-[220px]">
              Click any element inside a preview or layer tree to inspect live styles and API metadata.
            </p>
          </div>
        ) : (
          <>
            {/* Header Badge Summary */}
            <div className="p-3 bg-[#14161a] border border-white/[0.06] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                {count === 1 ? (
                  <Tag className="w-4 h-4 text-indigo-400 shrink-0" />
                ) : (
                  <Layers3 className="w-4 h-4 text-indigo-400 shrink-0" />
                )}
                <span className="font-mono text-xs font-semibold text-zinc-100 truncate">
                  {count === 1 ? singleElement?.name || singleElement?.tag : `${count} Elements`}
                </span>
              </div>
              {count === 1 && elementKey && (
                <span className="text-[9px] font-mono text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 px-1.5 py-0.5 rounded shrink-0">
                  key: {elementKey}
                </span>
              )}
            </div>

            {/* LIVE SECTION (R5.1 & R5.2) */}
            <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                  Live Properties
                </span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Page DOM</span>
              </div>

              {/* DOM Identity */}
              <div className="space-y-0.5">
                <PropertyRow label="Tag Name" value={tagVal} isCode />
                <PropertyRow label="Element Name" value={nameVal} />
                <PropertyRow label="DOM ID" value={idVal} />
                <PropertyRow label="Class Names" value={classVal} />
              </div>

              {/* Geometry */}
              <div className="pt-2 border-t border-white/[0.04] space-y-0.5">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Move className="w-3 h-3 text-indigo-400" /> Geometry
                </span>
                <PropertyRow label="Dimensions (W × H)" value={widthVal !== 'Mixed' && heightVal !== 'Mixed' ? `${widthVal} × ${heightVal}` : 'Mixed'} />
                <PropertyRow label="Position" value={posVal} />
              </div>

              {/* Text Sample */}
              <div className="pt-2 border-t border-white/[0.04]">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <AlignLeft className="w-3 h-3 text-indigo-400" /> Text Preview
                </span>
                <PropertyRow label="Content (First 120 chars)" value={textVal} isMultiline />
              </div>

              {/* Computed Styles */}
              <div className="pt-2 border-t border-white/[0.04] space-y-0.5">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Palette className="w-3 h-3 text-indigo-400" /> Computed Styles
                </span>
                <PropertyRow label="Text Color" value={colorVal} isColor />
                <PropertyRow label="Background Color" value={bgColorVal} isColor />
                <PropertyRow label="Font Family" value={fontFamilyVal} />
                <PropertyRow label="Font Size" value={fontSizeVal} />
                <PropertyRow label="Font Weight" value={fontWeightVal} />
              </div>
            </div>

            {/* DETAILS SECTION (R5.1 & R6.2 - Only for single selection) */}
            {count === 1 && (
              <RegionErrorBoundary
                region="details"
                regionName="Element Details"
                onError={(err) =>
                  dispatch(
                    recordRegionalError({
                      region: 'details',
                      elementKey,
                      error: err?.message || 'Details render error',
                    })
                  )
                }
                onRetry={() => dispatch(clearRegionalError({ region: 'details' }))}
              >
                <div className="bg-[#111318] border border-white/[0.06] rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                    <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5 text-indigo-400" />
                      Element Details
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">GET /elements/:key</span>
                  </div>

                  {!elementKey ? (
                    <div className="p-3 bg-[#14161a] border border-white/[0.06] rounded-lg text-xs text-zinc-400 space-y-1">
                      <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                        <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>No details</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-normal">
                        This element does not carry a <code className="text-zinc-300 bg-white/[0.06] px-1 py-0.5 rounded font-mono">data-key</code> attribute.
                      </p>
                    </div>
                  ) : detailsStatus === 'loading' && !cachedDetails ? (
                    <div className="p-4 bg-[#14161a] border border-white/[0.06] rounded-lg text-xs text-zinc-400 flex items-center gap-2.5">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-400 shrink-0" />
                      <span>Fetching metadata for key <code className="font-mono text-indigo-300">{elementKey}</code>...</span>
                    </div>
                  ) : detailsStatus === 'notFound' ? (
                    <div className="p-3 bg-[#14161a] border border-white/[0.06] rounded-lg text-xs text-zinc-400 space-y-1">
                      <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                        <FileQuestion className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>No details for this element</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-normal">
                        No API record was found for key <code className="text-amber-300 font-mono">{elementKey}</code> (HTTP 404).
                      </p>
                    </div>
                  ) : activeDetailsError ? (
                    <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-lg text-xs text-rose-300 space-y-2">
                      <div className="flex items-center gap-1.5 text-rose-200 font-medium">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Failed to load details</span>
                      </div>
                      <p className="text-[11px] text-rose-400/80">{activeDetailsError}</p>
                      <button
                        type="button"
                        onClick={handleRetryDetails}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Retry Details</span>
                      </button>
                    </div>
                  ) : cachedDetails || detailsStatus === 'succeeded' ? (
                    <div className="space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Component</span>
                        <span className="font-mono text-xs text-indigo-300 font-semibold bg-indigo-950/40 border border-indigo-500/20 px-2 py-0.5 rounded">
                          {cachedDetails?.component || '—'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Status</span>
                        <StatusBadge status={cachedDetails?.status} />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Owner</span>
                        <span className="text-xs text-zinc-200 flex items-center gap-1 font-mono">
                          <UserCheck className="w-3 h-3 text-zinc-400" />
                          {cachedDetails?.owner || '—'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-white/[0.04]">
                        <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                          Description
                        </span>
                        <p className="text-xs text-zinc-300 bg-[#14161a] p-2.5 rounded-lg border border-white/[0.06] leading-relaxed font-sans">
                          {cachedDetails?.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </RegionErrorBoundary>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function InspectorPanel() {
  const dispatch = useDispatch();
  return (
    <RegionErrorBoundary
      region="inspector"
      regionName="Inspector Panel"
      onError={(err) =>
        dispatch(
          recordRegionalError({
            region: 'inspector',
            error: err?.message || 'Inspector render error',
          })
        )
      }
      onRetry={() => dispatch(clearRegionalError({ region: 'inspector' }))}
    >
      <InspectorPanelContent />
    </RegionErrorBoundary>
  );
}

export default memo(InspectorPanel);

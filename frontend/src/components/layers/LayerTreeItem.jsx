import React, { memo } from 'react';
import { ChevronRight, ChevronDown, Loader2, RefreshCw, Box, Code } from 'lucide-react';

function LayerTreeItem({
  node,
  depth = 0,
  screenId,
  isExpanded,
  isSelected,
  isHovered,
  isLoading,
  error,
  searchQuery,
  childNodes,
  onToggle,
  onSelect,
  onHover,
  onUnhover,
  onRetry,
  renderChildren,
}) {
  const { id, name, tag, path, key, hasChildren } = node;

  const handleToggle = (e) => {
    e.stopPropagation();
    onToggle(node);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    onSelect(node);
  };

  const handleMouseEnter = () => {
    onHover(node);
  };

  const handleMouseLeave = () => {
    onUnhover();
  };

  const handleRetryClick = (e) => {
    e.stopPropagation();
    onRetry(node);
  };

  // Helper to highlight matching search text
  const renderHighlightedName = (text, query) => {
    if (!query || !text) return text;
    const q = query.toLowerCase();
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;

    return (
      <>
        {text.slice(0, idx)}
        <span className="bg-amber-500/30 text-amber-200 font-semibold px-0.5 rounded">
          {text.slice(idx, idx + query.length)}
        </span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div className="flex flex-col select-none text-xs min-w-full">
      {/* Row Bar */}
      <div
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`group flex items-center h-7 px-2 cursor-pointer transition-colors duration-150 border-b border-transparent min-w-full w-max pr-6 whitespace-nowrap ${
          isSelected
            ? 'bg-indigo-600/25 text-indigo-200 font-medium border-indigo-500/30'
            : isHovered
            ? 'bg-white/[0.06] text-zinc-100'
            : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
        }`}
        style={{
          paddingLeft: `${Math.max(8, depth * 14 + 8)}px`,
        }}
      >
        {/* Expand / Collapse Chevron */}
        <div className="w-4 h-4 flex items-center justify-center shrink-0 mr-1">
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
          ) : hasChildren ? (
            <button
              type="button"
              onClick={handleToggle}
              className="p-0.5 rounded hover:bg-white/[0.1] text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-zinc-400" />
              )}
            </button>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700/60" />
          )}
        </div>

        {/* Tag Pill */}
        <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/[0.05] border border-white/[0.08] text-zinc-400 group-hover:text-zinc-300 mr-1.5 shrink-0">
          {tag || 'el'}
        </span>

        {/* Element Name */}
        <span className="font-mono text-[11px] whitespace-nowrap mr-2">
          {renderHighlightedName(name || tag, searchQuery)}
        </span>

        {/* Key Badge if present */}
        {key && (
          <span className="text-[9px] font-mono text-indigo-400/80 bg-indigo-950/40 border border-indigo-500/20 px-1 rounded ml-1 shrink-0">
            key
          </span>
        )}
      </div>

      {/* Inline Row Error & Isolated Retry Button (R4.2) */}
      {error && (
        <div
          className="flex items-center justify-between py-1 px-3 bg-rose-950/30 border-l-2 border-rose-500 text-rose-300 text-[10px] my-0.5"
          style={{ paddingLeft: `${depth * 14 + 20}px` }}
        >
          <span className="truncate">{error}</span>
          <button
            type="button"
            onClick={handleRetryClick}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-900/50 hover:bg-rose-800/60 border border-rose-500/30 text-rose-200 text-[10px] transition-colors shrink-0"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Recursive Children Container */}
      {isExpanded && childNodes && childNodes.length > 0 && (
        <div className="flex flex-col">
          {renderChildren(childNodes, depth + 1)}
        </div>
      )}
    </div>
  );
}

export default memo(LayerTreeItem);

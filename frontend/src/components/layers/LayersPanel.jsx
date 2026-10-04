import React, { useEffect, useRef, useCallback, memo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleLayers } from '../../store/slices/boardSlice.js';
import {
  fetchTreeChildren,
  searchTree,
  toggleExpandNode,
  expandAncestors,
  setSearchQuery,
  setFocusedNodePath,
} from '../../store/slices/layersSlice.js';
import {
  setHoverElement,
  clearHoverElement,
  selectElement,
} from '../../store/slices/selectionSlice.js';
import { hostProtocol } from '../../ipc/hostProtocol.js';
import { IPC_MESSAGES } from '../../ipc/messageTypes.js';
import LayerTreeItem from './LayerTreeItem.jsx';
import { Layers, Search, PanelLeftClose, X, RefreshCw, AlertCircle } from 'lucide-react';

function LayersPanel() {
  const dispatch = useDispatch();
  const searchInputRef = useRef(null);
  const containerRef = useRef(null);

  const showLayers = useSelector((state) => state.board.showLayers);
  const activeScreenId = useSelector((state) => state.selection.activeScreenId);
  const selectedElements = useSelector((state) => state.selection.selectedElements);
  const hoverElement = useSelector((state) => state.selection.hoverElement);

  const treeByScreen = useSelector((state) => state.layers.treeByScreen);
  const expandedByScreen = useSelector((state) => state.layers.expandedByScreen);
  const loadingRows = useSelector((state) => state.layers.loadingRows);
  const errorRows = useSelector((state) => state.layers.errorRows);
  const searchQuery = useSelector((state) => state.layers.searchQuery);
  const searchResults = useSelector((state) => state.layers.searchResults);
  const focusedNodePath = useSelector((state) => state.layers.focusedNodePath);

  const activeTree = (activeScreenId && treeByScreen[activeScreenId]) || {};
  const activeExpanded = (activeScreenId && expandedByScreen[activeScreenId]) || [];
  const rootChildren = activeTree['body'] || null;
  const rootRowKey = `${activeScreenId}:body`;
  const isRootLoading = loadingRows[rootRowKey];
  const rootError = errorRows[rootRowKey];

  // 1. Initial / On-Demand Root Tree Fetching (R4.1)
  useEffect(() => {
    if (!activeScreenId) return;
    if (!treeByScreen[activeScreenId]?.['body'] && !loadingRows[`${activeScreenId}:body`]) {
      dispatch(fetchTreeChildren({ screenId: activeScreenId, parentPath: 'body' }));
    }
  }, [activeScreenId, treeByScreen, loadingRows, dispatch]);

  // 2. Auto-expand ancestors when an element is selected on canvas (R4.3)
  useEffect(() => {
    if (!activeScreenId || !selectedElements || selectedElements.length === 0) return;
    const current = selectedElements[0];
    if (current && current.ancestors && current.ancestors.length > 0) {
      dispatch(
        expandAncestors({
          screenId: activeScreenId,
          ancestors: current.ancestors,
        })
      );

      // Ensure intermediate ancestor nodes are fetched
      current.ancestors.forEach((ancPath) => {
        if (ancPath !== 'body' && !treeByScreen[activeScreenId]?.[ancPath]) {
          dispatch(
            fetchTreeChildren({
              screenId: activeScreenId,
              parentPath: ancPath,
            })
          );
        }
      });
    }
  }, [activeScreenId, selectedElements, treeByScreen, dispatch]);

  // 3. Search debounce handler (R4.5)
  const searchTimerRef = useRef(null);
  const handleSearchChange = (e) => {
    const val = e.target.value;
    dispatch(setSearchQuery(val));

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      if (activeScreenId) {
        dispatch(searchTree({ screenId: activeScreenId, query: val }));
      }
    }, 200);
  };

  const handleClearSearch = () => {
    dispatch(setSearchQuery(''));
    if (activeScreenId) {
      dispatch(searchTree({ screenId: activeScreenId, query: '' }));
    }
  };

  // 4. Global ⌘K focus search shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 5. Node Event Handlers
  const handleToggle = useCallback(
    (node) => {
      if (!activeScreenId) return;
      const path = node.path || node.id;
      dispatch(toggleExpandNode({ screenId: activeScreenId, nodePath: path }));

      const isNowExpanded = !activeExpanded.includes(path);
      if (isNowExpanded && !activeTree[path] && !loadingRows[`${activeScreenId}:${path}`]) {
        dispatch(
          fetchTreeChildren({
            screenId: activeScreenId,
            parentPath: path,
            parentKey: node.key,
          })
        );
      }
    },
    [activeScreenId, activeExpanded, activeTree, loadingRows, dispatch]
  );

  const handleSelect = useCallback(
    (node) => {
      if (!activeScreenId) return;
      dispatch(
        selectElement({
          screenId: activeScreenId,
          element: node,
          multiSelect: false,
        })
      );
      dispatch(setFocusedNodePath(node.path));

      // Scroll preview iframe to element (R4.3)
      hostProtocol.postToScreen(activeScreenId, IPC_MESSAGES.SCROLL_INTO_VIEW, {
        id: node.id,
        key: node.key,
        path: node.path,
      });
    },
    [activeScreenId, dispatch]
  );

  const handleHover = useCallback(
    (node) => {
      if (!activeScreenId) return;
      dispatch(
        setHoverElement({
          screenId: activeScreenId,
          id: node.id,
          name: node.name,
          tag: node.tag,
          rect: node.rect,
        })
      );
    },
    [activeScreenId, dispatch]
  );

  const handleUnhover = useCallback(() => {
    dispatch(clearHoverElement());
  }, [dispatch]);

  const handleRetry = useCallback(
    (node) => {
      if (!activeScreenId) return;
      dispatch(
        fetchTreeChildren({
          screenId: activeScreenId,
          parentPath: node.path || 'body',
          parentKey: node.key,
        })
      );
    },
    [activeScreenId, dispatch]
  );

  // 6. Recursive Node Renderer
  const renderChildren = useCallback(
    (nodes, depth = 0) => {
      if (!nodes || nodes.length === 0) return null;

      return nodes.map((child) => {
        const path = child.path || child.id;
        const rowKey = `${activeScreenId}:${path}`;
        const isExpanded = activeExpanded.includes(path);
        const isSelected = selectedElements.some((s) => s.id === child.id || s.path === child.path);
        const isHovered = hoverElement?.id === child.id || hoverElement?.path === child.path;
        const isLoading = Boolean(loadingRows[rowKey]);
        const error = errorRows[rowKey];
        const nestedChildren = activeTree[path] || [];

        return (
          <LayerTreeItem
            key={child.id || path}
            node={child}
            depth={depth}
            screenId={activeScreenId}
            isExpanded={isExpanded}
            isSelected={isSelected}
            isHovered={isHovered}
            isLoading={isLoading}
            error={error}
            searchQuery={searchQuery}
            childNodes={nestedChildren}
            onToggle={handleToggle}
            onSelect={handleSelect}
            onHover={handleHover}
            onUnhover={handleUnhover}
            onRetry={handleRetry}
            renderChildren={renderChildren}
          />
        );
      });
    },
    [
      activeScreenId,
      activeExpanded,
      selectedElements,
      hoverElement,
      loadingRows,
      errorRows,
      activeTree,
      searchQuery,
      handleToggle,
      handleSelect,
      handleHover,
      handleUnhover,
      handleRetry,
    ]
  );

  // Flattened visible rows for Keyboard Navigation (R4.4)
  const getFlattenedVisibleRows = useCallback(() => {
    const list = [];
    const walk = (nodes) => {
      if (!nodes) return;
      for (const n of nodes) {
        list.push(n);
        const p = n.path || n.id;
        if (activeExpanded.includes(p) && activeTree[p]) {
          walk(activeTree[p]);
        }
      }
    };
    if (rootChildren) walk(rootChildren);
    return list;
  }, [rootChildren, activeExpanded, activeTree]);

  const handleSearchInputKeyDown = async (e) => {
    if (e.key === 'Enter') {
      let resultsToUse = searchResults;

      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
        if (activeScreenId && searchQuery) {
          const action = await dispatch(searchTree({ screenId: activeScreenId, query: searchQuery }));
          if (searchTree.fulfilled.match(action)) {
            resultsToUse = action.payload;
          }
        }
      }

      const visibleRows = getFlattenedVisibleRows();
      const isSingleMatch =
        (resultsToUse && resultsToUse.length === 1) ||
        (searchQuery.trim() !== '' && visibleRows.length === 1);

      if (isSingleMatch) {
        e.preventDefault();
        const item = resultsToUse && resultsToUse.length === 1 ? resultsToUse[0] : null;
        const node = item ? item.element || item : visibleRows[0];
        if (node) {
          handleSelect(node);
        }
      }
    }
  };

  const handleTreeKeyDown = (e) => {
    const visibleRows = getFlattenedVisibleRows();
    if (visibleRows.length === 0) return;

    const currentIdx = visibleRows.findIndex(
      (r) => r.path === focusedNodePath || selectedElements.some((s) => s.id === r.id)
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = Math.min(visibleRows.length - 1, currentIdx + 1);
      const nextNode = visibleRows[nextIdx];
      if (nextNode) handleSelect(nextNode);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = Math.max(0, currentIdx - 1);
      const prevNode = visibleRows[prevIdx];
      if (prevNode) handleSelect(prevNode);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const currNode = visibleRows[currentIdx];
      if (currNode && currNode.hasChildren) {
        const path = currNode.path || currNode.id;
        if (!activeExpanded.includes(path)) {
          handleToggle(currNode);
        }
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const currNode = visibleRows[currentIdx];
      if (currNode) {
        const path = currNode.path || currNode.id;
        if (activeExpanded.includes(path)) {
          handleToggle(currNode);
        }
      }
    } else if (e.key === 'Enter') {
      if (searchResults && searchResults.length === 1) {
        e.preventDefault();
        const item = searchResults[0];
        const node = item.element || item;
        if (node) handleSelect(node);
      } else if (currentIdx >= 0 && visibleRows[currentIdx]) {
        e.preventDefault();
        handleSelect(visibleRows[currentIdx]);
      }
    }
  };

  return (
    <aside
      className={`relative border-r border-white/[0.08] bg-[#0c0d10] flex flex-col shrink-0 z-20 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        showLayers ? 'w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none pointer-events-none'
      }`}
    >
      {/* Header Bar */}
      <div className="p-3 border-b border-white/[0.08] flex items-center justify-between min-w-[288px] bg-[#0f1115]">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          Layers
        </span>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.08]">
            {activeScreenId ? `Active: ${activeScreenId}` : 'No Screen'}
          </span>

          <button
            type="button"
            onClick={() => dispatch(toggleLayers())}
            title="Collapse Layers Panel"
            className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search Input Bar (R4.5) */}
      <div className="p-3 border-b border-white/[0.06] min-w-[288px] bg-[#0c0d10]">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleSearchInputKeyDown}
            placeholder="Search hierarchy..."
            className="w-full pl-8 pr-12 py-1.5 bg-[#14161a] border border-white/[0.08] rounded-lg text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/60 transition-all font-mono"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 p-0.5 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="kbd-badge absolute right-2 pointer-events-none">⌘K</kbd>
          )}
        </div>

        {/* Search Results Summary Tag */}
        {searchResults && (
          <div className="mt-2 text-[10px] font-mono text-indigo-300 flex items-center justify-between">
            <span>
              {searchResults.length === 1 ? '1 match found' : `${searchResults.length} matches found`}
            </span>
          </div>
        )}
      </div>

      {/* Layer Tree Content (R4.1, R4.2, R4.4) */}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleTreeKeyDown}
        className="flex-1 overflow-auto min-w-[288px] bg-[#0c0d10] focus:outline-none scrollbar-thin"
      >
        {!activeScreenId ? (
          <div className="p-6 flex flex-col items-center justify-center text-center text-xs text-zinc-500 space-y-2 h-full">
            <div className="w-9 h-9 rounded-xl bg-[#14161a] border border-white/[0.06] flex items-center justify-center text-zinc-400">
              <Layers className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-zinc-300 font-medium">No preview selected</p>
            <p className="text-[11px] text-zinc-500 max-w-[180px]">
              Click inside any preview frame on the board to view its layer tree.
            </p>
          </div>
        ) : isRootLoading ? (
          <div className="p-6 flex flex-col items-center justify-center text-center text-xs text-zinc-400 space-y-2.5 h-full">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            <p className="text-zinc-300 font-medium">Loading layer hierarchy...</p>
          </div>
        ) : rootError ? (
          <div className="p-6 flex flex-col items-center justify-center text-center text-xs text-rose-300 space-y-2.5 h-full">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <p className="font-medium text-rose-200">Failed to load layers</p>
            <p className="text-[11px] text-rose-400/80">{rootError}</p>
            <button
              type="button"
              onClick={() => handleRetry({ path: 'body' })}
              className="mt-1 px-3 py-1 bg-rose-600/80 hover:bg-rose-500 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        ) : rootChildren && rootChildren.length > 0 ? (
          <div className="py-1 min-w-full inline-block pr-6">{renderChildren(rootChildren, 0)}</div>
        ) : (
          <div className="p-6 flex flex-col items-center justify-center text-center text-xs text-zinc-500 space-y-2 h-full">
            <p className="text-zinc-400 font-medium">Empty hierarchy</p>
            <p className="text-[11px] text-zinc-500">No element nodes found under &lt;body&gt;.</p>
          </div>
        )}
      </div>
    </aside>
  );
}

export default memo(LayersPanel);

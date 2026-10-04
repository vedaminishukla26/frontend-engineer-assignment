/**
 * Figr Guest Probe — Core Coordinator
 * Coordinates event capture, hit-testing, mutations, and RPC messages.
 */
import { IPC } from './probeConstants.js';
import {
  getElementName,
  getElementPath,
  findElementByDescriptor,
  serializeElement,
} from './probeHelpers.js';

(() => {
  if (window.__FIGR_PROBE_INITIALIZED__) return;
  window.__FIGR_PROBE_INITIALIZED__ = true;

  let currentMode = 'select'; // 'select' | 'interact'
  const hostWindow = window.parent;
  let lastHoveredElement = null;

  // --- Send Message to Host ---
  function postToHost(type, payload = {}) {
    if (!hostWindow) return;
    try {
      hostWindow.postMessage(
        {
          source: 'FIGR_PROBE',
          type,
          url: window.location.href,
          payload,
          timestamp: Date.now(),
        },
        '*'
      );
    } catch (e) {
      console.error('[Probe] postMessage failed', e);
    }
  }

  // --- Pointer Move & Hover Hit-Testing (R2) ---
  function handlePointerMove(e) {
    if (currentMode !== 'select') return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || target === document.body || target === document.documentElement) {
      if (lastHoveredElement) {
        lastHoveredElement = null;
        postToHost(IPC.ELEMENT_UNHOVER);
      }
      return;
    }

    if (target !== lastHoveredElement) {
      lastHoveredElement = target;
      const data = serializeElement(target);
      if (data) {
        postToHost(IPC.ELEMENT_HOVER, { element: data });
      }
    }
  }

  function handlePointerLeave() {
    lastHoveredElement = null;
    postToHost(IPC.ELEMENT_UNHOVER);
  }

  // --- Element Selection & Capture-Phase Interception (R3) ---
  function handleClick(e) {
    if (currentMode !== 'select') return;

    // Prevent navigation, button actions, form submission in Select mode
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || target === document.body || target === document.documentElement) {
      postToHost(IPC.CLEAR_SELECTION);
      return;
    }

    const data = serializeElement(target);
    if (data) {
      postToHost(IPC.ELEMENT_SELECT, {
        element: data,
        shiftKey: Boolean(e.shiftKey),
      });
    }
  }

  function handleGenericSuppression(e) {
    if (currentMode === 'select') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }

  // Bind capture-phase event listeners
  window.addEventListener('mousemove', handlePointerMove, true);
  window.addEventListener('mouseleave', handlePointerLeave, true);
  window.addEventListener('click', handleClick, true);
  window.addEventListener('mousedown', handleGenericSuppression, true);
  window.addEventListener('mouseup', handleGenericSuppression, true);
  window.addEventListener('submit', handleGenericSuppression, true);
  window.addEventListener('dblclick', handleGenericSuppression, true);

  // Wheel handling: Ctrl/Cmd + wheel zooms board (R1.3), normal wheel scrolls preview (R1.4)
  function handleWheel(e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      postToHost(IPC.WHEEL_ZOOM, {
        deltaY: e.deltaY,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    }
  }
  window.addEventListener('wheel', handleWheel, { passive: false, capture: true });

  // Geometry tracking (Scroll & Resize with rAF throttling)
  let geomRaf = null;
  function notifyGeometry() {
    if (geomRaf) return;
    geomRaf = requestAnimationFrame(() => {
      geomRaf = null;
      postToHost(IPC.GEOMETRY_CHANGED, {
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      });
    });
  }
  window.addEventListener('scroll', notifyGeometry, { passive: true, capture: true });
  window.addEventListener('resize', notifyGeometry, { passive: true });

  // MutationObserver for Dynamic DOM Updates (e.g. Page 4 live feed)
  const mutationObserver = new MutationObserver(() => {
    postToHost(IPC.DOM_MUTATED, { timestamp: Date.now() });
  });
  mutationObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
  });

  // --- Host Message Dispatcher ---
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.source !== 'FIGR_HOST') return;

    switch (data.type) {
      case IPC.PROBE_ACK:
      case IPC.SET_MODE: {
        if (data.payload?.mode) {
          currentMode = data.payload.mode;
        }
        break;
      }

      case IPC.QUERY_CHILDREN_REQ: {
        const { requestId, parentPath, parentKey } = data.payload || {};
        let parentEl = document.body;
        if (parentKey) {
          parentEl = document.querySelector(`[data-key="${parentKey}"]`) || document.body;
        } else if (parentPath && parentPath !== 'body') {
          parentEl = findElementByDescriptor({ id: parentPath, key: parentKey, path: parentPath }) || document.body;
        }

        const childElements = Array.from(parentEl.children).filter(
          (c) => c.nodeType === Node.ELEMENT_NODE && c.tagName.toLowerCase() !== 'script'
        );

        const children = childElements.map((c) => {
          const s = serializeElement(c);
          return {
            id: s.id,
            path: s.path,
            key: s.key,
            name: s.name,
            tag: s.tag,
            hasChildren: s.hasChildren,
            rect: s.rect,
          };
        });

        postToHost(IPC.QUERY_CHILDREN_RESP, {
          requestId,
          parentPath: parentPath || 'body',
          children,
        });
        break;
      }

      case IPC.QUERY_SEARCH_REQ: {
        const { requestId, query } = data.payload || {};
        const q = (query || '').toLowerCase().trim();
        const results = [];

        if (q) {
          const all = document.body.querySelectorAll('*');
          all.forEach((el) => {
            if (el.tagName.toLowerCase() === 'script') return;
            const name = getElementName(el);
            const tag = el.tagName.toLowerCase();
            const text = (el.textContent || '').trim().slice(0, 80);
            const id = el.id || '';
            const cls = typeof el.className === 'string' ? el.className : '';
            const key = el.dataset?.key || '';

            if (
              name.toLowerCase().includes(q) ||
              tag.includes(q) ||
              text.toLowerCase().includes(q) ||
              id.toLowerCase().includes(q) ||
              cls.toLowerCase().includes(q) ||
              key.toLowerCase().includes(q)
            ) {
              const ancestors = [];
              let p = el.parentElement;
              while (p && p !== document.documentElement) {
                ancestors.unshift(p === document.body ? 'body' : getElementPath(p));
                p = p.parentElement;
              }
              results.push({
                element: serializeElement(el),
                ancestors,
              });
            }
          });
        }

        postToHost(IPC.QUERY_SEARCH_RESP, { requestId, query, results });
        break;
      }

      case IPC.SCROLL_INTO_VIEW: {
        const { id, key } = data.payload || {};
        const el = findElementByDescriptor({ id, key });
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        }
        break;
      }

      case IPC.KEYBOARD_NAV_REQ: {
        const { direction, currentId, currentKey } = data.payload || {};
        const curr = findElementByDescriptor({ id: currentId, key: currentKey });
        let nextEl = null;

        if (curr) {
          if (direction === 'first_child') {
            const validChildren = Array.from(curr.children).filter(
              (c) => c.nodeType === Node.ELEMENT_NODE && c.tagName.toLowerCase() !== 'script'
            );
            if (validChildren.length > 0) nextEl = validChildren[0];
          } else if (direction === 'parent') {
            const p = curr.parentElement;
            if (p && p !== document.documentElement) nextEl = p;
          } else if (direction === 'next_sibling') {
            const parent = curr.parentElement;
            if (parent) {
              const siblings = Array.from(parent.children).filter(
                (c) => c.nodeType === Node.ELEMENT_NODE && c.tagName.toLowerCase() !== 'script'
              );
              const idx = siblings.indexOf(curr);
              nextEl = siblings[(idx + 1) % siblings.length];
            }
          } else if (direction === 'prev_sibling') {
            const parent = curr.parentElement;
            if (parent) {
              const siblings = Array.from(parent.children).filter(
                (c) => c.nodeType === Node.ELEMENT_NODE && c.tagName.toLowerCase() !== 'script'
              );
              const idx = siblings.indexOf(curr);
              nextEl = siblings[(idx - 1 + siblings.length) % siblings.length];
            }
          }
        }

        postToHost(IPC.KEYBOARD_NAV_RESP, {
          element: nextEl ? serializeElement(nextEl) : null,
        });
        break;
      }

      case IPC.RECONCILE_REQ: {
        const { requestId, descriptors } = data.payload || {};
        const updated = [];
        const vanishedIds = [];

        (descriptors || []).forEach((desc) => {
          const el = findElementByDescriptor(desc);
          if (el) {
            const s = serializeElement(el);
            if (s) updated.push(s);
            else vanishedIds.push(desc.id);
          } else {
            vanishedIds.push(desc.id);
          }
        });

        postToHost(IPC.RECONCILE_RESP, { requestId, updated, vanishedIds });
        break;
      }

      default:
        break;
    }
  });

  // Intercept keyboard shortcuts even when iframe has focus (R3.6)
  function handleProbeKeyDown(e) {
    const targetTag = e.target?.tagName?.toUpperCase();
    const isEditingInput = (targetTag === 'INPUT' || targetTag === 'TEXTAREA') && e.key !== 'Escape';
    if (isEditingInput) return;

    const navKeys = ['Enter', 'Tab', 'Escape', 'v', 'V', 'i', 'I'];
    if (navKeys.includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      postToHost(IPC.KEYBOARD_SHORTCUT, {
        key: e.key,
        shiftKey: Boolean(e.shiftKey),
        ctrlKey: Boolean(e.ctrlKey),
        metaKey: Boolean(e.metaKey),
      });
    }
  }
  window.addEventListener('keydown', handleProbeKeyDown, true);

  // --- Runtime Page Errors (R6.3) ---
  window.addEventListener('error', (event) => {
    postToHost(IPC.PAGE_ERROR, {
      message: event.message || 'Script error',
      filename: event.filename,
      lineno: event.lineno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    postToHost(IPC.PAGE_ERROR, {
      message: `Unhandled promise rejection: ${message}`,
    });
  });

  // Announce Probe Initialized
  postToHost(IPC.PROBE_INIT, {
    title: document.title,
    location: window.location.href,
  });
})();

/**
 * Probe Helper Functions
 * DOM extraction, naming, path generation, and element serialization
 */

/**
 * Generate Element Name as defined in README Term 4:
 * "an element's data-name if it has one, otherwise tag plus first class (button.primary)
 * or tag plus id (div#hero), otherwise the tag alone."
 */
export function getElementName(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
  if (el.dataset && el.dataset.name) {
    return el.dataset.name.trim();
  }
  const tag = el.tagName.toLowerCase();
  if (el.className && typeof el.className === 'string' && el.className.trim()) {
    const firstClass = el.className.trim().split(/\s+/)[0];
    if (firstClass) return `${tag}.${firstClass}`;
  }
  if (el.id) {
    return `${tag}#${el.id}`;
  }
  return tag;
}

/**
 * Generate stable unique CSS selector path for an element
 */
export function getElementPath(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
  if (el === document.body) return 'body';
  if (el === document.documentElement) return 'html';

  let path = '';
  let curr = el;
  while (curr && curr !== document.body && curr !== document.documentElement) {
    if (curr.dataset && curr.dataset.key) {
      const keySelector = `[data-key="${curr.dataset.key}"]`;
      path = path ? `${keySelector} > ${path}` : keySelector;
      return path;
    }
    const parent = curr.parentElement;
    if (!parent) break;
    const siblings = Array.from(parent.children).filter((c) => c.tagName === curr.tagName);
    const index = siblings.indexOf(curr) + 1;
    const tag = curr.tagName.toLowerCase();
    const part = siblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag;
    path = path ? `${part} > ${path}` : part;
    curr = parent;
  }
  return path ? `body > ${path}` : '';
}

/**
 * Find DOM element by descriptor object ({ id, key })
 */
export function findElementByDescriptor(desc) {
  if (!desc) return null;

  // 1. Keyed element match (data-key attribute is unique & stable across re-renders)
  if (desc.key) {
    const el = document.querySelector(`[data-key="${desc.key}"]`);
    if (el) return el;
  }
  if (desc.id && desc.id.startsWith('key:')) {
    const keyVal = desc.id.slice(4);
    const el = document.querySelector(`[data-key="${keyVal}"]`);
    if (el) return el;
  }

  // If path contains [data-key=], it is scoped to a keyed container
  const pathSelector = desc.path || desc.id;
  if (pathSelector && pathSelector.includes('[data-key=')) {
    try {
      const candidate = document.querySelector(pathSelector);
      if (candidate) return candidate;
    } catch (e) {}
  }

  // 2. Exact or Prefix text match on pathSelector
  if (pathSelector && !pathSelector.startsWith('key:')) {
    try {
      const candidate = document.querySelector(pathSelector);
      if (candidate) {
        const candText = (candidate.textContent || '').trim().slice(0, 80);
        const candTag = candidate.tagName.toLowerCase();
        const expectedTag = desc.tag ? desc.tag.toLowerCase() : null;

        const isTagMatch = !expectedTag || candTag === expectedTag;

        if (isTagMatch) {
          if (!desc.text) return candidate;
          const targetText = (desc.text || '').trim().slice(0, 80);
          if (candText === targetText) return candidate;

          // Match prefix text (ignores changing relative time strings like "2s ago" -> "4s ago")
          const minLen = Math.min(candText.length, targetText.length, 20);
          if (minLen >= 5 && candText.slice(0, minLen) === targetText.slice(0, minLen)) {
            return candidate;
          }
        }
      }
    } catch (e) {}
  }

  // 3. Fingerprint Search across DOM for un-keyed elements
  if (desc.tag || desc.text) {
    const expectedTag = (desc.tag || '*').toLowerCase();
    try {
      const candidates = Array.from(document.querySelectorAll(expectedTag));
      const targetText = (desc.text || '').trim().slice(0, 80);

      for (const cand of candidates) {
        if (cand === document.body || cand === document.documentElement) continue;
        const candText = (cand.textContent || '').trim().slice(0, 80);
        const candElId = cand.id || '';

        const matchTag = !desc.tag || cand.tagName.toLowerCase() === desc.tag.toLowerCase();
        const matchElId = !desc.elementId || candElId === desc.elementId;

        if (matchTag && matchElId && targetText) {
          if (candText === targetText) return cand;
          const minLen = Math.min(candText.length, targetText.length, 20);
          if (minLen >= 5 && candText.slice(0, minLen) === targetText.slice(0, minLen)) {
            return cand;
          }
        }
      }
    } catch (e) {}
  }

  // Note: Never fall back to arbitrary index selectors if text/fingerprint fails.
  // Returning null allows host to declare element deleted (R3.7) instead of jumping to wrong element.
  return null;
}

/**
 * Serialize DOM element metrics, geometry, and computed styles for host application
 */
export function serializeElement(el) {
  if (!el || el === document.body || el === document.documentElement) return null;
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  const key = el.dataset ? el.dataset.key || null : null;
  const path = getElementPath(el);
  const name = getElementName(el);
  const tag = el.tagName.toLowerCase();
  const text = (el.textContent || '').trim().slice(0, 120);

  const elementChildren = Array.from(el.children).filter((c) => c.nodeType === Node.ELEMENT_NODE);
  const hasChildren = elementChildren.length > 0;

  const ancestors = [];
  let p = el.parentElement;
  while (p && p !== document.documentElement) {
    ancestors.unshift(p === document.body ? 'body' : getElementPath(p));
    p = p.parentElement;
  }

  return {
    id: key ? `key:${key}` : path,
    path,
    key,
    name,
    tag,
    elementId: el.id || '',
    className: typeof el.className === 'string' ? el.className : '',
    text,
    hasChildren,
    ancestors,
    rect: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
    computedStyles: {
      color: style.color,
      backgroundColor: style.backgroundColor,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      display: style.display,
      position: style.position,
      boxSizing: style.boxSizing,
    },
  };
}

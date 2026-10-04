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
  if (el.dataset && el.dataset.key) {
    return `[data-key="${el.dataset.key}"]`;
  }
  if (el === document.body) return 'body';
  if (el === document.documentElement) return 'html';

  let path = '';
  let curr = el;
  while (curr && curr !== document.body && curr !== document.documentElement) {
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
  if (desc.key) {
    const el = document.querySelector(`[data-key="${desc.key}"]`);
    if (el) return el;
  }
  if (desc.id) {
    if (desc.id.startsWith('key:')) {
      const keyVal = desc.id.slice(4);
      const el = document.querySelector(`[data-key="${keyVal}"]`);
      if (el) return el;
    } else if (desc.id.startsWith('[data-key=')) {
      const el = document.querySelector(desc.id);
      if (el) return el;
    } else {
      try {
        const el = document.querySelector(desc.id);
        if (el) return el;
      } catch (e) {
        // Fallback for complex selectors
      }
    }
  }
  if (desc.path) {
    try {
      const el = document.querySelector(desc.path);
      if (el) return el;
    } catch (e) {
      // Ignore selector errors
    }
  }
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

import { IPC_MESSAGES } from './messageTypes.js';

class HostProtocolManager {
  constructor() {
    this.iframeRegistry = new Map(); // screenId -> HTMLIFrameElement / Window
    this.pendingRpc = new Map(); // requestId -> { resolve, reject, timeoutId }
    this.listeners = new Set();
    this.isListening = false;
    this.initMessageListener();
  }

  initMessageListener() {
    if (this.isListening || typeof window === 'undefined') return;
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || data.source !== 'FIGR_PROBE') return;

      // Handle RPC response if message has requestId
      if (data.payload && data.payload.requestId) {
        const rpc = this.pendingRpc.get(data.payload.requestId);
        if (rpc) {
          clearTimeout(rpc.timeoutId);
          this.pendingRpc.delete(data.payload.requestId);
          rpc.resolve(data.payload);
        }
      }

      // Notify all registered host listeners
      this.listeners.forEach((listener) => {
        try {
          listener(data.type, data.payload, data.url, event.source);
        } catch (err) {
          console.error('[HostProtocol] Listener error', err);
        }
      });
    });
    this.isListening = true;
  }

  registerIframe(screenId, iframeEl) {
    this.iframeRegistry.set(screenId, iframeEl);
  }

  unregisterIframe(screenId) {
    this.iframeRegistry.delete(screenId);
  }

  getIframeWindow(screenId) {
    const el = this.iframeRegistry.get(screenId);
    if (!el) return null;
    return el.contentWindow || el;
  }

  postToIframe(targetWindow, type, payload = {}) {
    if (!targetWindow) return;
    try {
      targetWindow.postMessage(
        {
          source: 'FIGR_HOST',
          type,
          payload,
          timestamp: Date.now(),
        },
        '*'
      );
    } catch (e) {
      console.error('[HostProtocol] postMessage failed', e);
    }
  }

  postToScreen(screenId, type, payload = {}) {
    const win = this.getIframeWindow(screenId);
    if (win) {
      this.postToIframe(win, type, payload);
    }
  }

  broadcast(type, payload = {}) {
    this.iframeRegistry.forEach((iframe) => {
      const win = iframe.contentWindow || iframe;
      if (win) {
        this.postToIframe(win, type, payload);
      }
    });
  }

  sendRpc(screenId, type, payload = {}, timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
      const requestId = `rpc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const win = this.getIframeWindow(screenId);

      if (!win) {
        return reject(new Error(`Preview screen "${screenId}" is not connected`));
      }

      const timeoutId = setTimeout(() => {
        this.pendingRpc.delete(requestId);
        reject(new Error(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRpc.set(requestId, { resolve, reject, timeoutId });

      this.postToIframe(win, type, {
        ...payload,
        requestId,
      });
    });
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const hostProtocol = new HostProtocolManager();

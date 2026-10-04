# Figr — Web Page Canvas & Live Inspector

[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-2.13-764ABC?style=flat&logo=redux)](https://redux-toolkit.js.org/)
[![Node](https://img.shields.io/badge/Node->=18-339933?style=flat&logo=node.js)](https://nodejs.org/)

> **A Figma / FigJam-style multi-screen canvas and live inspector** built for inspecting, navigating, and debugging live web pages across isolated iframe origins. Supports 2D pan/zoom canvas, capture-phase hover/selection overlays, DOM reconciliation across dynamic page mutations, 2-way synchronized lazy tree hierarchies, async details inspection, and regional fault domain containment with exact-once error reporting.

---

## 1. Quick Start Guide

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### Single-Command Launch (Recommended)
Clone the repository and run the single root command to start both backend API/page server and frontend dev server concurrently:

```bash
# 1. Install dependencies
npm install

# 2. Start both backend (ports 4000 & 4001) and frontend (port 5173)
npm start
```

Once running, access the application in your browser:
- **Host Application**: `http://localhost:5173`
- **Backend API Server**: `http://localhost:4000`
- **Guest Page Server**: `http://localhost:4001`

### Running Services Separately (Optional)

```bash
# Start backend API & Page Server only
npm run backend

# Start Vite Frontend dev server only
npm run frontend

# Production Build Verification
npm run build
```

---

## 2. Architecture & State Machine

### System Architecture Overview

The system is structured as a decoupled **Host-Guest Distributed Model**:

```
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │ HOST APPLICATION (http://localhost:5173)                                         │
 │                                                                                  │
 │   ┌─────────────────┐       ┌─────────────────┐       ┌──────────────────────┐   │
 │   │  TopNavbar /    │       │  LayersPanel    │       │   InspectorPanel     │   │
 │   │  Dev Menu       │       │  (Lazy Tree)    │       │   (Live & Details)   │   │
 │   └────────┬────────┘       └────────▲────────┘       └──────────▲───────────┘   │
 │            │                         │                           │               │
 │            ▼                         │                           │               │
 │   ┌──────────────────────────────────┴───────────────────────────┴───────────┐   │
 │   │ REDUX TOOLKIT STORE (board, selection, layers, inspector, error slices)  │   │
 │   └──────────────────────────────────▲───────────────────────────────────────┘   │
 │                                      │                                           │
 │   ┌──────────────────────────────────┴───────────────────────────────────────┐   │
 │   │ BoardCanvas 2D Viewport (translate3d, scale 25%-400%, Overlays)          │   │
 │   └──────────────────────────────────▲───────────────────────────────────────┘   │
 └──────────────────────────────────────┼───────────────────────────────────────────┘
                                        │ window.postMessage (IPC Protocol)
 ┌──────────────────────────────────────┼───────────────────────────────────────────┐
 │ GUEST PREVIEWS (http://localhost:4001 - page-1.html to page-6.html)              │
 │                                      │                                           │
 │   ┌──────────────────────────────────▼───────────────────────────────────────┐   │
 │   │ Guest Probe SDK (probe.js + probeHelpers.js + activeSelectedNodes Map)   │   │
 │   │ - Capture-phase event suppression, DOM MutationWatcher, style serializer │   │
 │   └──────────────────────────────────────────────────────────────────────────┘   │
 └──────────────────────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
.
├── backend/
│   ├── server.js              # Mock API (:4000) & Page Server (:4001)
│   ├── data/                  # screens.json, elements.json
│   └── pages/                 # Preview HTML pages (page-1.html to page-6-next.html)
│       ├── probe.js            # Guest Probe SDK lifecycle coordinator
│       ├── probeConstants.js   # Typed IPC message protocol constants
│       └── probeHelpers.js    # Element naming, CSS path generation & DOM lookup
├── frontend/
│   ├── report.js              # Failure reporter stub
│   ├── index.html             # Host application entrypoint
│   └── src/
│       ├── App.jsx            # Application shell & workspace layout
│       ├── canvas/
│       │   ├── BoardCanvas.jsx      # Infinite 2D viewport (pan/zoom camera matrix)
│       │   ├── ScreenPreview.jsx    # Preview iframe container & protocol bridge
│       │   ├── HoverOverlay.jsx     # 1px cyan outline & label renderer
│       │   └── SelectionOverlay.jsx # 2px indigo outline & label renderer
│       ├── components/
│       │   ├── common/
│       │   │   └── RegionErrorBoundary.jsx # Granular fault isolation boundary
│       │   ├── inspector/
│       │   │   └── InspectorPanel.jsx      # Live properties & async API details
│       │   ├── layers/
│       │   │   ├── LayersPanel.jsx         # Tree panel with horizontal scroll & search
│       │   │   └── LayerTreeItem.jsx       # Lazy loading tree row item
│       │   └── layout/
│       │       ├── TopNavbar.jsx           # Mode toggles, zoom HUD & dev failure menu
│       │       └── DevFailureMenu.jsx      # On-demand R6 failure simulation dropdown
│       ├── hooks/
│       │   └── useKeyboardShortcuts.js     # Global shortcuts dispatcher (V, I, Esc, Enter, Tab)
│       ├── ipc/
│       │   ├── hostProtocol.js             # Host-side postMessage IPC listener & dispatcher
│       │   └── messageTypes.js             # IPC event types catalog
│       └── store/
│           ├── index.js                    # Redux store configuration
│           └── slices/
│               ├── boardSlice.js           # Viewport pan, zoom, screens & sidebar state
│               ├── selectionSlice.js       # Active screen, hover & multi-selection descriptors
│               ├── layersSlice.js          # Tree node registry, expansion & search index
│               ├── inspectorSlice.js       # Async API details & multi-select aggregation
│               └── errorSlice.js           # Region failure status & exact-once report deduplication
```

### Redux State Machine Slices

1. **`boardSlice.js`**: Manages 2D canvas transformation state (`pan: { x, y }`, `zoom: 0.25..4.0`), active interaction mode (`"select"` vs `"interact"`), canvas screen metadata, and sidebar visibility toggles.
2. **`selectionSlice.js`**: Tracks `activeScreenId`, array of `selectedElements` (with bounding rects, CSS paths, names, tags, computed styles), single `hoverElement` descriptor, and `lastSelectedId` for keyboard traversal.
3. **`layersSlice.js`**: Maintains tree node registries per preview, expanded node IDs per screen, search query filter, lazy loading state per node ID (`loading`, `error`, `retryCount`), and search match results.
4. **`inspectorSlice.js`**: Stores API details metadata (`component`, `description`, `status`, `owner`), loading state, HTTP 404 status (`is404`), and multi-selection aggregated values (`"Mixed"` vs uniform values).
5. **`errorSlice.js`**: Tracks regional fault domain statuses (`board`, `preview:[id]`, `layers`, `layers-row:[id]`, `inspector`, `details`), page-level script errors, and deduplicated `reportedFailures` set to guarantee exact-once `report()` execution.

### Viewport Transformation Math & Coordinate System

- **Transform Matrix**: The board canvas applies GPU-accelerated CSS transforms:
  $$\text{transform} = \text{translate3d}(x_{\text{pan}}, y_{\text{pan}}, 0)\;\text{scale}(s_{\text{zoom}})$$
- **Pointer-Centered Zoom Math**: When zooming via `Cmd/Ctrl + Wheel` or button controls, the origin point under the mouse pointer $(P_x, P_y)$ remains invariant on screen:
  $$x_{\text{new}} = P_x - (P_x - x_{\text{old}}) \times \frac{s_{\text{new}}}{s_{\text{old}}}$$
  $$y_{\text{new}} = P_y - (P_y - y_{\text{old}}) \times \frac{s_{\text{new}}}{s_{\text{old}}}$$
- **Scale-Invariant Overlay Rendering**: Bounding box overlays (`HoverOverlay` and `SelectionOverlay`) scale inversely with zoom ($1/s_{\text{zoom}}$) so outline thicknesses (1px / 2px) and text label font sizes stay crisp and constant at every zoom level (25% to 400%).

---

## 3. Host ↔ Guest Probe IPC Protocol

Communication between the host application (`:5173`) and cross-origin iframe preview pages (`:4001`) uses a typed `window.postMessage` RPC protocol with source origin verification.

```
Host (5173)                                                     Guest Preview (4001)
   │                                                                     │
   │ ─────────────────── INIT_HANDSHAKE { screenId } ──────────────────> │ (iframe loaded)
   │ <───────────────── PROBE_READY { screenId, url } ─────────────────  │ (probe initialized)
   │                                                                     │
   │ <───────────────── ELEMENT_HOVER { rect, name, path } ───────────── │ (mouse hover)
   │ <───────────────── ELEMENT_SELECT { rect, name, path, styles } ─── │ (mouse click)
   │                                                                     │
   │ ─────────────────── QUERY_CHILDREN_REQ { nodePath } ──────────────> │ (expand layer row)
   │ <───────────────── QUERY_CHILDREN_RESP { children } ────────────── │ (within 3s)
   │                                                                     │
   │ ─────────────────── RECONCILE_REQ { selectedPaths } ──────────────> │ (DOM mutation)
   │ <───────────────── RECONCILE_RESP { updatedDescriptors } ───────── │ (identity check)
   │                                                                     │
```

### Complete IPC Message Catalog

| Message Type | Direction | Payload Parameters | Purpose |
| :--- | :--- | :--- | :--- |
| `INIT_HANDSHAKE` | Host $\rightarrow$ Guest | `{ screenId }` | Binds preview frame ID to iframe window context upon mount. |
| `PROBE_READY` | Guest $\rightarrow$ Host | `{ screenId, url, title }` | Confirms probe SDK active and signals host to enable overlays. |
| `SET_MODE` | Host $\rightarrow$ Guest | `{ mode: 'select' \| 'interact' }` | Toggles capture-phase event suppression on guest DOM. |
| `ELEMENT_HOVER` | Guest $\rightarrow$ Host | `{ elementDescriptor \| null }` | Transmits hit-tested element metrics and bounding box on pointermove. |
| `ELEMENT_SELECT` | Guest $\rightarrow$ Host | `{ elementDescriptor, isShift }` | Transmits clicked element details for single/multi-selection. |
| `GEOMETRY_SYNC` | Guest $\rightarrow$ Host | `{ updatedRects }` | Throttled rAF sync of element bounding boxes during iframe scroll/resize. |
| `RECONCILE_REQ` | Host $\rightarrow$ Guest | `{ selectedDescriptors }` | Requests verification of selected elements after DOM mutations. |
| `RECONCILE_RESP` | Guest $\rightarrow$ Host | `{ reconciledDescriptors, vanishList }` | Returns updated element rects or signals vanished/deleted elements. |
| `QUERY_CHILDREN_REQ` | Host $\rightarrow$ Guest | `{ requestId, parentPath }` | RPC request for immediate children of a specific DOM node. |
| `QUERY_CHILDREN_RESP`| Guest $\rightarrow$ Host | `{ requestId, children }` | RPC response containing array of child element descriptors. |
| `QUERY_SEARCH_REQ` | Host $\rightarrow$ Guest | `{ requestId, query }` | RPC full-tree search across unrendered DOM branches. |
| `QUERY_SEARCH_RESP` | Guest $\rightarrow$ Host | `{ requestId, results }` | Returns matching node paths and matching ancestor chains. |
| `SCROLL_INTO_VIEW` | Host $\rightarrow$ Guest | `{ elementPath }` | Commands guest iframe to scroll target element into page view. |
| `PAGE_NAVIGATED` | Guest $\rightarrow$ Host | `{ newUrl }` | Signals page link navigation in Interact mode; clears preview selection. |
| `PAGE_ERROR` | Guest $\rightarrow$ Host | `{ message, filename, lineno }` | Transmits uncaught runtime JS errors inside iframe to render error badge. |
| `WHEEL_ZOOM` | Guest $\rightarrow$ Host | `{ deltaY, clientX, clientY }` | Forwards `Cmd/Ctrl + Wheel` events over iframes to drive host canvas zoom. |

### Slow, Hung, or Navigated Guest Handling
- **Preview Connection Timeout (10s)**: When `ScreenPreview` mounts, a 10-second timer starts. If `PROBE_READY` is not received within 10s, the preview transitions to an error state displaying `"Couldn't connect to this preview"` with an isolated Retry button (R6.2).
- **Layer Row RPC Timeout (3s)**: When expanding a layer row, `QUERY_CHILDREN_REQ` sets a 3000ms timer. If the guest fails to respond within 3s, the row renders an inline error `"Failed to load children"` with a row-level Retry button (R4.3).
- **Page Navigation**: Following a link in Interact mode triggers `PAGE_NAVIGATED`. The host clears the preview's selection, resets its layer tree cache, and updates the preview URL badge while retaining the board layout (R3.8).

---

## 4. Ambiguities & Architectural Design Trade-Offs

### 1. Dynamic Element Identity Tracking (Screen 4 Re-render Resilience)
- **Ambiguity in R3.7**: Screen 4 (`page-4.html`) prepends new list items to its DOM every 2 seconds while updating relative time strings ("2s ago" $\rightarrow$ "4s ago"). Naive CSS index paths (`:nth-of-type(X)`) cause selection outlines to jump to newly prepended items.
- **SD3 Decision**: 
  1. **Live DOM Node Reference Tracking**: The Guest Probe SDK maintains an internal `activeSelectedNodes` `Map<string, HTMLElement>`. Standard JavaScript object identity confirms if a node reference remains connected in the DOM (`el.isConnected === true`). As siblings shift, `serializeElement(el)` recalculates the updated CSS path and geometry without losing lock on the exact node.
  2. **Scoped Selector Paths**: `getElementPath` constructs scoped paths (`[data-key="activity-X"] > span:nth-of-type(2) > b`), keeping selectors locked to keyed parent containers even as rows shift.
  3. **Text Prefix Matching**: `findElementByDescriptor` compares text using prefix matching (`candText.slice(0, minLen)`), ignoring changing relative timestamp suffixes.
  4. **Strict Deletion Handling**: If an element is unmounted/deleted, `findElementByDescriptor` returns `null` rather than guessing a fallback index, correctly triggering `"This element no longer exists"` in the Inspector per R3.7.

### 2. HTTP 404 Status Handling in Inspector Details (`GET /elements/:key`)
- **Ambiguity in R5.1 & R6.2**: R5.1 states `"A 404 shows 'No details for this element'. A 404 is not an error."`, whereas R6.2 states `"GET /elements/:key fails or returns bad data -> error in Details only"`.
- **SD3 Decision**: HTTP `404` status codes are intercepted explicitly in `fetchElementDetails` thunk and stored as `is404: true`. The Inspector renders a clean neutral info card `"No details for this element"`. HTTP 5xx errors or network failures trigger the regional error boundary state with a Retry button and trigger `report()` exactly once.

### 3. Keyboard Shortcut Interception across Cross-Origin Iframes
- **Ambiguity in R3.6**: `"All shortcuts (V, I, Escape, Enter, Tab, and so on) work even right after the user clicked inside a preview."` Clicking inside an iframe shifts browser keyboard focus into the iframe window, bypassing host `window.addEventListener('keydown')`.
- **SD3 Decision**: The Guest Probe attaches capture-phase `keydown` listeners inside the iframe document. Shortcut keys (`V`, `I`, `Escape`, `Enter`, `Shift+Enter`, `Tab`, `Shift+Tab`) are intercepted, `e.preventDefault()` is called on navigation keys, and an IPC payload is posted to the host window to execute Redux selection/mode actions seamlessly.

---

## 5. "Where This Breaks" — Known Edge Cases & Architectural Boundaries

While the application satisfies all requirements R1–R6, the following edge cases represent fundamental web platform limitations:

### 1. Closed Shadow DOM Encapsulation
- **Limitation**: Elements inside closed Shadow Roots (`Element.shadowRoot` is `null` or closed) cannot be inspected by external DOM traversal (`document.elementFromPoint` or `querySelector`).
- **Impact**: Hover and selection boxes outline the top-level Shadow Host element rather than individual elements inside the closed shadow tree.

### 2. Cross-Origin Navigation Outside `:4001`
- **Limitation**: If a user in Interact mode follows an external link navigating the iframe to an external origin (e.g. `https://github.com`), the browser Same-Origin Policy blocks `postMessage` handlers and probe script execution.
- **Impact**: The host displays `"Couldn't connect to this preview"` overlay once the 10-second connection timeout expires.

### 3. CSS 3D Transforms & Matrix Skewing
- **Limitation**: Element bounding boxes are serialized using `getBoundingClientRect()`, which returns 2D axis-aligned bounding rectangles $(x, y, w, h)$.
- **Impact**: Elements styled with 3D CSS transforms (`transform: rotateY(45deg) translateZ(100px)`) render 2D bounding boxes on the host canvas overlay, creating visual offset between skewed element edges and the rectangular selection box.

### 4. Ultra-High DOM Node Churn (>50,000 nodes/second)
- **Limitation**: Pages generating thousands of DOM node mutations per second saturate postMessage serialization queues.
- **Impact**: Hover overlay positioning may lag by 1-2 animation frames during mass DOM replacement on un-keyed trees.

---

## 6. 15-Minute Loom Video Script & Presentation Outline

This presentation script guides the 15-minute video evaluation, covering design rationale, feature walkthroughs, edge cases, and AI usage.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 15-MINUTE PRESENTATION TIMELINE                                                  │
├─────────────┬────────────────────────────────────────────────────────────────────┤
│ 0:00 - 2:00 │ SECTION 1: System Overview & Architecture                          │
├─────────────┼────────────────────────────────────────────────────────────────────┤
│ 2:00 - 10:00│ SECTION 2: Walkthrough of Requirements R1 - R6                     │
├─────────────┼────────────────────────────────────────────────────────────────────┤
│ 10:00- 13:00│ SECTION 3: "Where This Breaks" & System Design Deep-Dive           │
├─────────────┼────────────────────────────────────────────────────────────────────┤
│ 13:00- 15:00│ SECTION 4: AI Workflow, Prompt Engineering & Reflection            │
└─────────────┴────────────────────────────────────────────────────────────────────┘
```

### Section 1: Overview & Architecture (2:00)
- **[0:00 - 0:45] Project Brief & Core Problem**:
  - *"Hi, I'm presenting Figr — a multi-screen canvas and live inspector for cross-origin web pages. The central challenge is building a host viewer that renders 24 live iframe previews, drawing 1px hover and 2px selection overlays on top of cross-origin pages while keeping a 2-way synchronized layers tree and inspector updated in real time."*
- **[0:45 - 2:00] Architecture & Tech Stack**:
  - Show single-command launch (`npm start`).
  - Explain Host-Guest architecture: Vite + React 19 + Redux Toolkit on host (`:5173`) talking to injected Guest Probe SDK (`probe.js`) inside preview pages (`:4001`) via typed `postMessage` IPC protocol.

### Section 2: Requirements Walkthrough R1 – R6 (8:00)
- **[2:00 - 3:30] R1 (Board Canvas) & R2 (Hover Overlay)**:
  - Demonstrate 2D canvas pan (drag and wheel) and pointer-centered zoom (25% to 400%). Show **Fit Grid** (35%) vs **100%** mode.
  - Switch between **Select Mode (V)** and **Interact Mode (I)**. Show capture-phase event suppression: buttons don't click and inputs don't focus in Select mode.
  - Hover over buttons, disabled inputs, SVGs, and header elements. Show 1px cyan outline and auto-flipping label. Demonstrate hover clearing on pan/zoom.
- **[3:30 - 5:00] R3 (Selection & Dynamic DOM Reconciliation)**:
  - Click to select element (2px indigo box). Show **Shift + click** multi-selection within same preview and across previews.
  - Test keyboard navigation: **Enter** (child), **Shift + Enter** (parent), **Tab / Shift + Tab** (siblings), **Escape** (clear). Show keyboard events working seamlessly even after clicking inside an iframe.
  - **Screen 4 Live Demo**: Open Screen 4 (prepends items every 2s). Select an item ("Linus") and show selection box staying glued to the node reference across prepends and relative time string updates ("2s ago" $\rightarrow$ "6s ago").
- **[5:00 - 6:30] R4 (Layers Panel Hierarchy & Deep Search)**:
  - Show active preview tree. Demonstrate lazy child loading with inline 3s timeout handling. Show horizontal scrolling on **Screen 5** (30-level deep nesting).
  - Demonstrate 2-way hover and selection sync: selecting on canvas expands ancestor tree; clicking tree row scrolls element into preview view.
  - Press `⌘K` to open deep search across unrendered tree branches. Type query; show single match result auto-selecting when pressing `Enter`.
- **[6:30 - 7:30] R5 (Inspector Live & API Details)**:
  - Select single element: inspect Live computed styles (color swatches, dimensions, position) and async Details metadata from `GET /elements/:key`. Show 404 handled gracefully as info card `"No details for this element"`.
  - Multi-select N elements: show Live fields rendering aggregated `"Mixed"` badge and Details section hidden.
- **[7:30 - 10:00] R6 (Failures & Fault Isolation)**:
  - Demonstrate region error boundaries (`board`, `preview`, `layers`, `inspector`, `details`).
  - Open **Dev Failures Menu** from TopNavbar:
    1. Trigger **Board API Fail** $\rightarrow$ shows board error card with Retry button.
    2. Trigger **Preview Connection Timeout** $\rightarrow$ shows `"Couldn't connect to this preview"` on single frame only.
    3. Trigger **Page Error Badge** $\rightarrow$ shows red `"Page error"` badge with tooltip on iframe header.
    4. Trigger **Details API Fail** $\rightarrow$ shows error card in Details section while Live styles remain functional.
  - Confirm `report()` logged every failure incident **exactly once**.

### Section 3: "Where This Breaks" & Trade-offs (3:00)
- **[10:00 - 11:30] Architectural Deep-Dive on Edge Cases**:
  - Explain Shadow DOM encapsulation: closed shadow roots hide internal node geometry.
  - Explain cross-origin navigation outside `:4001`: navigating to third-party domains triggers 10s connection timeout overlay due to browser Same-Origin Policy.
  - Explain 3D CSS matrices vs 2D axis-aligned bounding rectangles.
- **[11:30 - 13:00] System Design & Trade-offs**:
  - Why Redux Toolkit was chosen over Zustand for state machine auditability.
  - Why DOM node object identity (`activeSelectedNodes` map) was used over raw CSS index paths to solve Screen 4 dynamic prepends.

### Section 4: AI Usage, Reflection & Lessons Learned (2:00)
- **[13:00 - 14:15] Where AI Accelerated Development**:
  - Rapid scaffolding of Redux slices, IPC message catalog, and CSS layout.
  - Drafting initial error boundary structures and UI design system integration.
- **[14:15 - 15:00] Where Human SD3 Intervention Was Required**:
  - Fixing Screen 4 dynamic selection jumping: AI initially suggested raw CSS index path selectors which failed when siblings were prepended. Human engineering introduced `activeSelectedNodes` map and text prefix matching.
  - Multi-row highlight bug: AI simplified path generation to root `[data-key]`, breaking child selector uniqueness. Human engineering restored scoped relative child paths (`[data-key="X"] > span:nth-of-type(2) > b`).
  - Video wrap-up and submission details.

---

## 7. Deliverables & Submission Summary

| Deliverable | Status | Verification Link / Command |
| :--- | :--- | :--- |
| **GitHub Repository** | Complete | Public repo on `origin/main` (`npm start` single-command ready) |
| **Comprehensive README** | Complete | [README.md](file:///Users/parjanya-heaven/Desktop/frontend-engineer-assignment/README.md) |
| **Loom Video Script** | Complete | Section 6 above (15-minute presentation script) |
| **Live Interaction Log** | Complete | `live.md` (gitignored, tracked through Interaction 41) |

Submitted to: [https://join.figr.design/r/kdqVkj](https://join.figr.design/r/kdqVkj)

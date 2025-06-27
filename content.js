// SnapMeasure Overlay System

console.log("SnapMeasure content script loaded!");

// --- UI Overlay and Canvas Setup ---
let overlayRoot = null;
const ui = {};

function createUI() {
    if (overlayRoot) {
        console.log('SnapMeasure: overlayRoot already exists');
        overlayRoot.style.display = 'block'; // Ensure visible
        overlayRoot.style.border = '2px dashed #00bfae'; // Debug border
        return; // Already created
    }
    console.log('SnapMeasure: createUI called');
    overlayRoot = document.createElement('div');
    overlayRoot.id = 'snapmeasure-overlay-root';
    overlayRoot.style.position = 'fixed';
    overlayRoot.style.top = '0';
    overlayRoot.style.left = '0';
    overlayRoot.style.width = '100vw';
    overlayRoot.style.height = '100vh';
    overlayRoot.style.pointerEvents = 'none';
    overlayRoot.style.zIndex = '2147483647';
    overlayRoot.style.display = 'block';
    overlayRoot.style.border = '2px dashed #00bfae'; // Debug border

    // Visual indicator badge
    const badge = document.createElement('div');
    badge.textContent = 'SnapMeasure Active';
    badge.className = 'snapmeasure-badge';
    badge.style.position = 'absolute';
    badge.style.top = '16px';
    badge.style.right = '24px';
    badge.style.background = 'rgba(44, 62, 80, 0.95)';
    badge.style.color = '#fff';
    badge.style.fontSize = '13px';
    badge.style.fontWeight = 'bold';
    badge.style.padding = '6px 14px';
    badge.style.borderRadius = '8px';
    badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
    badge.style.pointerEvents = 'auto';
    badge.style.zIndex = '2147483648';
    badge.title = 'Click: Select & measure\n⌥ Option+Click: Free point\n⌘ Command+Click: Multi-select (Pro)';
    overlayRoot.appendChild(badge);

    // Grid Canvas
    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = window.innerWidth;
    gridCanvas.height = window.innerHeight;
    gridCanvas.style.position = 'absolute';
    gridCanvas.style.top = '0';
    gridCanvas.style.left = '0';
    gridCanvas.style.width = '100vw';
    gridCanvas.style.height = '100vh';
    gridCanvas.style.pointerEvents = 'none';
    overlayRoot.appendChild(gridCanvas);
    ui.gridCanvas = gridCanvas;
    ui.gridCtx = gridCanvas.getContext('2d');

    // Baseline Canvas
    const baselineCanvas = document.createElement('canvas');
    baselineCanvas.width = window.innerWidth;
    baselineCanvas.height = window.innerHeight;
    baselineCanvas.style.position = 'absolute';
    baselineCanvas.style.top = '0';
    baselineCanvas.style.left = '0';
    baselineCanvas.style.width = '100vw';
    baselineCanvas.style.height = '100vh';
    baselineCanvas.style.pointerEvents = 'none';
    overlayRoot.appendChild(baselineCanvas);
    ui.baselineCanvas = baselineCanvas;
    ui.baselineCtx = baselineCanvas.getContext('2d');

    // Screenshot Canvas
    const screenshotCanvas = document.createElement('canvas');
    screenshotCanvas.width = window.innerWidth;
    screenshotCanvas.height = window.innerHeight;
    screenshotCanvas.style.position = 'absolute';
    screenshotCanvas.style.top = '0';
    screenshotCanvas.style.left = '0';
    screenshotCanvas.style.width = '100vw';
    screenshotCanvas.style.height = '100vh';
    screenshotCanvas.style.pointerEvents = 'none';
    overlayRoot.appendChild(screenshotCanvas);
    ui.screenshotCanvas = screenshotCanvas;
    ui.screenshotCtx = screenshotCanvas.getContext('2d');

    // Guides/Measurement Canvas
    const measureCanvas = document.createElement('canvas');
    measureCanvas.width = window.innerWidth;
    measureCanvas.height = window.innerHeight;
    measureCanvas.style.position = 'absolute';
    measureCanvas.style.top = '0';
    measureCanvas.style.left = '0';
    measureCanvas.style.width = '100vw';
    measureCanvas.style.height = '100vh';
    measureCanvas.style.pointerEvents = 'auto';
    overlayRoot.appendChild(measureCanvas);
    ui.measureCanvas = measureCanvas;
    ui.measureCtx = measureCanvas.getContext('2d');

    document.body.appendChild(overlayRoot);
    if (!document.body.contains(overlayRoot)) {
        console.error('SnapMeasure: overlayRoot was not appended to the DOM!');
    } else {
        console.log('SnapMeasure: overlayRoot appended to DOM');
    }
    injectSnapMeasureStyles(); // Always inject styles
}

function destroyUI() {
    if (overlayRoot && overlayRoot.parentNode) {
        console.log('destroyUI called');
        overlayRoot.parentNode.removeChild(overlayRoot);
        overlayRoot = null;
    }
}

// --- Measurement Drawing Functions ---
// Free Feature: Grid
function drawGrid() {
    const ctx = ui.gridCtx;
    ctx.clearRect(0, 0, ui.gridCanvas.width, ui.gridCanvas.height);
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    const step = 8; // 8px grid
    for (let x = 0; x < ui.gridCanvas.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ui.gridCanvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < ui.gridCanvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(ui.gridCanvas.width, y);
        ctx.stroke();
    }
}

// Pro Feature: Baseline Grid
function drawBaselineGrid() {
    const ctx = ui.baselineCtx;
    ctx.clearRect(0, 0, ui.baselineCanvas.width, ui.baselineCanvas.height);
    if (!settings.showBaselineGrid || !settings.isProUser) return;
    ctx.strokeStyle = 'rgba(255,0,0,0.2)';
    ctx.lineWidth = 1;
    const step = 4; // 4px baseline
    for (let y = 0; y < ui.baselineCanvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(ui.baselineCanvas.width, y);
        ctx.stroke();
    }
}

// --- Screenshot Overlay Image Size & Aspect Ratio ---
let screenshotImageSize = null;

// Listen for storage changes to screenshotData and screenshotImageSize
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.screenshotImageSize) {
            screenshotImageSize = changes.screenshotImageSize.newValue;
            drawScreenshot();
        }
    }
});

// When a screenshot is uploaded, save its natural size
function handleScreenshotUpload(dataUrl) {
    const img = new window.Image();
    img.onload = function() {
        chrome.storage.local.set({
            screenshotImageSize: { width: img.naturalWidth, height: img.naturalHeight },
            screenshotData: dataUrl
        });
    };
    img.src = dataUrl;
}

// Draw screenshot overlay with correct aspect ratio and size
function drawScreenshot() {
    const ctx = ui.screenshotCtx;
    ctx.clearRect(0, 0, ui.screenshotCanvas.width, ui.screenshotCanvas.height);
    if (!settings.screenshotData || !settings.isProUser) return;
    if (!screenshotImageSize) {
        // Try to load from storage
        chrome.storage.local.get(['screenshotImageSize'], (result) => {
            screenshotImageSize = result.screenshotImageSize || null;
            drawScreenshot();
        });
        return;
    }
    const img = new window.Image();
    img.onload = function() {
        // Calculate size to fit overlay, maintaining aspect ratio
        const maxW = ui.screenshotCanvas.width * 0.9;
        const maxH = ui.screenshotCanvas.height * 0.9;
        let w = screenshotImageSize.width, h = screenshotImageSize.height;
        const aspect = w / h;
        if (w > maxW) { w = maxW; h = w / aspect; }
        if (h > maxH) { h = maxH; w = h * aspect; }
        const x = (ui.screenshotCanvas.width - w) / 2;
        const y = (ui.screenshotCanvas.height - h) / 2;
        ctx.globalAlpha = settings.screenshotOpacity || 0.5;
        ctx.drawImage(img, x, y, w, h);
        ctx.globalAlpha = 1.0;
    };
    img.src = settings.screenshotData;
}

// Redraw overlay on window resize
window.addEventListener('resize', () => {
    if (ui.screenshotCanvas) drawScreenshot();
});

// Pro Feature: Guides
function drawGuides() {
    if (!ui.measureCtx) {
        console.error('SnapMeasure: ui.measureCtx is undefined in drawGuides');
        return;
    }
    console.log('SnapMeasure: drawGuides called');
    ui.measureCtx.clearRect(0, 0, ui.measureCanvas.width, ui.measureCanvas.height);
    // Hover highlight
    if (hoverElement) {
        drawElementBox(hoverElement, '#bdbdbd');
        if (hoverSnapPoint) drawSnapIndicator(hoverSnapPoint);
    }
    // Selected elements
    if (selectedElementA) drawElementBox(selectedElementA, '#007bff');
    if (selectedElementB) drawElementBox(selectedElementB, '#00bfae');
    // Distance
    if (selectedElementA && selectedElementB) {
        drawDistanceBetweenRects(selectedElementA.getBoundingClientRect(), selectedElementB.getBoundingClientRect());
    }
    // Free point-to-point
    if (freePointA && freePointB) {
        drawFreePointLine();
    }
    // Multi-select
    if (multiSelect.length > 1) {
        drawBoundingBox(multiSelect);
        drawDistancesForMulti(multiSelect);
    }
}

function drawLockedMeasurements() {
    // For demo: do nothing
}

function getHoveredGuide() {
    // For demo: always return false
    return false;
}

// --- Inspector Logic ---
let settings = {
    isProUser: false,
    showGrid: false,
    showBaselineGrid: false,
    showGuides: false,
    screenshotData: null,
    screenshotOpacity: 0.5,
};

let freeSelectionEnabled = false;
let multiDistanceEnabled = false;
let autoCopyEnabled = false;

// Listen for storage changes to freeSelectionEnabled, multiDistanceEnabled, and autoCopyEnabled
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.freeSelectionEnabled) {
            freeSelectionEnabled = changes.freeSelectionEnabled.newValue;
        }
        if (changes.multiDistanceEnabled) {
            multiDistanceEnabled = changes.multiDistanceEnabled.newValue;
        }
        if ('autoCopyEnabled' in changes) autoCopyEnabled = changes.autoCopyEnabled.newValue;
    }
});

// --- Robust storage change handling ---
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if ('showGrid' in changes) settings.showGrid = changes.showGrid.newValue;
        if ('showBaselineGrid' in changes) settings.showBaselineGrid = changes.showBaselineGrid.newValue;
        if ('showGuides' in changes) settings.showGuides = changes.showGuides.newValue;
        if ('freeSelectionEnabled' in changes) freeSelectionEnabled = changes.freeSelectionEnabled.newValue;
        if ('multiDistanceEnabled' in changes) multiDistanceEnabled = changes.multiDistanceEnabled.newValue;
        if ('autoCopyEnabled' in changes) autoCopyEnabled = changes.autoCopyEnabled.newValue;
        drawGrid();
        drawBaselineGrid();
        drawScreenshot();
        if (window.inspector && window.inspector.isActive) scheduleDrawGuides();
    }
});

if (typeof window.snapMeasureInitialized === 'undefined') {
    window.snapMeasureInitialized = true;
    console.log('SnapMeasure: Initializing inspector logic');

    const inspector = (function() {
        let isActive = false;

        function loadSettings() {
            chrome.storage.local.get(null, (result) => {
                settings.isProUser = result.isProUser || false;
                settings.showGrid = typeof result.showGrid !== 'undefined' ? result.showGrid : true;
                settings.showBaselineGrid = result.showBaselineGrid || false;
                settings.showGuides = result.showGuides || false;
                settings.screenshotData = result.screenshotData || null;
                settings.screenshotOpacity = result.screenshotOpacity || 0.5;
                freeSelectionEnabled = typeof result.freeSelectionEnabled !== 'undefined' ? result.freeSelectionEnabled : true;
                multiDistanceEnabled = typeof result.multiDistanceEnabled !== 'undefined' ? result.multiDistanceEnabled : true;
                autoCopyEnabled = typeof result.autoCopyEnabled !== 'undefined' ? result.autoCopyEnabled : false;
                drawGrid();
                drawBaselineGrid();
                drawScreenshot();
                if (window.inspector && window.inspector.isActive) {
                    scheduleDrawGuides();
                }
                console.log('SnapMeasure: Settings loaded', settings, {freeSelectionEnabled, multiDistanceEnabled, autoCopyEnabled});
            });
        }

        function removeAllOverlayElements() {
            // Remove badge, history panel, and any other overlay DOM elements
            if (overlayRoot && overlayRoot.parentNode) {
                overlayRoot.parentNode.removeChild(overlayRoot);
                overlayRoot = null;
            }
            let panel = document.getElementById('snapmeasure-history-panel');
            if (panel) panel.remove();
            // Remove injected style
            const style = document.getElementById('snapmeasure-style');
            if (style) style.remove();
        }

        function removeAllEventListeners() {
            if (ui.measureCanvas) {
                ui.measureCanvas.removeEventListener('click', onCanvasClick);
                ui.measureCanvas.removeEventListener('mousemove', onCanvasMouseMove);
                ui.measureCanvas.style.cursor = 'default';
            }
            if (overlayRoot) {
                overlayRoot.removeEventListener('dblclick', onOverlayDblClick);
                overlayRoot.removeEventListener('mousedown', onOverlayMouseDown);
                overlayRoot.removeEventListener('mousemove', onOverlayMouseMove);
                overlayRoot.removeEventListener('mouseup', onOverlayMouseUp);
                overlayRoot.removeEventListener('dblclick', onOverlayGuideDblClick);
            }
            document.removeEventListener('mousemove', globalMousemoveHandler);
        }

        // Wrap global keydown/mousemove for easy removal
        function globalMousemoveHandler(e) { window.lastMouseX = e.clientX; window.lastMouseY = e.clientY; }

        function activate() {
            console.log('SnapMeasure: activate called');
            if (isActive) {
                if (!overlayRoot || !document.body.contains(overlayRoot)) {
                    console.warn('SnapMeasure: overlayRoot missing, recreating');
                    destroyUI();
                    createUI();
                }
                overlayRoot.style.display = 'block';
                overlayRoot.style.border = '2px dashed #00bfae';
                injectSnapMeasureStyles();
                return;
            }
            isActive = true;
            console.log('Inspector activated');
            removeAllEventListeners();
            removeAllOverlayElements();
            destroyUI();
            createUI();
            injectSnapMeasureStyles();
            loadSettings();
            chrome.storage.onChanged.addListener(storageChangeHandler);
            // Attach event listeners
            if (ui.measureCanvas) {
                ui.measureCanvas.addEventListener('click', onCanvasClick);
                ui.measureCanvas.addEventListener('mousemove', onCanvasMouseMove);
                ui.measureCanvas.style.cursor = 'crosshair';
            }
            if (overlayRoot) {
                overlayRoot.addEventListener('dblclick', onOverlayDblClick);
                overlayRoot.addEventListener('mousedown', onOverlayMouseDown);
                overlayRoot.addEventListener('mousemove', onOverlayMouseMove);
                overlayRoot.addEventListener('mouseup', onOverlayMouseUp);
                overlayRoot.addEventListener('dblclick', onOverlayGuideDblClick);
            }
            document.addEventListener('mousemove', globalMousemoveHandler);
            updateBadgeTooltip();
            addCopyButtonToBadge();
            addExportButtonToBadge();
            if (isActive) scheduleDrawGuides();
        }

        function deactivate() {
            if (!isActive) return;
            isActive = false;
            console.log('Inspector deactivated');
            removeAllEventListeners();
            removeAllOverlayElements();
            destroyUI();
            chrome.storage.onChanged.removeListener(storageChangeHandler);
            if (overlayRoot) overlayRoot.style.display = 'none';
            // Reset all state
            hoverElement = null;
            hoverSnapPoint = null;
            selectedElementA = null;
            selectedElementB = null;
            freePointA = null;
            freePointB = null;
            freeMode = false;
            multiSelect = [];
            lastMeasurement = '';
            guides = [];
            draggingGuide = null;
            dragOffset = 0;
            measurementHistory = [];
        }

        function storageChangeHandler(changes, namespace) {
            if (namespace === 'local') {
                if (changes.isProUser) settings.isProUser = changes.isProUser.newValue;
                if (changes.showGrid) settings.showGrid = changes.showGrid.newValue;
                if (changes.showBaselineGrid) settings.showBaselineGrid = changes.showBaselineGrid.newValue;
                if (changes.showGuides) settings.showGuides = changes.showGuides.newValue;
                if (changes.screenshotData) settings.screenshotData = changes.screenshotData.newValue;
                if (changes.screenshotOpacity) settings.screenshotOpacity = changes.screenshotOpacity.newValue;
                if (changes.freeSelectionEnabled) freeSelectionEnabled = changes.freeSelectionEnabled.newValue;
                if (changes.multiDistanceEnabled) multiDistanceEnabled = changes.multiDistanceEnabled.newValue;
                if ('autoCopyEnabled' in changes) autoCopyEnabled = changes.autoCopyEnabled.newValue;
                drawGrid();
                drawBaselineGrid();
                drawScreenshot();
                if (isActive) scheduleDrawGuides();
            }
        }

        // Expose for global use
        return {
            activate,
            deactivate,
            get isActive() { return isActive; }
        };
    })();
    window.inspector = inspector;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('SnapMeasure: onMessage', request);
    if (request.action === 'toggleInspector') {
        if (window.snapMeasureInitialized && window.inspector) {
            if (window.inspector.isActive) {
                window.inspector.deactivate();
            } else {
                window.inspector.activate();
            }
            sendResponse({ isActive: window.inspector.isActive });
        }
    } else if (request.action === 'getInspectorState') {
        sendResponse({ isActive: window.inspector && window.inspector.isActive });
    } else if (request.action === 'fallbackCopyToClipboard') {
        // Try Clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(request.text).then(() => {
                sendResponse({ ok: true });
            }).catch(err => {
                // Fallback to execCommand
                const textarea = document.createElement('textarea');
                textarea.value = request.text;
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand('copy');
                    sendResponse({ ok: true });
                } catch (e) {
                    sendResponse({ ok: false, error: e.message });
                }
                document.body.removeChild(textarea);
            });
            return true;
        } else {
            // Fallback to execCommand
            const textarea = document.createElement('textarea');
            textarea.value = request.text;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                sendResponse({ ok: true });
            } catch (e) {
                sendResponse({ ok: false, error: e.message });
            }
            document.body.removeChild(textarea);
        }
    }
});

// --- Inspector Selection Logic ---
let hoverElement = null;
let hoverSnapPoint = null;
let selectedElementA = null;
let selectedElementB = null;
let freePointA = null;
let freePointB = null;
let freeMode = false;
let multiSelect = [];
let selectionHistory = [];
let redoStack = [];

// --- Keyboard Nudge & Navigation ---
function nudgePoint(pt, dx, dy) {
    if (!pt) return;
    pt.x += dx;
    pt.y += dy;
}

document.addEventListener('keydown', (e) => {
    if (!window.inspector || !window.inspector.isActive) return;
    // Nudge last free point
    if (freeMode && (freePointB || freePointA)) {
        let pt = freePointB || freePointA;
        let step = e.shiftKey ? 10 : 1;
        if (e.key === 'ArrowLeft') nudgePoint(pt, -step, 0);
        if (e.key === 'ArrowRight') nudgePoint(pt, step, 0);
        if (e.key === 'ArrowUp') nudgePoint(pt, 0, -step);
        if (e.key === 'ArrowDown') nudgePoint(pt, 0, step);
        scheduleDrawGuides();
        e.preventDefault();
    }
    // Undo/Redo
    if (e.metaKey && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) redoSelection();
        else undoSelection();
        e.preventDefault();
    }
    // Tab navigation
    if (e.key === 'Tab') {
        cycleHoverElement(e.shiftKey ? -1 : 1);
        scheduleDrawGuides();
        e.preventDefault();
    }
});

function cycleHoverElement(dir) {
    // Find all elements under cursor
    overlayRoot.style.pointerEvents = 'none';
    const elements = document.elementsFromPoint(window.lastMouseX || 0, window.lastMouseY || 0)
        .filter(el => el !== overlayRoot && !overlayRoot.contains(el));
    overlayRoot.style.pointerEvents = 'auto';
    if (!elements.length) return;
    let idx = elements.indexOf(hoverElement);
    idx = (idx + dir + elements.length) % elements.length;
    hoverElement = elements[idx];
}

document.addEventListener('mousemove', (e) => {
    window.lastMouseX = e.clientX;
    window.lastMouseY = e.clientY;
});

// --- Undo/Redo ---
function saveSelectionState() {
    selectionHistory.push({
        selectedElementA,
        selectedElementB,
        freePointA: freePointA && { ...freePointA },
        freePointB: freePointB && { ...freePointB },
        multiSelect: [...multiSelect],
        freeMode
    });
    if (selectionHistory.length > 50) selectionHistory.shift();
    redoStack = [];
}
function undoSelection() {
    if (selectionHistory.length < 2) return;
    redoStack.push(selectionHistory.pop());
    const state = selectionHistory[selectionHistory.length - 1];
    restoreSelectionState(state);
}
function redoSelection() {
    if (!redoStack.length) return;
    const state = redoStack.pop();
    selectionHistory.push(state);
    restoreSelectionState(state);
}
function restoreSelectionState(state) {
    selectedElementA = state.selectedElementA;
    selectedElementB = state.selectedElementB;
    freePointA = state.freePointA && { ...state.freePointA };
    freePointB = state.freePointB && { ...state.freePointB };
    multiSelect = [...state.multiSelect];
    freeMode = state.freeMode;
    scheduleDrawGuides();
}

// --- Smart Label Placement ---
function smartLabelPos(x, y, w, h) {
    // Try above, then below, then right, then left
    const margin = 8;
    const labelW = w, labelH = h;
    if (y - labelH - margin > 0) return { x: x, y: y - labelH - margin };
    if (y + labelH + margin < window.innerHeight) return { x: x, y: y + margin };
    if (x + labelW + margin < window.innerWidth) return { x: x + margin, y: y };
    if (x - labelW - margin > 0) return { x: x - labelW - margin, y: y };
    return { x: Math.max(0, Math.min(x, window.innerWidth - labelW)), y: Math.max(0, Math.min(y, window.innerHeight - labelH)) };
}

// Patch drawElementBox to use smart label placement
const _drawElementBox = drawElementBox;
drawElementBox = function(el, color = '#007bff') {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ctx = ui.measureCtx;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);
    ctx.setLineDash([]);
    // Draw label smartly
    const label = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
    ctx.font = 'bold 13px sans-serif';
    const labelW = ctx.measureText(label).width + 16;
    const labelH = 20;
    const pos = smartLabelPos(rect.left, rect.top, labelW, labelH);
    ctx.fillStyle = color;
    ctx.fillRect(pos.x, pos.y, labelW, labelH);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, pos.x + 8, pos.y + 12);
    ctx.restore();
};

// Save selection state on every click
const _onCanvasClick = onCanvasClick;
onCanvasClick = function(e) {
    console.log('SnapMeasure: onCanvasClick', e.clientX, e.clientY, e.altKey, e.metaKey, {freeSelectionEnabled, multiDistanceEnabled});
    saveSelectionState();
    _onCanvasClick(e);
    if (lastMeasurement && autoCopyEnabled) {
        chrome.runtime.sendMessage({ action: 'copyToClipboard', text: lastMeasurement });
    }
};

// Save initial state
saveSelectionState();

function updateBadgeTooltip() {
    const badge = overlayRoot && overlayRoot.querySelector('.snapmeasure-badge');
    if (badge) {
        badge.title = 'Click: Select & measure\n⌥ Option+Click: Free point\n⌘ Command+Click: Multi-select (Pro)';
    }
}

function getElementAtPoint(x, y) {
    overlayRoot.style.pointerEvents = 'none';
    const el = document.elementFromPoint(x, y);
    overlayRoot.style.pointerEvents = 'auto';
    if (!el || el === overlayRoot || overlayRoot.contains(el)) return null;
    return el;
}

function getSnapPoint(rect, x, y) {
    // Snap to nearest edge or corner
    const points = [
        { x: rect.left, y: rect.top }, // TL
        { x: rect.right, y: rect.top }, // TR
        { x: rect.left, y: rect.bottom }, // BL
        { x: rect.right, y: rect.bottom }, // BR
        { x: rect.left + rect.width / 2, y: rect.top }, // Top center
        { x: rect.left + rect.width / 2, y: rect.bottom }, // Bottom center
        { x: rect.left, y: rect.top + rect.height / 2 }, // Left center
        { x: rect.right, y: rect.top + rect.height / 2 }, // Right center
        { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, // Center
    ];
    let minDist = Infinity, snap = null;
    for (const pt of points) {
        const d = Math.hypot(pt.x - x, pt.y - y);
        if (d < minDist) {
            minDist = d;
            snap = pt;
        }
    }
    return snap;
}

function drawSnapIndicator(pt) {
    if (!pt) return;
    const ctx = ui.measureCtx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ff0050';
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.restore();
}

function drawElementBox(el, color = '#007bff') {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ctx = ui.measureCtx;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);
    ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);
    ctx.setLineDash([]);
    // Draw label
    const label = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = color;
    ctx.fillRect(rect.left, rect.top - 22, ctx.measureText(label).width + 16, 20);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, rect.left + 8, rect.top - 8);
    ctx.restore();
}

function drawBoundingBox(elements) {
    if (!elements.length) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of elements) {
        const r = el.getBoundingClientRect();
        minX = Math.min(minX, r.left);
        minY = Math.min(minY, r.top);
        maxX = Math.max(maxX, r.right);
        maxY = Math.max(maxY, r.bottom);
    }
    const ctx = ui.measureCtx;
    ctx.save();
    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
    ctx.setLineDash([]);
    ctx.restore();
}

function drawDistancesForMulti(elements) {
    if (elements.length < 2) return;
    const ctx = ui.measureCtx;
    ctx.save();
    ctx.strokeStyle = '#00bfae';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < elements.length; ++i) {
        for (let j = i + 1; j < elements.length; ++j) {
            const a = elements[i].getBoundingClientRect();
            const b = elements[j].getBoundingClientRect();
            const x1 = a.left + a.width / 2, y1 = a.top + a.height / 2;
            const x2 = b.left + b.width / 2, y2 = b.top + b.height / 2;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            // Label
            const dist = Math.round(Math.hypot(x2 - x1, y2 - y1));
            const label = `${dist}px`;
            ctx.font = 'bold 12px sans-serif';
            ctx.fillStyle = '#00bfae';
            ctx.fillRect((x1 + x2) / 2 - 18, (y1 + y2) / 2 - 18, ctx.measureText(label).width + 12, 16);
            ctx.fillStyle = '#fff';
            ctx.fillText(label, (x1 + x2) / 2 - 10, (y1 + y2) / 2 - 6);
        }
    }
    ctx.restore();
}

function drawDistanceBetweenRects(rectA, rectB) {
    const ctx = ui.measureCtx;
    // Horizontal distance (left to right)
    const x1 = rectA.right;
    const x2 = rectB.left;
    const y = Math.max(rectA.top, rectB.top);
    ctx.save();
    ctx.strokeStyle = '#ff0050';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
    // Label
    const distX = Math.abs(x2 - x1);
    const labelX = `${distX}px`;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#ff0050';
    ctx.fillRect((x1 + x2) / 2 - 20, y - 22, ctx.measureText(labelX).width + 16, 20);
    ctx.fillStyle = '#fff';
    ctx.fillText(labelX, (x1 + x2) / 2 - 12, y - 8);
    // Vertical distance (bottom to top)
    const y1 = rectA.bottom;
    const y2 = rectB.top;
    const x = Math.max(rectA.left, rectB.left);
    ctx.strokeStyle = '#00bfae';
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
    ctx.stroke();
    // Label
    const distY = Math.abs(y2 - y1);
    const labelY = `${distY}px`;
    ctx.fillStyle = '#00bfae';
    ctx.fillRect(x - 20, (y1 + y2) / 2 - 22, ctx.measureText(labelY).width + 16, 20);
    ctx.fillStyle = '#fff';
    ctx.fillText(labelY, x - 12, (y1 + y2) / 2 - 8);
    ctx.restore();
}

function drawFreePointLine() {
    if (!freePointA || !freePointB) return;
    const ctx = ui.measureCtx;
    ctx.save();
    ctx.strokeStyle = '#ff0050';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(freePointA.x, freePointA.y);
    ctx.lineTo(freePointB.x, freePointB.y);
    ctx.stroke();
    // Label
    const dist = Math.round(Math.hypot(freePointB.x - freePointA.x, freePointB.y - freePointA.y));
    const label = `${dist}px`;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#ff0050';
    ctx.fillRect((freePointA.x + freePointB.x) / 2 - 20, (freePointA.y + freePointB.y) / 2 - 22, ctx.measureText(label).width + 16, 20);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, (freePointA.x + freePointB.x) / 2 - 12, (freePointA.y + freePointB.y) / 2 - 8);
    ctx.restore();
}

let lastMeasurement = '';

function onCanvasClick(e) {
    console.log('SnapMeasure: onCanvasClick', e.clientX, e.clientY, e.altKey, e.metaKey, {freeSelectionEnabled, multiDistanceEnabled});
    if (freeSelectionEnabled && e.altKey) {
        // Free point-to-point mode
        freeMode = true;
        if (!freePointA) {
            freePointA = { x: e.clientX, y: e.clientY };
            freePointB = null;
        } else if (!freePointB) {
            freePointB = { x: e.clientX, y: e.clientY };
            lastMeasurement = `${Math.round(Math.hypot(freePointB.x - freePointA.x, freePointB.y - freePointA.y))} px`;
        } else {
            freePointA = { x: e.clientX, y: e.clientY };
            freePointB = null;
        }
        selectedElementA = null;
        selectedElementB = null;
        multiSelect = [];
        scheduleDrawGuides();
        return;
    }
    if (multiDistanceEnabled && e.metaKey) {
        // Multi-select mode (now free)
        freeMode = false;
        freePointA = null;
        freePointB = null;
        const el = getElementAtPoint(e.clientX, e.clientY);
        if (el && !multiSelect.includes(el)) {
            multiSelect.push(el);
        }
        scheduleDrawGuides();
        return;
    }
    // Normal selection
    freeMode = false;
    freePointA = null;
    freePointB = null;
    multiSelect = [];
    if (!selectedElementA) {
        selectedElementA = getElementAtPoint(e.clientX, e.clientY);
        selectedElementB = null;
        if (selectedElementA) {
            const r = selectedElementA.getBoundingClientRect();
            lastMeasurement = `${Math.round(r.width)} × ${Math.round(r.height)} px`;
        }
    } else if (!selectedElementB) {
        selectedElementB = getElementAtPoint(e.clientX, e.clientY);
        if (selectedElementA && selectedElementB) {
            const a = selectedElementA.getBoundingClientRect();
            const b = selectedElementB.getBoundingClientRect();
            const dx = Math.abs(b.left - a.right);
            const dy = Math.abs(b.top - a.bottom);
            lastMeasurement = `Δx: ${dx}px, Δy: ${dy}px`;
        }
    } else {
        selectedElementA = getElementAtPoint(e.clientX, e.clientY);
        selectedElementB = null;
    }
    scheduleDrawGuides();
}

function onCanvasMouseMove(e) {
    console.log('SnapMeasure: onCanvasMouseMove', e.clientX, e.clientY);
    if (freeMode) return;
    hoverElement = getElementAtPoint(e.clientX, e.clientY);
    if (hoverElement) {
        const rect = hoverElement.getBoundingClientRect();
        hoverSnapPoint = getSnapPoint(rect, e.clientX, e.clientY);
    } else {
        hoverSnapPoint = null;
    }
    scheduleDrawGuides();
}

// --- Persistent Guides ---
let guides = [];
let draggingGuide = null;
let dragOffset = 0;

function addGuide(x, y, vertical) {
    guides.push({ x, y, vertical });
    scheduleDrawGuides();
}

function removeGuide(idx) {
    guides.splice(idx, 1);
    scheduleDrawGuides();
}

function onOverlayDblClick(e) {
    if (!window.inspector || !window.inspector.isActive) return;
    const rect = overlayRoot.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (e.shiftKey) {
        addGuide(x, 0, true); // vertical
    } else {
        addGuide(0, y, false); // horizontal
    }
}

function onOverlayMouseDown(e) {
    // Check if clicking near a guide
    const rect = overlayRoot.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (let i = 0; i < guides.length; ++i) {
        const g = guides[i];
        if (g.vertical && Math.abs(x - g.x) < 6) {
            draggingGuide = i;
            dragOffset = x - g.x;
            e.preventDefault();
            return;
        } else if (!g.vertical && Math.abs(y - g.y) < 6) {
            draggingGuide = i;
            dragOffset = y - g.y;
            e.preventDefault();
            return;
        }
    }
}

function onOverlayMouseMove(e) {
    if (draggingGuide === null) return;
    const rect = overlayRoot.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const g = guides[draggingGuide];
    if (g.vertical) {
        g.x = x - dragOffset;
    } else {
        g.y = y - dragOffset;
    }
    scheduleDrawGuides();
}

function onOverlayMouseUp(e) {
    draggingGuide = null;
}

function onOverlayGuideDblClick(e) {
    // Remove guide if double-clicked near it
    const rect = overlayRoot.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    for (let i = 0; i < guides.length; ++i) {
        const g = guides[i];
        if ((g.vertical && Math.abs(x - g.x) < 6) || (!g.vertical && Math.abs(y - g.y) < 6)) {
            removeGuide(i);
            e.preventDefault();
            return;
        }
    }
}

// --- Measurement History ---
let measurementHistory = [];
function addMeasurementHistory(entry) {
    measurementHistory.unshift(entry);
    if (measurementHistory.length > 5) measurementHistory.pop();
    updateMeasurementPanel();
}
function updateMeasurementPanel() {
    let panel = document.getElementById('snapmeasure-history-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'snapmeasure-history-panel';
        panel.style.position = 'fixed';
        panel.style.bottom = '24px';
        panel.style.right = '24px';
        panel.style.background = 'rgba(44,62,80,0.97)';
        panel.style.color = '#fff';
        panel.style.fontSize = '13px';
        panel.style.borderRadius = '8px';
        panel.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
        panel.style.padding = '10px 16px';
        panel.style.zIndex = '2147483649';
        document.body.appendChild(panel);
    }
    panel.innerHTML = '<b>Measurements</b><br>' + measurementHistory.map((m, i) => `<div class="history-item" data-idx="${i}" style="cursor:pointer;">${m}</div>`).join('');
    Array.from(panel.querySelectorAll('.history-item')).forEach(item => {
        item.onclick = () => {
            const idx = parseInt(item.getAttribute('data-idx'), 10);
            chrome.runtime.sendMessage({ action: 'copyToClipboard', text: measurementHistory[idx] }, (response) => {
                if (response && response.success) {
                    item.textContent = 'Copied!';
                    setTimeout(() => { item.textContent = measurementHistory[idx]; }, 1200);
                } else {
                    // Show error feedback
                }
            });
        };
    });
}

// --- Export as Image ---
function exportOverlayAsImage() {
    const w = window.innerWidth, h = window.innerHeight;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = w;
    exportCanvas.height = h;
    const ctx = exportCanvas.getContext('2d');
    // Draw all overlay canvases
    [ui.gridCanvas, ui.baselineCanvas, ui.screenshotCanvas, ui.measureCanvas].forEach(c => {
        ctx.drawImage(c, 0, 0);
    });
    // Draw guides
    ctx.save();
    ctx.strokeStyle = '#ffeb3b';
    ctx.lineWidth = 2;
    guides.forEach(g => {
        if (g.vertical) {
            ctx.beginPath();
            ctx.moveTo(g.x, 0);
            ctx.lineTo(g.x, h);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(0, g.y);
            ctx.lineTo(w, g.y);
            ctx.stroke();
        }
    });
    ctx.restore();
    // Download
    const url = exportCanvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'snapmeasure.png';
    a.click();
}

// Add export button to badge
function addExportButtonToBadge() {
    const badge = overlayRoot && overlayRoot.querySelector('.snapmeasure-badge');
    if (badge && !badge.querySelector('.export-btn')) {
        const btn = document.createElement('button');
        btn.textContent = 'Export';
        btn.className = 'export-btn';
        btn.style.marginLeft = '10px';
        btn.style.fontSize = '12px';
        btn.style.padding = '2px 8px';
        btn.style.border = 'none';
        btn.style.borderRadius = '4px';
        btn.style.background = '#fff';
        btn.style.color = '#333';
        btn.style.cursor = 'pointer';
        btn.onclick = exportOverlayAsImage;
        badge.appendChild(btn);
    }
}

// --- Inject CSS Variables and Styles ---
function injectSnapMeasureStyles() {
    if (document.getElementById('snapmeasure-style')) return;
    const style = document.createElement('style');
    style.id = 'snapmeasure-style';
    style.textContent = `
    :root {
      --snapmeasure-primary: #007bff;
      --snapmeasure-accent: #ff0050;
      --snapmeasure-bg: rgba(44,62,80,0.97);
      --snapmeasure-label-bg: rgba(44,62,80,0.92);
      --snapmeasure-label-shadow: 0 2px 8px rgba(0,0,0,0.18);
      --snapmeasure-radius: 12px;
      --snapmeasure-padding: 10px;
      --snapmeasure-margin: 24px;
      --snapmeasure-font: 'Inter', 'Segoe UI', Arial, sans-serif;
    }
    .snapmeasure-badge {
      position: fixed !important;
      top: var(--snapmeasure-margin);
      right: var(--snapmeasure-margin);
      background: var(--snapmeasure-bg);
      color: #fff;
      font-family: var(--snapmeasure-font);
      font-size: 14px;
      font-weight: 600;
      border-radius: var(--snapmeasure-radius);
      box-shadow: 0 4px 16px rgba(0,0,0,0.18);
      padding: 8px 18px 8px 16px;
      z-index: 2147483648;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: grab;
      user-select: none;
      transition: box-shadow 0.2s;
    }
    .snapmeasure-badge:active { cursor: grabbing; box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
    .snapmeasure-badge .icon-btn {
      background: none;
      border: none;
      padding: 0 6px;
      margin: 0 2px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: background 0.15s;
    }
    .snapmeasure-badge .icon-btn:focus { outline: 2px solid var(--snapmeasure-primary); }
    .snapmeasure-badge .icon-btn:hover { background: rgba(255,255,255,0.08); }
    .snapmeasure-label {
      background: var(--snapmeasure-label-bg);
      color: #fff;
      font-family: var(--snapmeasure-font);
      font-size: 13px;
      font-weight: 500;
      border-radius: 999px;
      box-shadow: var(--snapmeasure-label-shadow);
      padding: 4px 14px;
      margin: 0;
      display: inline-block;
      position: absolute;
      pointer-events: none;
      z-index: 2147483649;
      white-space: nowrap;
    }
    .snapmeasure-guide {
      position: absolute;
      background: #ffeb3b;
      opacity: 0.7;
      z-index: 2147483647;
      border-radius: 4px;
      transition: background 0.15s;
    }
    .snapmeasure-guide.dragging, .snapmeasure-guide:hover { background: #ffe600; opacity: 1; }
    .snapmeasure-guide-handle {
      width: 12px; height: 12px;
      background: #fffbe6;
      border: 2px solid #ffeb3b;
      border-radius: 50%;
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%,-50%);
      box-shadow: 0 1px 4px rgba(0,0,0,0.10);
      cursor: pointer;
    }
    #snapmeasure-history-panel {
      position: fixed;
      bottom: var(--snapmeasure-margin);
      right: var(--snapmeasure-margin);
      background: var(--snapmeasure-bg);
      color: #fff;
      font-family: var(--snapmeasure-font);
      font-size: 13px;
      border-radius: var(--snapmeasure-radius);
      box-shadow: 0 4px 16px rgba(0,0,0,0.18);
      padding: 14px 20px 10px 20px;
      z-index: 2147483649;
      min-width: 180px;
      max-width: 260px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      user-select: none;
    }
    #snapmeasure-history-panel .history-item {
      background: rgba(255,255,255,0.06);
      border-radius: 8px;
      padding: 5px 10px;
      margin: 0 0 2px 0;
      cursor: pointer;
      transition: background 0.15s;
    }
    #snapmeasure-history-panel .history-item:active, #snapmeasure-history-panel .history-item.copied {
      background: #00bfae;
      color: #fff;
      animation: copiedAnim 1.2s;
    }
    #snapmeasure-history-panel .clear-btn {
      align-self: flex-end;
      background: none;
      border: none;
      color: #ff0050;
      font-size: 12px;
      cursor: pointer;
      margin-top: 2px;
      padding: 2px 8px;
      border-radius: 6px;
      transition: background 0.15s;
    }
    #snapmeasure-history-panel .clear-btn:hover { background: rgba(255,0,80,0.08); }
    @keyframes copiedAnim { 0%{background:#00bfae;} 100%{background:rgba(255,255,255,0.06);} }
    `;
    document.head.appendChild(style);
}
// Call this at inspector activation
injectSnapMeasureStyles();

function addCopyButtonToBadge() {
    const badge = overlayRoot && overlayRoot.querySelector('.snapmeasure-badge');
    if (badge && !badge.querySelector('.copy-btn')) {
        const btn = document.createElement('button');
        btn.textContent = 'Copy';
        btn.className = 'copy-btn';
        btn.style.marginLeft = '10px';
        btn.style.fontSize = '12px';
        btn.style.padding = '2px 8px';
        btn.style.border = 'none';
        btn.style.borderRadius = '4px';
        btn.style.background = '#fff';
        btn.style.color = '#333';
        btn.style.cursor = 'pointer';
        btn.onclick = () => {
            chrome.runtime.sendMessage({ action: 'copyToClipboard', text: lastMeasurement }, (response) => {
                if (response && response.success) {
                    btn.textContent = 'Copied!';
                    setTimeout(() => { btn.textContent = 'Copy'; }, 1200);
                }
            });
        };
        badge.appendChild(btn);
    }
}

// --- Overlay Redraw Throttling ---
let redrawPending = false;
function scheduleDrawGuides() {
  if (!redrawPending) {
    redrawPending = true;
    requestAnimationFrame(() => {
      drawGuides();
      redrawPending = false;
    });
  }
}

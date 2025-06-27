// SnapMeasure Overlay System

console.log("SnapMeasure content script loaded!");

// --- UI Overlay and Canvas Setup ---
let overlayRoot = null;
const ui = {};

function createUI() {
    if (overlayRoot) return; // Already created
    console.log('createUI called');
    overlayRoot = document.createElement('div');
    overlayRoot.id = 'snapmeasure-overlay-root';
    overlayRoot.style.position = 'fixed';
    overlayRoot.style.top = '0';
    overlayRoot.style.left = '0';
    overlayRoot.style.width = '100vw';
    overlayRoot.style.height = '100vh';
    overlayRoot.style.pointerEvents = 'none';
    overlayRoot.style.zIndex = '2147483647';

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
}

function destroyUI() {
    if (overlayRoot && overlayRoot.parentNode) {
        console.log('destroyUI called');
        overlayRoot.parentNode.removeChild(overlayRoot);
        overlayRoot = null;
    }
}

// --- Measurement Drawing Functions ---
function drawGrid() {
    const ctx = ui.gridCtx;
    ctx.clearRect(0, 0, ui.gridCanvas.width, ui.gridCanvas.height);
    if (!settings.showGrid || !settings.isProUser) return;
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

function drawScreenshot() {
    const ctx = ui.screenshotCtx;
    ctx.clearRect(0, 0, ui.screenshotCanvas.width, ui.screenshotCanvas.height);
    if (!settings.screenshotData || !settings.isProUser) return;
    // For demo: fill with semi-transparent overlay
    ctx.globalAlpha = settings.screenshotOpacity || 0.5;
    ctx.fillStyle = 'rgba(0,0,255,0.2)';
    ctx.fillRect(0, 0, ui.screenshotCanvas.width, ui.screenshotCanvas.height);
    ctx.globalAlpha = 1.0;
}

function drawGuides() {
    const ctx = ui.measureCtx;
    ctx.clearRect(0, 0, ui.measureCanvas.width, ui.measureCanvas.height);
    if (!settings.showGuides || !settings.isProUser) {
        drawLockedMeasurements();
        return;
    }
    // For demo: draw a crosshair in the center
    ctx.strokeStyle = '#ff0050';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ui.measureCanvas.width/2 - 20, ui.measureCanvas.height/2);
    ctx.lineTo(ui.measureCanvas.width/2 + 20, ui.measureCanvas.height/2);
    ctx.moveTo(ui.measureCanvas.width/2, ui.measureCanvas.height/2 - 20);
    ctx.lineTo(ui.measureCanvas.width/2, ui.measureCanvas.height/2 + 20);
    ctx.stroke();
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
    isProUser: true, // Force pro for debugging
    showGrid: true, // Force grid for debugging
    showBaselineGrid: false,
    showGuides: false,
    screenshotData: null,
    screenshotOpacity: 0.5,
};

if (typeof window.snapMeasureInitialized === 'undefined') {
    window.snapMeasureInitialized = true;

    const inspector = (function() {
        let isActive = false;

        function loadSettings() {
            chrome.storage.local.get(null, (result) => {
                settings.isProUser = result.isProUser || false;
                settings.showGrid = result.showGrid || false;
                settings.showBaselineGrid = result.showBaselineGrid || false;
                settings.showGuides = result.showGuides || false;
                settings.screenshotData = result.screenshotData || null;
                settings.screenshotOpacity = result.screenshotOpacity || 0.5;
                drawGrid();
                drawBaselineGrid();
                drawScreenshot();
                if (isActive) {
                    drawGuides();
                }
            });
        }

        function activate() {
            if (isActive) return;
            isActive = true;
            console.log('Inspector activated');
            createUI();
            loadSettings();
            chrome.storage.onChanged.addListener(storageChangeHandler);
        }

        function deactivate() {
            if (!isActive) return;
            isActive = false;
            console.log('Inspector deactivated');
            destroyUI();
            chrome.storage.onChanged.removeListener(storageChangeHandler);
        }

        function storageChangeHandler(changes, namespace) {
            if (namespace === 'local') {
                if (changes.isProUser) settings.isProUser = changes.isProUser.newValue;
                if (changes.showGrid) settings.showGrid = changes.showGrid.newValue;
                if (changes.showBaselineGrid) settings.showBaselineGrid = changes.showBaselineGrid.newValue;
                if (changes.showGuides) settings.showGuides = changes.showGuides.newValue;
                if (changes.screenshotData) settings.screenshotData = changes.screenshotData.newValue;
                if (changes.screenshotOpacity) settings.screenshotOpacity = changes.screenshotOpacity.newValue;
                drawGrid();
                drawBaselineGrid();
                drawScreenshot();
                if (isActive) drawGuides();
            }
        }

        return {
            activate,
            deactivate,
            get isActive() { return isActive; }
        };
    })();
    window.inspector = inspector;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleInspector') {
        if (window.snapMeasureInitialized && window.inspector) {
            if (window.inspector.isActive) {
                window.inspector.deactivate();
            } else {
                window.inspector.activate();
            }
        }
    }
});
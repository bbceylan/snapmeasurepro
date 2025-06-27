// Complete popup.js
// eslint-disable no-undef

document.addEventListener('DOMContentLoaded', () => {
    // ---------- query helpers ----------
    const $ = id => document.getElementById(id);

    // ---------- element refs ----------
    const proFeaturesContainer = $('pro-features-container');

    const els = {
        gridToggle: $('grid-toggle'),
        baselineSelect: $('baseline-select'),
        guidesToggle: $('guides-toggle'),
        screenshotUploadBtn: $('screenshot-upload-btn'),
        screenshotUpload: $('screenshot-upload'),
        screenshotDeleteBtn: $('screenshot-delete-btn'),
        screenshotOpacity: $('screenshot-opacity'),
        exportButton: $('export-button'),
        toggleBtn: $('toggle-button'),
        freeGridToggle: $('free-grid-toggle'),
        freeSelectionToggle: $('free-selection-toggle'),
        multiDistanceToggle: $('multi-distance-toggle'),
        licenseStatus: $('license-status-display'),
        licenseKeyInput: $('license-key-input'),
        activateBtn: $('activate-license-btn'),
        deactivateBtn: $('deactivate-license-btn'),
        licenseMessage: $('license-message'),
        autoCopyToggle: $('auto-copy-toggle')
    };

    // group for bulk enabling/disabling
    const proControls = [
        els.gridToggle, els.baselineSelect, els.guidesToggle,
        els.screenshotUploadBtn, els.screenshotDeleteBtn,
        els.screenshotOpacity, els.exportButton
    ];

    // Add inspector status indicator
    let inspectorStatusMsg = document.getElementById('inspector-status-msg');
    if (!inspectorStatusMsg) {
        inspectorStatusMsg = document.createElement('div');
        inspectorStatusMsg.id = 'inspector-status-msg';
        inspectorStatusMsg.style.background = '#ffe0e0';
        inspectorStatusMsg.style.color = '#c70000';
        inspectorStatusMsg.style.fontWeight = 'bold';
        inspectorStatusMsg.style.fontSize = '13px';
        inspectorStatusMsg.style.padding = '8px 12px';
        inspectorStatusMsg.style.borderRadius = '8px';
        inspectorStatusMsg.style.margin = '10px 0 0 0';
        inspectorStatusMsg.style.textAlign = 'center';
        inspectorStatusMsg.style.display = 'none';
        document.querySelector('.settings-container').prepend(inspectorStatusMsg);
    }

    // ---------- safe messaging ----------
    function sendToActive(msg, cb = () => {}) {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            if (!tabs.length) return cb({ ok: false, error: 'No active tab' });
            chrome.tabs.sendMessage(tabs[0].id, msg, (res) => {
                if (chrome.runtime.lastError) {
                    alert('SnapMeasure can only run on regular web pages.');
                    return cb({ ok: false, error: chrome.runtime.lastError.message });
                }
                cb({ ok: true, data: res });
            });
        });
    }

    // ---------- licence / UI sync ----------
    function refreshUI() {
        chrome.storage.local.get([
            'isProUser', 'licenseKey', 'showGrid',
            'freeSelectionEnabled', 'multiDistanceEnabled',
            'autoCopyEnabled', 'showGuides', 'showBaselineGrid', 'screenshotOpacity'
        ], st => {
            const isPro = !!st.isProUser;
            proFeaturesContainer.classList.toggle('disabled', !isPro);
            proControls.forEach(c => c && (c.disabled = !isPro));

            els.licenseStatus.textContent = isPro ? 'Active' : 'Inactive';
            els.licenseStatus.className = isPro ? 'status-active' : 'status-inactive';
            els.licenseKeyInput.value = isPro ? (st.licenseKey || '') : '';
            els.licenseKeyInput.disabled = isPro;
            els.activateBtn.style.display = isPro ? 'none' : 'block';
            els.deactivateBtn.style.display = isPro ? 'block' : 'none';
            els.licenseMessage.textContent = isPro ?
                'Pro features unlocked!' : 'Enter a key to unlock Pro.';
            els.licenseMessage.className = 'license-message';

            // free toggles
            els.freeGridToggle.checked = !!st.showGrid;
            els.freeSelectionToggle.checked = !!st.freeSelectionEnabled;
            els.multiDistanceToggle.checked = !!st.multiDistanceEnabled;
            els.autoCopyToggle.checked = !!st.autoCopyEnabled;
            // pro toggles
            els.gridToggle.checked = !!st.showGrid;
            els.guidesToggle.checked = !!st.showGuides;
            els.baselineSelect.value = st.showBaselineGrid ? String(st.showBaselineGrid) : '0';
            els.screenshotOpacity.value = st.screenshotOpacity || 0.5;
        });
    }

    function setToggleLabel(active) {
        els.toggleBtn.textContent = active ? 'Inspector On' : 'Toggle Inspector';
        els.toggleBtn.classList.toggle('active', active);
        inspectorStatusMsg.style.display = active ? 'none' : 'block';
        inspectorStatusMsg.textContent = active ? '' : 'Inspector is OFF. Turn it on to use features.';
    }

    // ---------- wire listeners (only if element exists) ----------
    // licence
    els.activateBtn?.addEventListener('click', () => {
        const key = els.licenseKeyInput.value.trim();
        if (!key) return;
        els.activateBtn.disabled = true;
        chrome.runtime.sendMessage({ action:'validateLicense', licenseKey:key }, res => {
            if (res && res.isValid) {
                els.licenseMessage.textContent = 'Licence activated!';
                els.licenseMessage.className   = 'license-message success';
            } else {
                els.licenseMessage.textContent =
                    (res && res.error) || 'Activation failed.';
                els.licenseMessage.className   = 'license-message error';
            }
            els.activateBtn.disabled = false;
            refreshUI();
        });
    });

    els.deactivateBtn?.addEventListener('click', () => {
        if (!confirm('Deactivate licence on this device?')) return;
        chrome.runtime.sendMessage({ action: 'deactivateLicense' }, () => refreshUI());
    });

    // inspector toggle
    els.toggleBtn?.addEventListener('click', () => {
        sendToActive({ action: 'toggleInspector' }, res => {
            if (!res.ok) {
                console.warn('SnapMeasure: Content script not present or error:', res.error);
                return;
            }
            setToggleLabel(res.data?.isActive);
        });
    });

    // free toggles → storage
    els.freeGridToggle?.addEventListener('change', () =>
        chrome.storage.local.set({ showGrid: els.freeGridToggle.checked }));
    els.freeSelectionToggle?.addEventListener('change', () =>
        chrome.storage.local.set({ freeSelectionEnabled: els.freeSelectionToggle.checked }));
    els.multiDistanceToggle?.addEventListener('change', () =>
        chrome.storage.local.set({ multiDistanceEnabled: els.multiDistanceToggle.checked }));
    els.autoCopyToggle?.addEventListener('change', () =>
        chrome.storage.local.set({ autoCopyEnabled: els.autoCopyToggle.checked }));

    // pro toggles → storage
    els.gridToggle?.addEventListener('change', () =>
        chrome.storage.local.set({ showGrid: els.gridToggle.checked }));
    els.baselineSelect?.addEventListener('change', () =>
        chrome.storage.local.set({ showBaselineGrid: Number(els.baselineSelect.value) }));
    els.guidesToggle?.addEventListener('change', () =>
        chrome.storage.local.set({ showGuides: els.guidesToggle.checked }));
    els.screenshotUploadBtn?.addEventListener('click', () =>
        els.screenshotUpload.click());
    els.screenshotUpload?.addEventListener('change', e => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev =>
            chrome.storage.local.set({ screenshotData: ev.target.result });
        reader.readAsDataURL(file);
    });
    els.screenshotDeleteBtn?.addEventListener('click', () =>
        chrome.storage.local.set({ screenshotData: null }));
    els.screenshotOpacity?.addEventListener('input', () =>
        chrome.storage.local.set({ screenshotOpacity:
            parseFloat(els.screenshotOpacity.value) }));

    els.exportButton?.addEventListener('click', () =>
        chrome.runtime.sendMessage({ action: 'exportImage' }));

    // ---------- init ----------
    refreshUI();
    chrome.storage.onChanged.addListener(refreshUI);

    // ask content script whether inspector is on
    sendToActive({ action: 'getInspectorState' }, res =>
        setToggleLabel(res.data?.isActive));

    // Suppress 'Could not establish connection. Receiving end does not exist.' errors in the popup
    window.addEventListener('unhandledrejection', event => {
        if (
            event.reason &&
            event.reason.message &&
            event.reason.message.includes('Could not establish connection')
        ) {
            event.preventDefault();
        }
    });
});
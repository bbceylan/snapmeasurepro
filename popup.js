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
        licenseStatus: $('license-status'),
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

    // ---------- safe messaging ----------
    function sendToActive(msg, cb = () => {}) {
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            if (!tabs.length) return cb({ ok: false, error: 'No active tab' });
            chrome.tabs.sendMessage(tabs[0].id, msg, res => {
                if (chrome.runtime.lastError) {
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
            'autoCopyEnabled'
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
        });
    }

    function setToggleLabel(active) {
        els.toggleBtn.textContent = active ? 'Inspector On' : 'Toggle Inspector';
        els.toggleBtn.classList.toggle('active', active);
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
        sendToActive({ action: 'deactivateLicense' }, () => refreshUI());
    });

    // inspector toggle
    els.toggleBtn?.addEventListener('click', () => {
        sendToActive({ action: 'toggleInspector' }, res => {
            if (res.ok) setToggleLabel(res.data?.isActive);
        });
    });

    // free toggles → storage
    els.freeGridToggle?.addEventListener('change', () =>
        chrome.storage.local.set({ showGrid: els.freeGridToggle.checked }));
    els.freeSelectionToggle?.addEventListener('change', () =>
        chrome.storage.local.set({ freeSelectionEnabled: els.freeSelectionToggle.checked }));
    els.multiDistanceToggle?.addEventListener('change', () =>
        chrome.storage.local.set({ multiDistanceEnabled: els.multiDistanceToggle.checked }));

    // ----- pro only (guard with && to avoid null) -----
    els.gridToggle?.addEventListener('change', () =>
        chrome.storage.local.set({ showGrid: els.gridToggle.checked }));
    els.baselineSelect?.addEventListener('change', () =>
        chrome.storage.local.set({ baselineStep: parseInt(els.baselineSelect.value, 10) }));
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
        sendToActive({ action: 'exportImage' }));

    // auto-copy toggle
    els.autoCopyToggle?.addEventListener('change', () =>
        chrome.storage.local.set({ autoCopyEnabled: els.autoCopyToggle.checked }));

    // ---------- init ----------
    refreshUI();
    chrome.storage.onChanged.addListener(refreshUI);

    // ask content script whether inspector is on
    sendToActive({ action: 'getInspectorState' }, res =>
        setToggleLabel(res.data?.isActive));

    // On load, set auto-copy toggle from storage
    chrome.storage.local.get(['autoCopyEnabled'], st => {
        if (els.autoCopyToggle) els.autoCopyToggle.checked = !!st.autoCopyEnabled;
    });
});
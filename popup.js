// Complete popup.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const proFeaturesContainer = document.getElementById('pro-features-container');

    // Pro Feature Controls
    const gridToggle = document.getElementById('grid-toggle');
    const baselineSelect = document.getElementById('baseline-select');
    const guidesToggle = document.getElementById('guides-toggle');
    const screenshotUploadBtn = document.getElementById('screenshot-upload-btn');
    const screenshotUpload = document.getElementById('screenshot-upload');
    const screenshotDeleteBtn = document.getElementById('screenshot-delete-btn');
    const screenshotOpacity = document.getElementById('screenshot-opacity');
    const exportButton = document.getElementById('export-button');
    const toggleBtn = document.getElementById('toggle-button');
    const freeGridToggle = document.getElementById('free-grid-toggle');
    const freeSelectionToggle = document.getElementById('free-selection-toggle');
    const multiDistanceToggle = document.getElementById('multi-distance-toggle');

    // License Management Controls
    const licenseStatus = document.getElementById('license-status');
    const licenseKeyInput = document.getElementById('license-key-input');
    const activateBtn = document.getElementById('activate-license-btn');
    const deactivateBtn = document.getElementById('deactivate-license-btn');
    const licenseMessage = document.getElementById('license-message');

    const proControls = [gridToggle, baselineSelect, guidesToggle, screenshotUploadBtn, screenshotDeleteBtn, screenshotOpacity, exportButton];

    // --- Core Logic ---

    // Updates the entire UI based on license status from storage
    function updateUIBasedOnLicense() {
        chrome.storage.local.get(['isProUser', 'licenseKey', 'licenseStatus', 'showGrid', 'freeSelectionEnabled', 'multiDistanceEnabled'], (result) => {
            if (result.isProUser) {
                // User is PRO
                proFeaturesContainer.classList.remove('disabled');
                proControls.forEach(control => control.disabled = false);
            } else {
                // User is FREE
                proFeaturesContainer.classList.add('disabled');
                proControls.forEach(control => control.disabled = true);
            }
            // Free features are always enabled
            freeGridToggle.disabled = false;
            freeSelectionToggle.disabled = false;
            multiDistanceToggle.disabled = false;

            licenseStatus.textContent = result.isProUser ? 'Active' : 'Inactive';
            licenseStatus.className = result.isProUser ? 'status-active' : 'status-inactive';
            licenseKeyInput.value = result.isProUser ? (result.licenseKey || '') : '';
            licenseKeyInput.disabled = !!result.isProUser;
            activateBtn.style.display = result.isProUser ? 'none' : 'block';
            deactivateBtn.style.display = result.isProUser ? 'block' : 'none';
            licenseMessage.textContent = result.isProUser ? 'Pro features unlocked!' : 'Enter a key to unlock Pro features.';
            licenseMessage.className = result.isProUser ? 'license-message success' : 'license-message';

            freeGridToggle.checked = !!result.showGrid;
            freeSelectionToggle.checked = !!result.freeSelectionEnabled;
            multiDistanceToggle.checked = !!result.multiDistanceEnabled;
        });
    }

    // Toggle Inspector Button
    function updateToggleButton(isActive) {
        if (isActive) {
            toggleBtn.classList.add('active');
            toggleBtn.textContent = 'Inspector On';
        } else {
            toggleBtn.classList.remove('active');
            toggleBtn.textContent = 'Toggle Inspector';
        }
    }

    // Query inspector state on load
    function queryInspectorState() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getInspectorState' }, (response) => {
                updateToggleButton(response && response.isActive);
            });
        });
    }

    // Ensure all feature settings are initialized in storage
    function initializeSettings() {
        chrome.storage.local.get(['showGrid', 'showGuides', 'showBaselineGrid', 'screenshotData', 'screenshotOpacity', 'freeSelectionEnabled', 'multiDistanceEnabled'], (result) => {
            const updates = {};
            if (typeof result.showGrid === 'undefined') updates.showGrid = true;
            if (typeof result.showGuides === 'undefined') updates.showGuides = false;
            if (typeof result.showBaselineGrid === 'undefined') updates.showBaselineGrid = false;
            if (typeof result.screenshotData === 'undefined') updates.screenshotData = null;
            if (typeof result.screenshotOpacity === 'undefined') updates.screenshotOpacity = 0.5;
            if (typeof result.freeSelectionEnabled === 'undefined') updates.freeSelectionEnabled = true;
            if (typeof result.multiDistanceEnabled === 'undefined') updates.multiDistanceEnabled = true;
            if (Object.keys(updates).length > 0) {
                chrome.storage.local.set(updates);
            }
        });
    }

    // --- Safe Messaging Helper ---
    function safeSend(msg, toContentScript = false) {
        return new Promise(resolve => {
            if (toContentScript) {
                chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                    if (!tabs || !tabs.length) {
                        resolve({ ok: false, error: 'No active tab found.' });
                        return;
                    }
                    chrome.tabs.sendMessage(tabs[0].id, msg, response => {
                        if (chrome.runtime.lastError) {
                            console.warn('SnapMeasure message failed:', chrome.runtime.lastError.message);
                            resolve({ ok: false, error: chrome.runtime.lastError.message });
                        } else {
                            resolve({ ok: true, data: response });
                        }
                    });
                });
            } else {
                chrome.runtime.getBackgroundPage(() => {
                    chrome.runtime.sendMessage(msg, response => {
                        if (chrome.runtime.lastError) {
                            console.warn('SnapMeasure message failed:', chrome.runtime.lastError.message);
                            resolve({ ok: false, error: chrome.runtime.lastError.message });
                        } else {
                            resolve({ ok: true, data: response });
                        }
                    });
                });
            }
        });
    }

    // --- Event Listeners ---

    // Activate License Button
    activateBtn.addEventListener('click', async () => {
        const key = licenseKeyInput.value.trim();
        if (!key) {
            licenseMessage.textContent = 'Please enter a license key.';
            licenseMessage.className = 'license-message error';
            return;
        }
        activateBtn.textContent = 'Activating...';
        activateBtn.disabled = true;
        const res = await safeSend({ action: 'validateLicense', licenseKey: key });
        if (!res.ok) {
            licenseMessage.textContent = res.error || 'Activation failed. Please check your key.';
            licenseMessage.className = 'license-message error';
        } else if (res.data && res.data.isValid) {
            licenseMessage.textContent = 'License activated successfully!';
            licenseMessage.className = 'license-message success';
        } else {
            licenseMessage.textContent = (res.data && res.data.error) || 'Activation failed. Please check your key.';
            licenseMessage.className = 'license-message error';
        }
        activateBtn.textContent = 'Activate';
        activateBtn.disabled = false;
        updateUIBasedOnLicense();
    });
    
    // Deactivate License Button
    deactivateBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to deactivate your license on this device?')) {
            const res = await safeSend({ action: 'deactivateLicense' });
            if (!res.ok) {
                alert('SnapMeasure: ' + (res.error || 'Could not deactivate license.'));
            } else {
                updateUIBasedOnLicense();
            }
        }
    });
    
    // Wire up screenshot upload button to hidden file input
    screenshotUploadBtn.addEventListener('click', () => {
        screenshotUpload.click();
    });

    // Toggle Inspector Button
    toggleBtn.addEventListener('click', async () => {
        const res = await safeSend({ action: 'toggleInspector' }, true);
        if (!res.ok) {
            alert('SnapMeasure: ' + (res.error || 'Could not toggle inspector. Please refresh the page and try again.'));
            updateToggleButton(false);
        } else {
            updateToggleButton(res.data && res.data.isActive);
        }
    });

    // Free Grid Toggle
    freeGridToggle.addEventListener('change', () => {
        chrome.storage.local.set({ showGrid: freeGridToggle.checked }, () => {
            console.log('Free grid setting updated:', freeGridToggle.checked);
        });
    });

    // Pro Grid Toggle
    gridToggle.addEventListener('change', () => {
        chrome.storage.local.set({ showGrid: gridToggle.checked }, () => {
            console.log('Pro grid setting updated:', gridToggle.checked);
        });
    });

    // Baseline Select
    baselineSelect.addEventListener('change', () => {
        const val = parseInt(baselineSelect.value, 10);
        chrome.storage.local.set({ showBaselineGrid: !!val }, () => {
            console.log('Baseline grid setting updated:', !!val);
        });
    });

    // Guides Toggle
    guidesToggle.addEventListener('change', () => {
        chrome.storage.local.set({ showGuides: guidesToggle.checked }, () => {
            console.log('Guides setting updated:', guidesToggle.checked);
        });
    });

    // Screenshot Upload
    screenshotUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            chrome.storage.local.set({ screenshotData: evt.target.result }, () => {
                console.log('Screenshot uploaded');
            });
        };
        reader.readAsDataURL(file);
    });

    // Screenshot Delete
    screenshotDeleteBtn.addEventListener('click', () => {
        chrome.storage.local.set({ screenshotData: null }, () => {
            console.log('Screenshot deleted');
        });
    });

    // Screenshot Opacity
    screenshotOpacity.addEventListener('input', () => {
        chrome.storage.local.set({ screenshotOpacity: parseFloat(screenshotOpacity.value) }, () => {
            console.log('Screenshot opacity updated:', screenshotOpacity.value);
        });
    });

    // Free Selection Toggle
    freeSelectionToggle.addEventListener('change', () => {
        chrome.storage.local.set({ freeSelectionEnabled: freeSelectionToggle.checked }, () => {
            console.log('Free selection setting updated:', freeSelectionToggle.checked);
        });
    });

    // Multi-Component Distance Toggle
    multiDistanceToggle.addEventListener('change', () => {
        chrome.storage.local.set({ multiDistanceEnabled: multiDistanceToggle.checked }, () => {
            console.log('Multi-component distance setting updated:', multiDistanceToggle.checked);
        });
    });

    // --- Initialization ---

    // Initial UI setup based on license
    updateUIBasedOnLicense();
    
    // Listen for changes from background script (e.g., after validation)
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && (changes.isProUser || changes.licenseStatus || changes.showGrid || changes.freeSelectionEnabled || changes.multiDistanceEnabled)) {
            updateUIBasedOnLicense();
        }
    });

    // On popup load, initialize settings and query inspector state
    initializeSettings();
    queryInspectorState();

    // NOTE: All other event listeners for toggles, buttons, etc.,
    // would go here. They would message the content script as before,
    // but the UI state (enabled/disabled) is now handled by the
    // license status functions above.
});
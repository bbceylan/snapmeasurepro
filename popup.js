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
        chrome.storage.local.get(['isProUser', 'licenseKey', 'licenseStatus', 'showGrid'], (result) => {
            if (result.isProUser) {
                // User is PRO
                proFeaturesContainer.classList.remove('disabled');
                proControls.forEach(control => control.disabled = false);

                licenseStatus.textContent = 'Active';
                licenseStatus.className = 'status-active';
                licenseKeyInput.value = result.licenseKey || '';
                licenseKeyInput.disabled = true;
                activateBtn.style.display = 'none';
                deactivateBtn.style.display = 'block';
                licenseMessage.textContent = 'Pro features unlocked!';
                licenseMessage.className = 'license-message success';

                freeGridToggle.checked = !!result.showGrid;
            } else {
                // User is FREE
                proFeaturesContainer.classList.add('disabled');
                proControls.forEach(control => control.disabled = true);

                licenseStatus.textContent = 'Inactive';
                licenseStatus.className = 'status-inactive';
                licenseKeyInput.value = '';
                licenseKeyInput.disabled = false;
                activateBtn.style.display = 'block';
                deactivateBtn.style.display = 'none';
                licenseMessage.textContent = 'Enter a key to unlock Pro features.';
                licenseMessage.className = 'license-message';

                freeGridToggle.checked = false;
            }
        });
    }

    // --- Event Listeners ---

    // Activate License Button
    activateBtn.addEventListener('click', () => {
        console.log('Activate button clicked');
        const key = licenseKeyInput.value.trim();
        if (!key) {
            licenseMessage.textContent = 'Please enter a license key.';
            licenseMessage.className = 'license-message error';
            return;
        }

        activateBtn.textContent = 'Activating...';
        activateBtn.disabled = true;

        console.log('Sending message to background:', { action: 'validateLicense', licenseKey: key });
        chrome.runtime.sendMessage({ action: 'validateLicense', licenseKey: key }, (response) => {
            console.log('Received response from background:', response);
            if (response && response.isValid) {
                licenseMessage.textContent = 'License activated successfully!';
                licenseMessage.className = 'license-message success';
            } else {
                licenseMessage.textContent = response.error || 'Activation failed. Please check your key.';
                licenseMessage.className = 'license-message error';
            }
            activateBtn.textContent = 'Activate';
            activateBtn.disabled = false;
            updateUIBasedOnLicense(); // Refresh the entire UI
        });
    });
    
    // Deactivate License Button
    deactivateBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to deactivate your license on this device?')) {
            chrome.runtime.sendMessage({ action: 'deactivateLicense' }, (response) => {
                if (response && response.success) {
                    updateUIBasedOnLicense();
                }
            });
        }
    });
    
    // Wire up screenshot upload button to hidden file input
    screenshotUploadBtn.addEventListener('click', () => {
        screenshotUpload.click();
    });

    // Toggle Inspector Button
    toggleBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'toggleInspector' });
        });
    });

    // Free Grid Toggle
    freeGridToggle.addEventListener('change', () => {
        chrome.storage.local.set({ showGrid: freeGridToggle.checked }, () => {
            console.log('Free grid setting updated:', freeGridToggle.checked);
        });
    });

    // --- Initialization ---

    // Initial UI setup based on license
    updateUIBasedOnLicense();
    
    // Listen for changes from background script (e.g., after validation)
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && (changes.isProUser || changes.licenseStatus || changes.showGrid)) {
            updateUIBasedOnLicense();
        }
    });

    // NOTE: All other event listeners for toggles, buttons, etc.,
    // would go here. They would message the content script as before,
    // but the UI state (enabled/disabled) is now handled by the
    // license status functions above.
});
// background.js

class SnapMeasureLicenseManager {
    constructor() {
        this.validationEndpoint = 'https://snapmeasure-api.netlify.app/.netlify/functions/validate-license';
    }

    async validateLicense(licenseKey) {
        if (!licenseKey) {
            return { isValid: false, error: 'License key cannot be empty.' };
        }

        try {
            const response = await fetch(this.validationEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ license: licenseKey }),
            });

            const data = await response.json();

            if (response.ok && data.valid) {
                // Success: Save pro status and features
                await chrome.storage.local.set({
                    isProUser: true,
                    licenseKey: licenseKey,
                    proFeatures: data.features || [],
                    licenseStatus: 'active'
                });
                return { isValid: true, features: data.features };
            } else {
                // Failure: Clear pro status
                await this.deactivateLicense();
                return { isValid: false, error: data.error || 'Invalid license key.' };
            }
        } catch (error) {
            console.error('License validation request failed:', error);
            await this.deactivateLicense();
            return { isValid: false, error: 'Network error during validation.' };
        }
    }
    
    async deactivateLicense() {
        await chrome.storage.local.set({
            isProUser: false,
            licenseKey: null,
            proFeatures: [],
            licenseStatus: 'inactive'
        });
    }
}

const licenseManager = new SnapMeasureLicenseManager();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);
    if (request.action === 'validateLicense') {
        licenseManager.validateLicense(request.licenseKey)
            .then(response => {
                sendResponse(response);
            });
        return true; // Indicates you wish to send a response asynchronously
    } else if (request.action === 'deactivateLicense') {
        licenseManager.deactivateLicense()
            .then(() => {
                sendResponse({ success: true });
            });
        return true;
    } else if (request.action === 'copyToClipboard') {
        // Use the clipboardWrite permission if needed
        navigator.clipboard.writeText(request.text).then(() => {
            sendResponse({ success: true });
        }).catch(() => {
            sendResponse({ success: false });
        });
        return true; // Indicates async response
    }
});
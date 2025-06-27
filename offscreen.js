// offscreen.js - Handles clipboard operations
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'copyToClipboardOffscreen') {
        navigator.clipboard.writeText(request.text)
            .then(() => {
                sendResponse({ success: true });
            })
            .catch((error) => {
                console.error('Clipboard write failed:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Keep message channel open
    }
});
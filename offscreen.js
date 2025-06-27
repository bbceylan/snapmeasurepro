// offscreen.js - Handles clipboard operations
chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
    if (req.action === 'copyToClipboardOffscreen') {
        navigator.clipboard.writeText(req.text)
            .then(() => sendResponse({ ok: true }))
            .catch(err => {
                console.error('Clipboard write failed:', err);
                sendResponse({ ok: false, error: err.message });
            });
        return true;        // async
    }
});
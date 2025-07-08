# SnapMeasure Pro Testing Guide

## 1. Extension Installation

1. Open Chrome and go to `chrome://extensions/`.
2. Enable "Developer mode" (top right).
3. Click "Load unpacked" and select the `snapmeasure/` folder from your project.
4. The SnapMeasure icon should appear in your Chrome toolbar.

---

## 2. License Activation (Pro Features)

1. Click the SnapMeasure icon to open the popup.
2. In the "License Management" section, enter the test license key:
   - `SNAP-TEST1-123456`
3. Click **Activate**.
4. The status should change to **Active** and Pro features will unlock.
5. To test deactivation, click **Deactivate License**.

---

## 3. Feature Gating

- With no license or an invalid license, Pro features should be disabled (greyed out, unclickable).
- With a valid license, Pro features should be enabled and usable.
- Try entering an invalid key (e.g., `INVALID-KEY`) and confirm that Pro features remain locked.

---

## 4. Backend API Testing

- Test the license validation endpoint directly:
  ```sh
  curl -X POST https://snapmeasureapi.netlify.app/.netlify/functions/validate-license \
    -H 'Content-Type: application/json' \
    -d '{"license": "SNAP-TEST1-123456"}'
  ```
- You should receive a JSON response with `"valid": true`.
- Try with an invalid key to confirm you get `"valid": false` and an error message.

---

## 5. Troubleshooting

- **Extension fails to load:**
  - Check file and folder permissions (`chmod 644` for files, `chmod 755` for folders).
  - Ensure `manifest.json` is valid and present.
- **Pro features not unlocking:**
  - Double-check the license key and API endpoint.
  - Open the Chrome DevTools (popup > right-click > Inspect) for error messages.
- **API not responding:**
  - Confirm Netlify deployment is live.
  - Check for typos in the endpoint URL.

---

## 6. Additional Notes

- The test license key is for development only. For production, integrate with Gumroad or your license provider.- For advanced debugging, use Chrome's extension logs and Netlify function logs.

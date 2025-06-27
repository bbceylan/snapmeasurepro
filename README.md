# SnapMeasure Pro

![SnapMeasure Pro Logo](snapmeasure/images/logo.png)

[![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR_BADGE_ID/deploy-status)](https://app.netlify.com/sites/snapmeasureapi/deploys)

---

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Usage](#usage)
- [License Activation](#license-activation)
- [Development](#development)
- [Testing](#testing)
- [API Documentation](#api-documentation)
- [Changelog](#changelog)
- [License](#license)
- [Credits](#credits)

---

## Overview

**SnapMeasure Pro** is a Chrome extension for web developers and designers to inspect and measure UI elements on any webpage. The "Pro" tier unlocks advanced features via a license key purchased through Gumroad and validated by a secure serverless backend.

---

## Features

### Free Features
- Measure distances between elements
- Inspect element dimensions
- Simple UI overlay

### Pro Features *(with valid license)*
- Grid overlays
- Baseline guides
- Custom guides
- Screenshot & export tools
- Advanced clipboard integration

---

## Architecture

- **Frontend:** Chrome Extension (HTML, CSS, JS)
- **Backend:** Netlify Functions (Node.js, AWS Lambda)
- **License Validation:** Secure API call to Netlify endpoint

---

## Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/YOUR-USERNAME/snapmeasure-pro.git
   cd snapmeasure-pro
   ```
2. **Load the extension in Chrome:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `snapmeasure/` folder

---

## Usage

- Click the SnapMeasure icon in your Chrome toolbar.
- Use the popup to access free and pro features.
- To unlock Pro features, activate your license (see below).

---

## License Activation

1. Purchase a license key from [Gumroad](https://gumroad.com/).
2. Open the extension popup.
3. Enter your license key in the "License Management" section and click **Activate**.
4. Pro features will unlock if the license is valid.

---

## Development

- **Frontend:** Edit files in `snapmeasure/` (e.g., `content.js`, `popup.js`, `background.js`).
- **Backend:** Edit Netlify Functions in `netlify/functions/`.
- **Build/Deploy:**
  - Push to GitHub to trigger Netlify deploy for backend.
  - Reload unpacked extension in Chrome for frontend changes.

---

## Testing

### Extension
- Load as unpacked extension (see Installation).
- Use the test license key: `SNAP-TEST1-123456` for development.
- Check that Pro features are gated/unlocked as expected.

### Backend
- Test API endpoint with curl:
  ```sh
  curl -X POST https://snapmeasureapi.netlify.app/.netlify/functions/validate-license \
    -H 'Content-Type: application/json' \
    -d '{"license": "SNAP-TEST1-123456"}'
  ```
- Should return `{ "valid": true, ... }` for the test key.

---

## API Documentation

### POST `/validate-license`
- **Endpoint:** `https://snapmeasureapi.netlify.app/.netlify/functions/validate-license`
- **Request Body:**
  ```json
  { "license": "YOUR-LICENSE-KEY" }
  ```
- **Response:**
  - Success:
    ```json
    {
      "valid": true,
      "license": "...",
      "activated_at": "...",
      "expires": null,
      "features": ["grid", "baseline", "guides", "screenshot", "export"]
    }
    ```
  - Failure:
    ```json
    { "valid": false, "error": "Invalid or incorrect license key." }
    ```

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## Credits

- **Author:** Berker Ceylan
- **AI Assistance:** Gemini, GPT-4
- **Special Thanks:** All open source contributors and testers 
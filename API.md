# SnapMeasure Pro License Validation API

## Overview
This API is used by the SnapMeasure Pro Chrome extension to validate user license keys. It is implemented as a serverless function on Netlify.

---

## Endpoint

```
POST https://snapmeasureapi.netlify.app/.netlify/functions/validate-license
```

---

## Request

- **Method:** POST
- **Headers:**
  - `Content-Type: application/json`
- **Body:**
  ```json
  {
    "license": "YOUR-LICENSE-KEY"
  }
  ```

---

## Responses

### Success (Valid License)
```
Status: 200 OK
```
```json
{
  "valid": true,
  "license": "SNAP-TEST1-123456",
  "activated_at": "2025-06-27T12:00:00.000Z",
  "expires": null,
  "features": ["grid", "baseline", "guides", "screenshot", "export"]
}
```

### Failure (Invalid License)
```
Status: 404 Not Found
```
```json
{
  "valid": false,
  "error": "Invalid or incorrect license key."
}
```

### Failure (Bad Request)
```
Status: 400 Bad Request
```
```json
{
  "valid": false,
  "error": "Bad request. Please ensure you are sending a valid JSON body with a 'license' property."
}
```

### Failure (Method Not Allowed)
```
Status: 405 Method Not Allowed
```
```json
{
  "valid": false,
  "error": "Method Not Allowed"
}
```

---

## Integration Notes
- Only POST requests are accepted.
- CORS is enabled for all origins.
- The current implementation validates against a single test key: `SNAP-TEST1-123456`.
- For production, integrate with Gumroad or your license provider.
- All responses are JSON.

---

## Example Usage (curl)

```
curl -X POST https://snapmeasureapi.netlify.app/.netlify/functions/validate-license \
  -H 'Content-Type: application/json' \
  -d '{"license": "SNAP-TEST1-123456"}'
``` 
# Error Handling & Resilience Architecture

This document details the error handling patterns, exception catching, diagnostic logging, and fallback mechanisms implemented across NeuroGuard AI.

---

## 1. Standardized Error Response Schema

All backend API routes adhere to a consistent JSON error format:

```json
{
  "message": "Human-readable description of the error"
}
```

When an error is triggered, the appropriate HTTP status code is set:
- **`400 Bad Request`:** Client-side validation failure (e.g., target repetitions $< 1$, past date, missing fields).
- **`401 Unauthorized`:** Missing or invalid Bearer authentication token.
- **`403 Forbidden`:** Privilege violation or IDOR check failure (e.g., patient attempting to view another patient's data).
- **`404 Not Found`:** Requested resource (doctor, appointment, assignment, or report) does not exist.
- **`409 Conflict`:** Slot reservation collision or duplicate account email.
- **`429 Too Many Requests`:** Rate limit exceeded.
- **`500 Internal Server Error`:** Unhandled server-side exception.

---

## 2. Multi-Tier Error Resilience Patterns

### 1. Database Connection Resilience ([db.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/db.js))
- The server does **not crash** if MongoDB is offline or `MONGODB_URI` is missing.
- `connectDB()` catches connection failures, logs a warning, and sets `mongoConnected = false`.
- All database write operations attach `.catch()` handlers that log warnings to `console.warn` while falling back to in-memory state in [store.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/store.js).

### 2. Camera & Computer Vision Resilience ([pose.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/frontend/src/lib/pose.js))
- **GPU Failure Catch:** If `PoseLandmarker.createFromOptions` with `delegate: 'GPU'` fails (e.g., unsupported shader extension), it logs a warning and automatically re-initializes with `delegate: 'CPU'`.
- **Per-Frame Isolation:** In [CameraAssessment.jsx](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/frontend/src/components/CameraAssessment.jsx#L103-L105), a `try...catch` block surrounds `detectForVideo()`. Individual dropped or corrupt frames are silently ignored so the assessment loop stays alive.

### 3. Gemini API Network & Quota Resilience ([geminiService.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/services/geminiService.js))
- **Timeout Management:** An `AbortController` aborts hanging requests after 15 seconds.
- **Error Diagnostics:** `formatDiagnosticMessage(status, errorData, modelName)` maps HTTP 400, 401, 403, 404, 429, and 5xx responses into sanitized diagnostic logs without exposing private keys.
- **Seamless Local Fallback:** On any API failure, the service automatically invokes `buildLocalExplanation()` and returns `{ source: 'local-fallback', text }`.

### 4. Client Session Expiration Resilience ([api.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/frontend/src/lib/api.js))
- If any API request encounters an HTTP 401, the client dispatches a custom window event (`neuroguard:unauthorized`).
- [App.jsx](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/frontend/src/App.jsx#L67-L74) catches this event, executes `handleLogout()`, clears `sessionStorage`, and notifies the patient with a toast: *"Your session has expired. Please sign in again."*

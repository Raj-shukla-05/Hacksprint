# REST API Architecture & Overview

## 1. Design Philosophy

The NeuroGuard AI backend provides a clean, predictable RESTful JSON API. It is designed around healthcare-grade security principles:
- **Stateless Authentication:** All protected endpoints require a cryptographically signed JSON Web Token (JWT) passed in the `Authorization: Bearer <TOKEN>` header.
- **Predictable HTTP Status Codes:** Standard status codes are used consistently across all modules (200, 201, 400, 401, 403, 404, 409, 429, 500).
- **Consistent Error Responses:** Error responses follow a uniform JSON structure:
  ```json
  {
    "message": "Human-readable description of the error"
  }
  ```
- **Payload Sanitization & Size Limits:** Request bodies are capped at 256KB (`express.json({ limit: '256kb' })`) to defend against denial-of-service and memory exhaustion attacks.

---

## 2. Base URL & Environment Configuration

In local development, the backend listens on port `5000`:
```
http://localhost:5000/api
```
The frontend configures this base URL via `VITE_API_BASE_URL` in [frontend/src/lib/api.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/lib/api.js#L1).

---

## 3. Global Headers

### Request Headers
- `Content-Type: application/json`: Required for all `POST`, `PATCH`, and `PUT` endpoints.
- `Authorization: Bearer <JWT_TOKEN>`: Required for all protected routes. Tokens are issued by `/api/auth/login` and `/api/auth/signup`.

### Response Headers
- `X-RateLimit-Limit`: Maximum requests permitted per window.
- `X-RateLimit-Remaining`: Requests remaining in the current window.
- `X-RateLimit-Reset`: Unix timestamp when the rate limit window resets.
- `Retry-After`: Seconds to wait before retrying (sent on HTTP 429).

---

## 4. Complete API Route Map

```
/api
├── /health                                 [GET] Health & DB connectivity check
│
├── /auth
│   ├── /login                              [POST] Authenticate user & issue JWT
│   └── /signup                             [POST] Register user & issue JWT
│
├── /users
│   ├── /:id/dashboard                      [GET] Patient dashboard summary & baseline
│   ├── /:id/assessments                    [GET] Patient assessment history
│   ├── /:id/trends                         [GET] Longitudinal trend data points
│   └── /:id/demo-decline                   [POST] Inject demo decline simulation
│
├── /alerts
│   └── /:id                                [GET] Anomaly alerts for patient
│
├── /assessments                            [POST] Ingest completed kinematic session
│
├── /assignments
│   ├── /                                   [POST] Prescribe protocol (Doctor only)
│   ├── /:id                                [GET] Retrieve assignment detail
│   └── /:id/status                         [PATCH] Transition assignment status
│
├── /patients
│   └── /:patientId/assignments             [GET] Retrieve patient's assignments
│
├── /explanation                            [POST] Request Gemini AI recovery summary
│
├── /speech
│   └── /analyze                            [POST] Analyze speech rate & phonation
│
├── /doctors
│   ├── /                                   [GET] Discovery catalog with search & filters
│   ├── /profile                            [PATCH] Update doctor profile & clinic (Doctor only)
│   ├── /availability                       [PUT] Configure working hours & schedule (Doctor only)
│   ├── /availability/block                 [POST] Block custom slot (Doctor only)
│   ├── /availability/block/:blockId        [DELETE] Unblock slot (Doctor only)
│   ├── /:doctorId                          [GET] Detailed doctor profile
│   ├── /:doctorId/availability             [GET] Available discrete consultation slots
│   └── /:id/assignments                    [GET] Doctor's prescribed assignments (Doctor only)
│
├── /appointments
│   ├── /                                   [POST] Book in-person visit (Rate-limited)
│   ├── /my                                 [GET] Patient appointment list
│   ├── /doctor                             [GET] Attending doctor appointment list
│   ├── /:appointmentId                     [GET] Appointment details
│   ├── /:appointmentId/confirm             [PATCH] Doctor confirms visit
│   ├── /:appointmentId/reject              [PATCH] Doctor declines visit with reason
│   ├── /:appointmentId/cancel              [PATCH] Cancel appointment
│   ├── /:appointmentId/reschedule          [PATCH] Atomically reschedule appointment
│   ├── /:appointmentId/complete            [PATCH] Doctor marks visit complete
│   └── /:appointmentId/no-show             [PATCH] Doctor marks no-show
│
├── /reports
│   ├── /preview                            [GET] Preview compiled recovery report
│   ├── /share                              [POST] Authorize report sharing with doctor
│   ├── /shared-with-me                     [GET] Doctor's received reports
│   ├── /my-shares                          [GET] Patient's active shares
│   ├── /shared/:shareId                    [GET] Retrieve authorized report & log audit
│   └── /shares/:shareId                    [DELETE] Revoke doctor report access
│
├── /notifications
│   ├── /                                   [GET] Retrieve user notifications (Limit 50)
│   ├── /:id/read                           [PATCH] Mark individual notification read
│   └── /read-all                           [POST] Mark all notifications read
│
```

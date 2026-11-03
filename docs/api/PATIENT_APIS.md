# API Reference: Patient & Dashboard Endpoints

## 1. GET /api/health

Public health check endpoint returning service status, active database mode, and active AI engine.

- **Authentication:** None.

### Response (200 OK)
```json
{
  "ok": true,
  "service": "neuroguard-backend",
  "database": "connected",
  "aiService": "gemini",
  "timestamp": "2026-11-03T05:40:00.000Z"
}
```

---

## 2. GET /api/users/:id/dashboard

Retrieves the patient's recovery dashboard summary, current score, moving-window baseline, percentage delta, and domain metric status.

- **Authentication:** Bearer JWT required.
- **Allowed Roles:** Patient (self only), Authorized Doctor (`requireSelfOrDoctor` middleware).

### Request
```http
GET /api/users/user-raj/dashboard HTTP/1.1
Authorization: Bearer <TOKEN>
```

### Response (200 OK)
```json
{
  "user": {
    "id": "user-raj",
    "name": "Raj Kumar",
    "age": 58,
    "role": "patient",
    "preferredLanguage": "English",
    "doctorId": "doctor-priya"
  },
  "summary": {
    "functionalScore": 79,
    "change": 9.7,
    "trend": "Improving",
    "lastAssessment": "2026-09-21T10:30:00.000Z",
    "exerciseType": "arm_raise"
  },
  "metrics": {
    "Movement": { "value": 82, "change": 10.0, "measured": true },
    "Balance": { "value": 71, "change": 4.1, "measured": true },
    "Coordination": { "value": 76, "change": 6.3, "measured": true },
    "Speech": { "value": 84, "change": 0.0, "measured": true }
  },
  "baseline": {
    "functionalScore": 72,
    "window": 5
  }
}
```

### Error Responses
- **401 Unauthorized:** Missing or invalid Bearer token.
- **403 Forbidden:** Patient attempting to access another patient's dashboard.
  ```json
  { "message": "Forbidden: cannot access another patient's private medical records." }
  ```
- **404 Not Found:** User ID does not exist.

---

## 3. GET /api/users/:id/trends

Returns the patient's historical assessments formatted for Recharts longitudinal line charts.

- **Authentication:** Bearer JWT required (`requireSelfOrDoctor`).

### Response (200 OK)
```json
[
  { "day": "D1", "date": "01 Sep", "score": 70, "movement": 68, "balance": 64, "coordination": 69, "speech": 82 },
  { "day": "D2", "date": "03 Sep", "score": 72, "movement": 71, "balance": 66, "coordination": 70, "speech": 83 },
  { "day": "D3", "date": "05 Sep", "score": 71, "movement": 72, "balance": 67, "coordination": 71, "speech": 83 },
  { "day": "D4", "date": "07 Sep", "score": 76, "movement": 77, "balance": 69, "coordination": 72, "speech": 84 },
  { "day": "D5", "date": "10 Sep", "score": 77, "movement": 80, "balance": 71, "coordination": 74, "speech": 84 },
  { "day": "D6", "date": "14 Sep", "score": 79, "movement": 82, "balance": 71, "coordination": 76, "speech": 84 },
  { "day": "D7", "date": "21 Sep", "score": 79, "movement": 82, "balance": 71, "coordination": 76, "speech": 84 }
]
```

---

## 4. GET /api/alerts/:id

Retrieves up to 3 active anomaly alerts for the patient.

- **Authentication:** Bearer JWT required (`requireSelfOrDoctor`).

### Response (200 OK)
```json
[
  {
    "id": "alert-user-raj-1730611200000",
    "severity": "monitor",
    "type": "Change detected",
    "reason": "Functional performance changed by 10% compared with the recent baseline.",
    "timestamp": "21 Sep 2026, 10:30 am",
    "action": "Review change"
  }
]
```

---

## 5. POST /api/users/:id/demo-decline

Injects a 5-day simulated decline scenario into the patient's record to demonstrate real-time triage alerting for evaluators.

- **Authentication:** Public / Internal demo utility.

### Response (200 OK)
```json
{
  "ok": true,
  "message": "Decline demo loaded"
}
```

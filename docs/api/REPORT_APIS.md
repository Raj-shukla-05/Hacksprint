# API Reference: Recovery Report & Sharing Endpoints

## 1. GET /api/reports/preview

Generates an on-the-fly preview of the patient's compiled recovery report directly from genuine historical assessment sessions.

- **Authentication:** Bearer JWT required.
- **Allowed Roles:** `patient` (for self).

### Request
```http
GET /api/reports/preview HTTP/1.1
Authorization: Bearer <TOKEN>
```

### Response (200 OK)
```json
{
  "report": {
    "patient": {
      "id": "user-raj",
      "name": "Raj Kumar",
      "age": 58,
      "preferredLanguage": "English"
    },
    "generatedAt": "2026-11-03T06:50:00.000Z",
    "clinicalDisclaimer": "NeuroGuard AI provides assistive functional monitoring and recovery metric extraction. This report is supplementary clinical documentation and does not constitute a diagnostic evaluation or replacement for professional clinical judgment.",
    "summary": {
      "overallStatus": "stable",
      "currentScore": 79,
      "baselineScore": 73,
      "percentageChange": 9.7,
      "totalAssessments": 7,
      "exerciseBreakdown": {
        "arm_raise": 5,
        "sit_to_stand": 1,
        "seated_reach": 1
      }
    },
    "longitudinalTrends": [
      { "day": "D1", "date": "01 Sep", "score": 70 },
      { "day": "D7", "date": "21 Sep", "score": 79 }
    ],
    "recentAlerts": [],
    "sessions": [
      {
        "id": "assessment-1730612000000",
        "timestamp": "2026-11-03T05:45:00.000Z",
        "exerciseType": "arm_raise",
        "duration": 34,
        "score": 88,
        "metrics": { "movement": 90, "coordination": 86 },
        "trackingQuality": { "isValid": true, "trackingRatio": 0.95 }
      }
    ]
  }
}
```

---

## 2. POST /api/reports/share

Explicitly authorizes and shares the patient's recovery report with an attending doctor. Links the share record to an optional appointment ID, records client IP/User-Agent, and dispatches a notification to the doctor.

- **Authentication:** Bearer JWT required (`patient`).

### Request
```http
POST /api/reports/share HTTP/1.1
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "doctorId": "doc-priya",
  "appointmentId": "apt-1730614500000-q8w2e"
}
```

### Response (201 Created)
```json
{
  "share": {
    "id": "share-1730616600000-x4p9m",
    "patientId": "user-raj",
    "patientName": "Raj Kumar",
    "doctorId": "doc-priya",
    "doctorName": "Dr. Priya Nair",
    "appointmentId": "apt-1730614500000-q8w2e",
    "status": "active",
    "sharedAt": "2026-11-03T06:55:00.000Z",
    "accessAuditLog": [
      {
        "doctorId": "doc-priya",
        "action": "shared",
        "accessedAt": "2026-11-03T06:55:00.000Z",
        "ip": "127.0.0.1",
        "userAgent": "Mozilla/5.0..."
      }
    ]
  }
}
```

---

## 3. GET /api/reports/shared-with-me

Retrieves all active shared recovery reports authorized for the authenticated doctor.

- **Authentication:** Bearer JWT required (`doctor` only).

### Response (200 OK)
```json
{
  "reports": [
    {
      "id": "share-1730616600000-x4p9m",
      "patientId": "user-raj",
      "patientName": "Raj Kumar",
      "status": "active",
      "sharedAt": "2026-11-03T06:55:00.000Z"
    }
  ]
}
```

---

## 4. GET /api/reports/my-shares

Retrieves all reports shared by the authenticated patient.

- **Authentication:** Bearer JWT required (`patient`).

### Response (200 OK)
```json
{
  "reports": [
    {
      "id": "share-1730616600000-x4p9m",
      "doctorId": "doc-priya",
      "doctorName": "Dr. Priya Nair",
      "appointmentId": "apt-1730614500000-q8w2e",
      "status": "active",
      "sharedAt": "2026-11-03T06:55:00.000Z",
      "revokedAt": null
    }
  ]
}
```

---

## 5. GET /api/reports/shared/:shareId

Retrieves the complete data of a specific shared report. If a doctor queries the report, access is verified, revoked status is blocked (HTTP 403), and a new `'viewed'` entry is appended to the audit log.

- **Authentication:** Bearer JWT required (Patient owner or authorized doctor).

### Response (200 OK)
```json
{
  "report": {
    "id": "share-1730616600000-x4p9m",
    "patientId": "user-raj",
    "doctorId": "doc-priya",
    "status": "active",
    "reportData": { "...complete recovery data..." },
    "accessAuditLog": [
      { "action": "shared", "accessedAt": "2026-11-03T06:55:00.000Z" },
      { "action": "viewed", "accessedAt": "2026-11-03T07:00:00.000Z", "ip": "127.0.0.1" }
    ]
  }
}
```

### Error Responses
- **403 Forbidden:** Access revoked by patient:
  ```json
  { "message": "Forbidden: Access to this recovery report has been revoked by the patient." }
  ```
- **403 Forbidden:** Unauthorized doctor attempting to access report:
  ```json
  { "message": "Forbidden: You do not have permission to view this recovery report." }
  ```

---

## 6. DELETE /api/reports/shares/:shareId

Revokes doctor access to a previously shared report.

- **Authentication:** Bearer JWT required (`patient` only).

### Response (200 OK)
```json
{
  "message": "Report access successfully revoked.",
  "report": {
    "id": "share-1730616600000-x4p9m",
    "status": "revoked",
    "revokedAt": "2026-11-03T07:05:00.000Z"
  }
}
```

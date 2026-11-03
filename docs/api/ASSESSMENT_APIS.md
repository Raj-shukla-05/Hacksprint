# API Reference: Assessment, Assignment & AI Explanation Endpoints

## 1. POST /api/assessments

Ingests a completed kinematic movement assessment recorded in the browser. Normalizes metric domains based on exercise type, validates tracking quality, and optionally links the session to a clinician assignment.

- **Authentication:** Bearer JWT required.
- **Allowed Roles:** `patient` (must submit for own `userId`).
- **Safety Checks:** Requires `trackingQuality.isValid !== false` and `validFrames >= 5`.

### Request
```http
POST /api/assessments HTTP/1.1
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "userId": "user-raj",
  "exerciseType": "arm_raise",
  "duration": 34,
  "score": 88,
  "assignmentId": "asgn-seed-1",
  "metrics": {
    "rangeOfMotion": 90,
    "symmetry": 86,
    "movementQuality": 88,
    "repetitions": 5
  },
  "trackingQuality": {
    "validFrames": 380,
    "totalFrames": 400,
    "trackingRatio": 0.95,
    "qualityWarning": null,
    "isValid": true
  }
}
```

### Response (201 Created)
```json
{
  "id": "assessment-1730612000000",
  "userId": "user-raj",
  "assignmentId": "asgn-seed-1",
  "timestamp": "2026-11-03T05:45:00.000Z",
  "exerciseType": "arm_raise",
  "duration": 34,
  "score": 88,
  "metrics": {
    "movement": 90,
    "coordination": 86,
    "rangeOfMotion": 90,
    "symmetry": 86,
    "movementQuality": 88,
    "repetitions": 5
  },
  "trackingQuality": {
    "validFrames": 380,
    "totalFrames": 400,
    "trackingRatio": 0.95,
    "qualityWarning": null,
    "isValid": true
  },
  "source": "live",
  "persisted": true,
  "storage": "mongodb"
}
```

### Error Responses
- **400 Bad Request:** Insufficient tracking frames or missing required fields:
  ```json
  { "message": "Assessment rejected: insufficient valid body tracking frames detected. Please position yourself clearly in frame and try again." }
  ```
- **403 Forbidden:** Submitting on behalf of another user or non-patient attempting submission:
  ```json
  { "message": "Forbidden: cannot submit assessments on behalf of other users" }
  ```

---

## 2. POST /api/assignments

Allows an attending doctor to prescribe a functional exercise protocol for a patient.

- **Authentication:** Bearer JWT required.
- **Allowed Roles:** `doctor`.
- **Validation Rules:**
  - `patientId`: Required valid patient user ID.
  - `instructions`: Non-empty string.
  - `exerciseType`: Must be `'arm_raise'`, `'sit_to_stand'`, or `'seated_reach'`.
  - `targetReps`: Integer between 1 and 30.
  - `dueDate`: Valid ISO date string after start date.

### Request
```http
POST /api/assignments HTTP/1.1
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "patientId": "user-raj",
  "exerciseType": "sit_to_stand",
  "instructions": "Complete 5 slow chair rises with arms crossed. Pause 1 second at the top.",
  "targetReps": 5,
  "dueDate": "2026-11-10T18:00:00.000Z"
}
```

### Response (201 Created)
```json
{
  "assignment": {
    "id": "asgn-1730612500000-k9x2a",
    "doctorId": "doctor-priya",
    "patientId": "user-raj",
    "exerciseType": "sit_to_stand",
    "instructions": "Complete 5 slow chair rises with arms crossed. Pause 1 second at the top.",
    "targetReps": 5,
    "startDate": "2026-11-03T05:50:00.000Z",
    "dueDate": "2026-11-10T18:00:00.000Z",
    "status": "assigned",
    "completedSessionId": null,
    "doctorNotes": "",
    "reviewedAt": null,
    "createdAt": "2026-11-03T05:50:00.000Z",
    "updatedAt": "2026-11-03T05:50:00.000Z"
  }
}
```

---

## 3. GET /api/patients/:patientId/assignments

Retrieves all prescribed assignments for a patient with resolved statuses (`expired`, `in_progress`, `completed`, `reviewed`).

- **Authentication:** Bearer JWT required.
- **Allowed Roles:** Patient (own ID), Authorized Doctor.

### Response (200 OK)
```json
[
  {
    "id": "asgn-seed-1",
    "doctorId": "doctor-priya",
    "patientId": "user-raj",
    "exerciseType": "arm_raise",
    "instructions": "Perform 5 slow, bilateral arm raises in the morning.",
    "targetReps": 5,
    "startDate": "2026-11-01T00:00:00.000Z",
    "dueDate": "2026-11-08T00:00:00.000Z",
    "status": "assigned",
    "completedSessionId": null,
    "completedSession": null
  }
]
```

---

## 4. PATCH /api/assignments/:id/status

Updates assignment status through strict state machine transitions.

- **Authentication:** Bearer JWT required.
- **Allowed Target Statuses:** `'in_progress'`, `'cancelled'`, `'reviewed'`.
  *(Note: Transition to `'completed'` must occur through `POST /api/assessments`)*.

### Doctor Review Request Example
```http
PATCH /api/assignments/asgn-seed-1/status HTTP/1.1
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "status": "reviewed",
  "doctorNotes": "Symmetry has improved by 6%. Continue current protocol for another week."
}
```

### Response (200 OK)
```json
{
  "assignment": {
    "id": "asgn-seed-1",
    "status": "reviewed",
    "doctorNotes": "Symmetry has improved by 6%. Continue current protocol for another week.",
    "reviewedAt": "2026-11-03T05:55:00.000Z"
  }
}
```

---

## 5. POST /api/explanation

Requests a non-diagnostic recovery explanation from the Gemini API or local rule engine based on sanitized findings.

- **Authentication:** None (Internal / Public utility).

### Request
```http
POST /api/explanation HTTP/1.1
Content-Type: application/json

{
  "findings": {
    "trend": "improving",
    "movement_change": 10.0,
    "balance_change": 4.1,
    "baseline_sessions": 5,
    "exercise_type": "arm_raise",
    "measured_metrics": ["movement", "balance"]
  }
}
```

### Response (200 OK)
```json
{
  "source": "gemini",
  "text": "Your functional performance is trending upward, with movement up 10% and balance up 4.1% compared with your recent 5-session baseline. Continue your regular check-ins to support your steady rehabilitation progress."
}
```

---

## 6. POST /api/speech/analyze

Computes speech cadence, pause count, and Jaccard token similarity for phonation assessment.

- **Authentication:** Public / Internal.

### Request
```http
POST /api/speech/analyze HTTP/1.1
Content-Type: application/json

{
  "transcript": "the quick brown fox jumps over the dog",
  "expectedText": "the quick brown fox jumps over the lazy dog",
  "duration": 5.0,
  "pauseCount": 1
}
```

### Response (200 OK)
```json
{
  "speakingDuration": 5.0,
  "pauses": 1,
  "speechRate": 96.0,
  "transcriptionSimilarity": 87.5,
  "wordCount": 8,
  "expectedWordCount": 9
}
```

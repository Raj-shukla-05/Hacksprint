# API Reference: Appointment Endpoints

## 1. POST /api/appointments

Books a verified, in-person clinical consultation slot with an attending doctor. Features concurrency mutex locking and rate limiting (max 15 requests/min).

- **Authentication:** Bearer JWT required.
- **Allowed Roles:** `patient` (for self) or `caregiver` (for authorized patient).
- **Validation:** Date must not be in past; time must align with clinic availability.

### Patient Booking Request
```http
POST /api/appointments HTTP/1.1
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "doctorId": "doc-priya",
  "date": "2026-11-10",
  "startTime": "10:30",
  "reason": "Follow-up evaluation for left shoulder range of motion"
}
```

### Caregiver Proxy Booking Request
```http
POST /api/appointments HTTP/1.1
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "doctorId": "doc-priya",
  "patientId": "user-raj",
  "date": "2026-11-10",
  "startTime": "10:30",
  "reason": "Post-stroke mobility check booked by daughter"
}
```

### Response (201 Created)
```json
{
  "appointment": {
    "id": "apt-1730614500000-q8w2e",
    "patientId": "user-raj",
    "patientName": "Raj Kumar",
    "doctorId": "doc-priya",
    "doctorName": "Dr. Priya Nair",
    "doctorSpecialty": "Neurorehabilitation",
    "clinic": {
      "name": "Apex Neurorehabilitation Center",
      "address": "Plot 42, Hill Road, Bandra West",
      "city": "Mumbai",
      "roomNumber": "OPD Suite 204",
      "phone": "+91 22 2640 1199"
    },
    "date": "2026-11-10",
    "startTime": "10:30",
    "endTime": "11:00",
    "status": "pending",
    "consultationFee": 1200,
    "reason": "Follow-up evaluation for left shoulder range of motion",
    "bookedBy": {
      "userId": "user-raj",
      "role": "patient",
      "name": "Raj Kumar"
    },
    "createdAt": "2026-11-03T06:15:00.000Z"
  }
}
```

### Error Responses
- **409 Conflict:** Slot already booked or currently being reserved by another patient:
  ```json
  { "message": "This appointment slot has already been booked by another patient. Please choose a different slot." }
  ```
- **429 Too Many Requests:** Exceeded booking rate limit:
  ```json
  { "message": "Too many booking requests. Please wait a moment before trying again.", "retryAfter": 45 }
  ```

---

## 2. GET /api/appointments/my

Retrieves the authenticated patient's or caregiver's appointment history, sorted with upcoming visits first.

- **Authentication:** Bearer JWT required (`patient`, `caregiver`).

### Response (200 OK)
```json
{
  "appointments": [
    {
      "id": "apt-1730614500000-q8w2e",
      "doctorId": "doc-priya",
      "doctorName": "Dr. Priya Nair",
      "date": "2026-11-10",
      "startTime": "10:30",
      "endTime": "11:00",
      "status": "confirmed",
      "clinic": {
        "name": "Apex Neurorehabilitation Center",
        "roomNumber": "OPD Suite 204"
      }
    }
  ]
}
```

---

## 3. GET /api/appointments/doctor

Retrieves all clinic appointments scheduled with the authenticated doctor.

- **Authentication:** Bearer JWT required (`doctor` only).

### Response (200 OK)
```json
{
  "appointments": [
    {
      "id": "apt-1730614500000-q8w2e",
      "patientId": "user-raj",
      "patientName": "Raj Kumar",
      "date": "2026-11-10",
      "startTime": "10:30",
      "status": "pending",
      "reason": "Follow-up evaluation for left shoulder range of motion"
    }
  ]
}
```

---

## 4. PATCH /api/appointments/:id/confirm

Attending doctor confirms a pending appointment request.

- **Authentication:** Bearer JWT required (`doctor` only; must be assigned doctor).

### Response (200 OK)
```json
{
  "appointment": {
    "id": "apt-1730614500000-q8w2e",
    "status": "confirmed",
    "updatedAt": "2026-11-03T06:20:00.000Z"
  }
}
```

---

## 5. PATCH /api/appointments/:id/reject

Attending doctor declines a pending appointment request with a mandatory clinical reason.

- **Authentication:** Bearer JWT required (`doctor` only).

### Request
```http
PATCH /api/appointments/apt-1730614500000-q8w2e/reject HTTP/1.1
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "reason": "Emergency surgical procedure scheduled"
}
```

### Response (200 OK)
```json
{
  "appointment": {
    "id": "apt-1730614500000-q8w2e",
    "status": "rejected",
    "rejection": {
      "rejectedBy": "doctor-priya",
      "rejectedAt": "2026-11-03T06:25:00.000Z",
      "reason": "Emergency surgical procedure scheduled"
    }
  }
}
```

---

## 6. PATCH /api/appointments/:id/cancel

Cancels a pending or confirmed appointment. Permitted for the patient, authorized caregiver, or attending doctor.

### Request
```http
PATCH /api/appointments/apt-1730614500000-q8w2e/cancel HTTP/1.1
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "reason": "Patient experiencing transportation difficulty"
}
```

### Response (200 OK)
```json
{
  "appointment": {
    "id": "apt-1730614500000-q8w2e",
    "status": "cancelled",
    "cancellation": {
      "cancelledBy": "user-raj",
      "cancelledByRole": "patient",
      "cancelledAt": "2026-11-03T06:30:00.000Z",
      "reason": "Patient experiencing transportation difficulty"
    }
  }
}
```

---

## 7. PATCH /api/appointments/:id/reschedule

Atomically books a new consultation slot and marks the previous appointment as cancelled in a single coordinated action.

### Request
```http
PATCH /api/appointments/apt-1730614500000-q8w2e/reschedule HTTP/1.1
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "newDate": "2026-11-12",
  "newStartTime": "11:30",
  "reason": "Patient requested later date"
}
```

### Response (200 OK)
```json
{
  "appointment": {
    "id": "apt-1730615400000-v7b1m",
    "patientId": "user-raj",
    "doctorId": "doc-priya",
    "date": "2026-11-12",
    "startTime": "11:30",
    "endTime": "12:00",
    "status": "pending",
    "rescheduleInfo": {
      "rescheduledFromId": "apt-1730614500000-q8w2e",
      "rescheduledAt": "2026-11-03T06:35:00.000Z",
      "previousSlot": "2026-11-10 10:30"
    }
  }
}
```

---

## 8. PATCH /api/appointments/:id/complete

Attending doctor marks a confirmed visit as successfully completed following the in-person clinical encounter.

- **Authentication:** Bearer JWT required (`doctor` only).

### Response (200 OK)
```json
{
  "appointment": {
    "id": "apt-1730615400000-v7b1m",
    "status": "completed",
    "updatedAt": "2026-11-03T06:40:00.000Z"
  }
}
```

---

## 9. PATCH /api/appointments/:id/no-show

Attending doctor marks a confirmed appointment where the patient did not present at the clinic.

- **Authentication:** Bearer JWT required (`doctor` only).

### Response (200 OK)
```json
{
  "appointment": {
    "id": "apt-1730615400000-v7b1m",
    "status": "no-show",
    "updatedAt": "2026-11-03T06:45:00.000Z"
  }
}
```

# API Reference: Doctor & Clinical Management Endpoints

## 1. GET /api/doctors

Retrieves the searchable catalog of verified clinicians, filterable by text query, clinical specialization, and clinic city.

- **Authentication:** Public (No token required).
- **Query Parameters:**
  - `search` (String): Free text matching doctor name, clinic name, address, or specialty.
  - `specialization` (String): Filter by medical specialty (e.g., `'Neurology'`, `'Neurorehabilitation'`).
  - `city` (String): Filter by clinic city (e.g., `'Mumbai'`, `'Kolkata'`).

### Request
```http
GET /api/doctors?specialization=Neurorehabilitation&city=Mumbai HTTP/1.1
```

### Response (200 OK)
```json
{
  "total": 1,
  "doctors": [
    {
      "id": "doc-priya",
      "userId": "doctor-priya",
      "name": "Dr. Priya Nair",
      "specialization": "Neurorehabilitation",
      "qualifications": [
        "MBBS",
        "MD - Physical Medicine & Rehab",
        "Fellowship in Neurorehabilitation"
      ],
      "experienceYears": 14,
      "consultationFee": 1200,
      "bio": "Specialist in post-stroke motor recovery, hemiplegic arm rehabilitation, and evidence-based neuroplasticity protocols.",
      "clinic": {
        "name": "Apex Neurorehabilitation Center",
        "address": "Plot 42, Hill Road, Bandra West",
        "city": "Mumbai",
        "roomNumber": "OPD Suite 204",
        "phone": "+91 22 2640 1199"
      },
      "rating": 4.9
    }
  ]
}
```

---

## 2. GET /api/doctors/:doctorId

Retrieves detailed profile information and clinic operating hours for a specific doctor.

- **Authentication:** Public.

### Response (200 OK)
```json
{
  "doctor": {
    "id": "doc-priya",
    "userId": "doctor-priya",
    "name": "Dr. Priya Nair",
    "specialization": "Neurorehabilitation",
    "experienceYears": 14,
    "consultationFee": 1200,
    "clinic": {
      "name": "Apex Neurorehabilitation Center",
      "address": "Plot 42, Hill Road, Bandra West",
      "city": "Mumbai",
      "roomNumber": "OPD Suite 204",
      "phone": "+91 22 2640 1199"
    },
    "rating": 4.9,
    "workingDays": [1, 2, 3, 4, 5],
    "clinicHours": "09:00 - 17:00"
  }
}
```

---

## 3. GET /api/doctors/:doctorId/availability

Generates discrete, in-person consultation slots for a specific date, factoring in working days, lunch breaks, doctor-blocked times, past times, and reserved slots.

- **Authentication:** Public.
- **Query Parameters:**
  - `date` (String, required): Format `YYYY-MM-DD`.

### Request
```http
GET /api/doctors/doc-priya/availability?date=2026-11-10 HTTP/1.1
```

### Response (200 OK)
```json
{
  "doctor": {
    "id": "doc-priya",
    "name": "Dr. Priya Nair",
    "specialization": "Neurorehabilitation",
    "consultationFee": 1200,
    "clinic": {
      "name": "Apex Neurorehabilitation Center",
      "address": "Plot 42, Hill Road, Bandra West",
      "city": "Mumbai",
      "roomNumber": "OPD Suite 204",
      "phone": "+91 22 2640 1199"
    }
  },
  "date": "2026-11-10",
  "isWorkingDay": true,
  "slots": [
    { "startTime": "09:00", "endTime": "09:30", "available": true, "unavailableReason": null },
    { "startTime": "09:30", "endTime": "10:00", "available": false, "unavailableReason": "Reserved" },
    { "startTime": "10:00", "endTime": "10:30", "available": true, "unavailableReason": null },
    { "startTime": "13:00", "endTime": "13:30", "available": false, "unavailableReason": "Clinic Break" },
    { "startTime": "13:30", "endTime": "14:00", "available": false, "unavailableReason": "Clinic Break" },
    { "startTime": "14:00", "endTime": "14:30", "available": true, "unavailableReason": null }
  ]
}
```

---

## 4. PATCH /api/doctors/profile

Allows the authenticated doctor to update their consultation fee, biography, qualifications, and clinic location.

- **Authentication:** Bearer JWT required.
- **Allowed Roles:** `doctor`.

### Request
```http
PATCH /api/doctors/profile HTTP/1.1
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "consultationFee": 1300,
  "bio": "Updated clinical bio focusing on upper-limb motor rehabilitation.",
  "clinic": {
    "roomNumber": "Suite 205"
  }
}
```

### Response (200 OK)
```json
{
  "doctor": {
    "id": "doc-priya",
    "consultationFee": 1300,
    "bio": "Updated clinical bio focusing on upper-limb motor rehabilitation.",
    "clinic": {
      "name": "Apex Neurorehabilitation Center",
      "address": "Plot 42, Hill Road, Bandra West",
      "city": "Mumbai",
      "roomNumber": "Suite 205",
      "phone": "+91 22 2640 1199"
    },
    "updatedAt": "2026-11-03T06:00:00.000Z"
  }
}
```

---

## 5. PUT /api/doctors/availability

Configures the doctor's weekly working schedule, consultation duration, and standard break hours.

- **Authentication:** Bearer JWT required.
- **Allowed Roles:** `doctor`.

### Request
```http
PUT /api/doctors/availability HTTP/1.1
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "workingDays": [1, 2, 3, 4, 5, 6],
  "dayStartTime": "08:30",
  "dayEndTime": "17:30",
  "slotDurationMinutes": 30,
  "breakStartTime": "13:00",
  "breakEndTime": "14:00"
}
```

### Response (200 OK)
```json
{
  "availability": {
    "doctorId": "doc-priya",
    "workingDays": [1, 2, 3, 4, 5, 6],
    "dayStartTime": "08:30",
    "dayEndTime": "17:30",
    "slotDurationMinutes": 30,
    "breakStartTime": "13:00",
    "breakEndTime": "14:00",
    "updatedAt": "2026-11-03T06:05:00.000Z"
  }
}
```

---

## 6. POST /api/doctors/availability/block

Allows a doctor to block a specific time interval on a given date for personal leave, surgeries, or clinical conferences.

- **Authentication:** Bearer JWT required.
- **Allowed Roles:** `doctor`.

### Request
```http
POST /api/doctors/availability/block HTTP/1.1
Content-Type: application/json
Authorization: Bearer <TOKEN>

{
  "date": "2026-11-12",
  "startTime": "14:00",
  "endTime": "16:00",
  "reason": "Hospital Neuro Board Review"
}
```

### Response (201 Created)
```json
{
  "blockedSlot": {
    "id": "block-1730613900000",
    "date": "2026-11-12",
    "startTime": "14:00",
    "endTime": "16:00",
    "reason": "Hospital Neuro Board Review",
    "createdAt": "2026-11-03T06:10:00.000Z"
  }
}
```

---

## 7. DELETE /api/doctors/availability/block/:blockId

Removes a previously blocked slot from the doctor's calendar.

- **Authentication:** Bearer JWT required (`doctor` only).

### Response (200 OK)
```json
{
  "ok": true,
  "message": "Blocked slot removed"
}
```

---

## 8. GET /api/doctors/:id/patients

Retrieves the doctor's assigned patient roster with active protocol counts and total completed sessions.

- **Authentication:** Bearer JWT required.
- **Allowed Roles:** `doctor` (ID must match caller).

### Response (200 OK)
```json
[
  {
    "id": "user-raj",
    "name": "Raj Kumar",
    "age": 58,
    "status": "stable",
    "score": 79,
    "change": 9.7,
    "lastCheck": "Today, 10:42 AM",
    "doctorId": "doctor-priya",
    "sessions": 7,
    "activeAssignments": 1
  },
  {
    "id": "user-anita",
    "name": "Anita Sharma",
    "age": 63,
    "status": "monitor",
    "score": 72,
    "change": -7.2,
    "lastCheck": "Yesterday, 6:18 PM",
    "doctorId": "doctor-priya",
    "sessions": 4,
    "activeAssignments": 0
  },
  {
    "id": "user-mohan",
    "name": "Mohan Singh",
    "age": 66,
    "status": "review",
    "score": 68,
    "change": -13.0,
    "lastCheck": "Yesterday, 4:05 PM",
    "doctorId": "doctor-priya",
    "sessions": 6,
    "activeAssignments": 0
  }
]
```

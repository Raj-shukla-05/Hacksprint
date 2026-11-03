# API Reference: Notification Endpoints

## 1. GET /api/notifications

Retrieves the latest in-app notifications for the authenticated user (capped at the 50 most recent records).

- **Authentication:** Bearer JWT required.
- **Allowed Roles:** All authenticated roles (`patient`, `doctor`, `caregiver`).

### Request
```http
GET /api/notifications HTTP/1.1
Authorization: Bearer <TOKEN>
```

### Response (200 OK)
```json
{
  "notifications": [
    {
      "id": "notif-1730617000000-m3k8q",
      "userId": "user-raj",
      "type": "booking_confirmed",
      "title": "Appointment Confirmed",
      "message": "Dr. Dr. Priya Nair confirmed your in-person visit for 2026-11-10 at 10:30 at Apex Neurorehabilitation Center.",
      "appointmentId": "apt-1730614500000-q8w2e",
      "read": false,
      "createdAt": "2026-11-03T07:10:00.000Z"
    },
    {
      "id": "notif-1730616600000-b5j2x",
      "userId": "user-raj",
      "type": "booking_created",
      "title": "Appointment Request Submitted",
      "message": "Your in-person visit with Dr. Priya Nair at Apex Neurorehabilitation Center on 2026-11-10 at 10:30 has been submitted.",
      "appointmentId": "apt-1730614500000-q8w2e",
      "read": true,
      "createdAt": "2026-11-03T06:55:00.000Z"
    }
  ]
}
```

---

## 2. PATCH /api/notifications/:id/read

Marks a single notification as read for the authenticated user.

- **Authentication:** Bearer JWT required.

### Request
```http
PATCH /api/notifications/notif-1730617000000-m3k8q/read HTTP/1.1
Authorization: Bearer <TOKEN>
```

### Response (200 OK)
```json
{
  "notification": {
    "id": "notif-1730617000000-m3k8q",
    "userId": "user-raj",
    "read": true
  }
}
```

### Error Responses
- **404 Not Found:** Notification not found or belongs to another user:
  ```json
  { "message": "Notification not found" }
  ```

---

## 3. POST /api/notifications/read-all

Marks all unread notifications as read for the authenticated user in a single operation.

- **Authentication:** Bearer JWT required.

### Request
```http
POST /api/notifications/read-all HTTP/1.1
Authorization: Bearer <TOKEN>
```

### Response (200 OK)
```json
{
  "ok": true,
  "message": "All notifications marked as read"
}
```

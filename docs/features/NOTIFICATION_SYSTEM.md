# Feature Documentation: In-App Notification System & Event Triggers

---

## 1. Feature Name
**In-App Notification Dispatch, Polling Synchronization & Notification Center**

---

## 2. What is this feature?
The Notification System provides in-app event notifications for clinical and appointment lifecycle changes across all user roles. It features an automated event dispatcher ([notificationService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/notificationService.js)), an interactive topbar notification center with real-time unread badges ([Topbar.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/Topbar.jsx)), and individual/bulk read management.

> [!NOTE]
> **Delivery Architecture:** The notification system utilizes **client-side HTTP polling (15-second interval)** over authenticated REST endpoints (`GET /api/notifications`). It does **not** rely on persistent WebSockets or Server-Sent Events (SSE), ensuring compatibility with serverless and firewalled hospital network environments.

---

## 3. Why was this feature developed?
- **Real-Time Clinical Awareness:** Both doctors and patients need immediate updates when an appointment is booked, confirmed, rescheduled, or cancelled.
- **Report Security Awareness:** When a patient authorizes a doctor to view their recovery report—or revokes that access—both parties receive written notifications documenting the change.
- **Reliable Low-Overhead Architecture:** HTTP polling requires zero persistent socket connection state on the server, ensuring zero socket-disconnect overhead.

---

## 4. Who uses this feature?
- **All Roles (Patient, Doctor):** Each user receives notifications targeted to their `userId` in the topbar bell icon.

---

## 5. How does this feature work?
1. An action occurs in another service (e.g., patient books an appointment in `appointmentService.js`).
2. The service calls `createNotification({ userId, type, title, message, appointmentId })`.
3. The notification is saved to MongoDB (or the in-memory array) with `read: false`.
4. On the frontend, [Topbar.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/Topbar.jsx#L19-L23) polls `GET /api/notifications` every 15 seconds (`setInterval(loadNotifications, 15000)`).
5. The bell icon displays an unread count badge (e.g. `1` or `3`).
6. The user clicks the bell icon, opening a dropdown list of recent notifications.
7. The user can click the checkmark on an individual notification to mark it read (`PATCH /api/notifications/:id/read`) or click *"Mark all read"* (`POST /api/notifications/read-all`).

---

## 6. Frontend implementation
- **Source Files:**
  - [Topbar.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/Topbar.jsx#L8-L125): State `notifications`, `showDropdown`, polling effect (`setInterval`), outside-click dismiss listener, and click handlers `handleMarkRead` and `handleMarkAllRead`.
  - [api.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/api.js#L120-L122):
    - `api.notifications()`
    - `api.markNotificationRead(id)`
    - `api.markAllNotificationsRead()`

---

## 7. Backend implementation
- **Source Files:**
  - [services/notificationService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/notificationService.js):
    - `createNotification()`: Asynchronously inserts a notification.
    - `getUserNotifications(userId)`: Returns latest 50 notifications sorted by `createdAt: -1`.
    - `markNotificationAsRead(id, userId)`: Sets `read: true` for a single notification.
    - `markAllNotificationsAsRead(userId)`: Sets `read: true` for all of a user's notifications.
  - [routes/notificationRoutes.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/notificationRoutes.js):
    - `GET /api/notifications`
    - `PATCH /api/notifications/:id/read`
    - `POST /api/notifications/read-all`

---

## 8. Database implementation
- Uses [Notification.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/Notification.js):
  ```javascript
  const NotificationSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: [
        'booking_created', 'booking_confirmed', 'booking_rejected',
        'appointment_cancelled', 'appointment_rescheduled',
        'report_shared', 'report_revoked', 'general'
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    appointmentId: { type: String, default: null },
    read: { type: Boolean, default: false, index: true },
    createdAt: { type: Date, default: Date.now },
  });
  ```

---

## 9. Notification Trigger Points in Codebase

| Event Trigger | Recipient | Notification Type | Source Location |
| :--- | :--- | :--- | :--- |
| **New Appointment Created** | Doctor | `booking_created` | [appointmentService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/appointmentService.js#L399-L405) |
| **Appointment Confirmation** | Patient | `booking_confirmed` | [appointmentService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/appointmentService.js#L468-L474) |
| **Appointment Rejection** | Patient | `booking_rejected` | [appointmentService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/appointmentService.js#L496-L502) |
| **Appointment Cancelled by Doctor** | Patient | `appointment_cancelled` | [appointmentService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/appointmentService.js#L527-L534) |
| **Appointment Cancelled by Patient** | Doctor | `appointment_cancelled` | [appointmentService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/appointmentService.js#L536-L543) |
| **Report Shared with Doctor** | Doctor | `report_shared` | [reportSharingService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/reportSharingService.js#L203-L209) |
| **Report Access Revoked** | Doctor | `report_revoked` | [reportSharingService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/reportSharingService.js#L348-L355) |

---

## 10. Data flow
```
Application Event (e.g. Doctor Confirms Appointment) 
  ──> createNotification() 
  ──> Persist to MongoDB Notification / store.js 
  ──> [Client Polling Every 15s] ──> GET /api/notifications 
  ──> Topbar renders unread badge (1) 
  ──> User clicks bell ──> Dropdown opens 
  ──> Click checkmark ──> PATCH /api/notifications/:id/read 
  ──> Unread badge clears
```

---

## 11. External dependencies
- Built without external push notification services (e.g. Firebase Cloud Messaging / OneSignal).

---

## 12. Security and privacy
- Enforces `authenticateToken` on all notification endpoints.
- Users can only fetch notifications matching their own `req.user.userId`.
- Notification text contains summary information and does not expose private passwords or API keys.

---

## 13. Limitations
- Notifications are in-app only; SMS and email delivery are not yet implemented.
- Polling introduces an average 7.5-second latency before a new notification appears in the UI.

---

## 14. Example execution
1. Patient Raj Kumar cancels his appointment with Dr. Priya Nair.
2. `transitionAppointmentStatus` triggers `createNotification`:
   ```javascript
   {
     userId: 'doctor-priya',
     type: 'appointment_cancelled',
     title: 'Appointment Cancelled by Patient',
     message: 'Raj Kumar cancelled their visit on 2026-11-10 at 10:30: Patient unwell.'
   }
   ```
3. Within 15 seconds, Dr. Priya's topbar bell badge updates with an unread dot.
4. She opens the dropdown, reads the cancellation message, and marks it as read.

---

## 15. Important technical interview questions

#### Q1: Does the notification system use WebSockets, SSE, or HTTP polling?
**Answer:** It uses **HTTP polling**. In [Topbar.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/Topbar.jsx#L21), a `setInterval(loadNotifications, 15000)` executes every 15 seconds. This design was chosen for prototype simplicity and reliability in hospital networks that block WebSocket upgrades.

#### Q2: How does the server prevent memory bloat in the notifications array?
**Answer:** In [notificationService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/notificationService.js#L35-L44), queries are capped using `.limit(50)` in MongoDB and `.slice(0, 50)` in memory, returning only the 50 most recent notifications per user.

#### Q3: What happens if a notification cannot be saved to MongoDB?
**Answer:** In [notificationService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/notificationService.js#L20-L26), the notification is added to the in-memory array first (`notifications.unshift(notif)`). The MongoDB `create` promise attaches a `.catch()`, ensuring errors do not break user flows.

#### Q4: What prevents User A from marking User B's notifications as read?
**Answer:** In [notificationService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/notificationService.js#L47-L58), `markNotificationAsRead` requires both `id` and `userId`. MongoDB executes `findOneAndUpdate({ id, userId }, { read: true })`. If the notification belongs to another user, no document matches.

#### Q5: How is the unread counter calculated?
**Answer:** On the client in [Topbar.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/Topbar.jsx#L38), `unreadCount = notifications.filter((n) => !n.read).length`. It renders as an absolute badge `<span className="unread-badge">{unreadCount}</span>`.

#### Q6: How does the dropdown close when clicking outside?
**Answer:** [Topbar.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/Topbar.jsx#L26-L36) attaches a `mousedown` event listener to `document`. If `dropdownRef.current && !dropdownRef.current.contains(event.target)`, it sets `showDropdown(false)`.

#### Q7: What notification types are supported?
**Answer:** Defined in `NotificationSchema`: `booking_created`, `booking_confirmed`, `booking_rejected`, `appointment_cancelled`, `appointment_rescheduled`, `report_shared`, `report_revoked`, and `general`.

#### Q8: Are notifications deleted after being read?
**Answer:** No. They are retained with `read: true` so users can inspect historical notifications in their dropdown.

#### Q9: How would the notification system be scaled for production?
**Answer:** In production, HTTP polling would be replaced with Server-Sent Events (SSE) or WebSockets backed by a Redis Pub/Sub cluster, supplemented by SMS/Email webhooks via Twilio or SendGrid.

#### Q10: How are notifications handled during in-memory fallback mode?
**Answer:** They are stored in the `notifications` array in [store.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/store.js#L228), supporting all creation, retrieval, and read operations in memory.

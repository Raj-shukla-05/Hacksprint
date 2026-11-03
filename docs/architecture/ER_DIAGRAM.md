# Entity-Relationship (ER) Diagram

This document presents the complete Entity-Relationship schema for NeuroGuard AI, detailing cross-collection references, relational keys, cardinality, and field-level constraints across both MongoDB and the in-memory fallback store.

---

## 1. Complete Entity-Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ ASSESSMENT : "records"
    USER ||--o{ ASSIGNMENT : "assigned as patient"
    USER ||--o{ APPOINTMENT : "books as patient"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ ALERT : "triggered for"
    USER ||--o| DOCTOR : "has clinical profile"
    USER ||--o{ SHARED_RECOVERY_REPORT : "authorizes as patient"

    DOCTOR ||--o{ ASSIGNMENT : "prescribes as clinician"
    DOCTOR ||--o{ APPOINTMENT : "attends clinical visit"
    DOCTOR ||--|| DOCTOR_AVAILABILITY : "configures schedule"
    DOCTOR ||--o{ SHARED_RECOVERY_REPORT : "receives shared report"

    ASSIGNMENT ||--o| ASSESSMENT : "completed by session"
    APPOINTMENT ||--o| SHARED_RECOVERY_REPORT : "associated with report"

    USER {
        string id PK "Unique identifier (user-raj, doc-priya)"
        string name "Full display name"
        string email UK "Login email"
        string passwordHash "Bcrypt hash"
        string role "patient | doctor"
        int age "Patient age"
        string preferredLanguage "Language preference"
        string doctorId FK "Assigned primary clinician"
        date createdAt
    }

    DOCTOR {
        string id PK "Doctor ID (doc-priya)"
        string userId FK,UK "References User.id"
        string name "Formatted name (Dr. Priya Nair)"
        string specialization "Neurology, Neurorehabilitation, etc."
        string_array qualifications "MBBS, MD, etc."
        int experienceYears "Years in practice"
        number consultationFee "Fee in INR"
        string bio "Clinical focus"
        object clinic "name, address, city, roomNumber, phone"
        number rating "1.0 to 5.0"
        boolean isActive "Roster status"
        date createdAt
        date updatedAt
    }

    DOCTOR_AVAILABILITY {
        string id PK "Availability ID"
        string doctorId FK,UK "References Doctor.id"
        int_array workingDays "Days of week [1..5]"
        string dayStartTime "HH:mm (09:00)"
        string dayEndTime "HH:mm (17:00)"
        int slotDurationMinutes "15, 20, 30, 45, 60"
        string breakStartTime "HH:mm (13:00)"
        string breakEndTime "HH:mm (14:00)"
        string_array unavailableDates "Array of YYYY-MM-DD"
        object_array blockedSlots "id, date, startTime, endTime, reason"
        date updatedAt
    }

    APPOINTMENT {
        string id PK "Appointment ID (apt-...)"
        string patientId FK "References User.id"
        string patientName "Patient display name"
        string doctorId FK "References Doctor.id"
        string doctorName "Doctor display name"
        string doctorSpecialty "Specialty name"
        object clinic "Snapshot of clinic location"
        string date "YYYY-MM-DD"
        string startTime "HH:mm"
        string endTime "HH:mm"
        string status "pending | confirmed | rejected | cancelled | completed | no-show"
        number consultationFee "Snapshot of fee"
        string reason "Chief medical concern"
        object bookedBy "userId, role, name"
        object cancellation "cancelledBy, cancelledByRole, cancelledAt, reason"
        object rejection "rejectedBy, rejectedAt, reason"
        string sharedReportId FK "References SharedRecoveryReport.id"
        object rescheduleInfo "rescheduledFromId, rescheduledAt, previousSlot"
        date createdAt
        date updatedAt
    }

    ASSESSMENT {
        string id PK "Assessment ID (assessment-...)"
        string userId FK "References User.id"
        string assignmentId FK "References Assignment.id"
        date timestamp "Assessment timestamp"
        string exerciseType "arm_raise | sit_to_stand | seated_reach"
        number duration "Duration in seconds"
        number score "Functional score (0-100)"
        object metrics "movement, balance, coordination, speech"
        object trackingQuality "validFrames, totalFrames, trackingRatio, isValid"
        string source "live | demo | seed"
    }

    ASSIGNMENT {
        string id PK "Assignment ID (asgn-...)"
        string doctorId FK "References Doctor.userId"
        string patientId FK "References User.id"
        string exerciseType "arm_raise | sit_to_stand | seated_reach"
        string instructions "Clinician-approved instructions"
        int targetReps "1 to 50"
        date startDate "Start timestamp"
        date dueDate "Due deadline"
        string status "assigned | in_progress | completed | reviewed | cancelled | expired"
        string completedSessionId FK "References Assessment.id"
        string doctorNotes "Clinician review feedback"
        date reviewedAt "Timestamp of review"
        date createdAt
        date updatedAt
    }

    SHARED_RECOVERY_REPORT {
        string id PK "Share ID (share-...)"
        string patientId FK "References User.id"
        string patientName "Patient display name"
        string doctorId FK "References Doctor.id"
        string doctorName "Doctor display name"
        string appointmentId FK "References Appointment.id"
        string status "active | revoked"
        object reportData "Full compiled recovery profile"
        date sharedAt "Timestamp of consent"
        date revokedAt "Timestamp of revocation"
        object_array accessAuditLog "doctorId, action, accessedAt, ip, userAgent"
        date createdAt
        date updatedAt
    }

    NOTIFICATION {
        string id PK "Notification ID (notif-...)"
        string userId FK "References User.id"
        string type "booking_created | booking_confirmed | report_shared | etc."
        string title "Notification header"
        string message "Notification body text"
        string appointmentId FK "Optional linked appointment ID"
        boolean read "Read status flag"
        date createdAt
    }

    ALERT {
        string id PK "Alert ID"
        string userId FK "References User.id"
        string severity "review | monitor | stable"
        string type "Persistent deviation | Change detected"
        string reason "Explanatory reason"
        string timestamp "Formatted timestamp"
        string action "Recommended clinical action"
        date createdAt
    }
```

---

## 2. Relational Cardinality & Integrity Rules

| Relationship | Cardinality | Cascade & Delete Behavior | Enforcement Mechanism |
| :--- | :--- | :--- | :--- |
| **User $\rightarrow$ Assessment** | $1 : N$ | Deleting a patient retains historical assessment provenance. | Soft deletion / Inactive flag in enterprise tier. |
| **Doctor $\rightarrow$ DoctorAvailability** | $1 : 1$ | Deleting a doctor record cascades to delete their schedule configuration. | Managed in `seedService.js` and `Doctor.remove()`. |
| **Doctor $\rightarrow$ Appointment** | $1 : N$ | Doctors cannot be deleted if active pending or confirmed appointments exist. | Application middleware checks before profile deactivation. |
| **Patient $\rightarrow$ Assignment** | $1 : N$ | Deleting an assignment preserves completed session records in `Assessment`. | `completedSessionId` remains linked to `Assessment.id`. |
| **Appointment $\leftrightarrow$ SharedRecoveryReport** | $1 : 0..1$ | Cancelling or completing an appointment does **not** revoke the shared report. | Reports are independently revocable via `DELETE /api/reports/shares/:id`. |

---

## 3. Database Indexes and Performance Optimizations

1. **Appointment Double-Booking Partial Unique Index:**
   ```javascript
   AppointmentSchema.index(
     { doctorId: 1, date: 1, startTime: 1 },
     {
       unique: true,
       partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } }
     }
   );
   ```
   *Guarantees zero double-booking at the storage level while allowing cancelled, rejected, or completed slots to be re-booked.*
2. **Assessment User & Date Index:**
   - `{ userId: 1, timestamp: -1 }`: Optimizes longitudinal trend queries and moving-window calculations.
3. **Doctor Discovery Compound Index:**
   - `{ isActive: 1, specialization: 1, 'clinic.city': 1 }`: Supports multi-filter search queries in [doctorRoutes.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/doctorRoutes.js).
4. **Notification User Unread Index:**
   - `{ userId: 1, read: 1, createdAt: -1 }`: Optimizes the 15-second polling query for unread badges.

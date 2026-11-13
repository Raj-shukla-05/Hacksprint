# End-to-End Workflow: In-Person Appointment Discovery, Mutex Booking & Confirmation

This document traces the complete lifecycle of an in-person clinical consultation—from doctor discovery and availability slot generation to atomic mutex booking, double-booking prevention, doctor confirmation, and clinical visit completion.

---

## 1. Complete Appointment Lifecycle Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Patient as Patient
    participant UI as React AppointmentsPage / BookingModal
    participant Routes as appointmentRoutes.js
    participant Service as appointmentService.js
    participant Lock as activeBookingLocks (Mutex Set)
    participant DB as MongoDB (Partial Unique Index)
    actor Doctor
    participant DocUI as DoctorAppointmentsPage.jsx
    participant Notif as notificationService.js

    Patient->>UI: Searches Doctors (Specialty: 'Neurorehabilitation', City: 'Mumbai')
    UI->>Routes: GET /api/doctors?specialization=...
    Routes-->>UI: Return Matching Doctor Profiles
    
    Patient->>UI: Clicks "Book In-Person Visit" on Dr. Priya Nair
    UI->>Routes: GET /api/doctors/doc-priya/availability?date=2026-11-10
    Routes->>Service: getAvailableSlots('doc-priya', '2026-11-10')
    Service->>DB: Query active appointments (pending / confirmed)
    Service->>Service: Filter working days, break (13:00-14:00), past slots & reserved
    Service-->>UI: Return Discrete Slots (09:00, 09:30, 10:00, etc.)
    
    Patient->>UI: Selects "10:30" & Submits Booking
    UI->>Routes: POST /api/appointments { doctorId, date, startTime, reason }
    Routes->>Routes: Validate rate limit (max 15/min)
    Routes->>Service: bookAppointment()
    
    Service->>Lock: Acquire Mutex Key ("doc-priya:2026-11-10:10:30")
    alt Lock already held by another concurrent request
        Lock-->>Service: Collision!
        Service-->>UI: HTTP 409 Conflict ("Slot currently being processed")
    else Lock acquired
        Service->>DB: Insert Appointment Document (status: 'pending')
        alt Duplicate Key Error (E11000 from Partial Unique Index)
            DB-->>Service: Uniqueness violation
            Service->>Lock: Release Mutex
            Service-->>UI: HTTP 409 Conflict ("Slot already booked")
        else Insertion Succeeded
            Service->>Notif: Create Notification for Doctor ("New Booking Request")
            Service->>Notif: Create Notification for Patient ("Request Submitted")
            Service->>Lock: Release Mutex
            Service-->>UI: HTTP 201 Created (Appointment Details)
        end
    end
    UI->>Patient: Toast: "In-person visit requested for 2026-11-10 at 10:30"

    Doctor->>DocUI: Opens "Schedule" Tab in Clinic Portal
    DocUI->>Routes: GET /api/appointments/doctor
    Routes-->>DocUI: List appointments including pending request
    
    Doctor->>DocUI: Clicks "Confirm Appointment"
    DocUI->>Routes: PATCH /api/appointments/:id/confirm
    Routes->>Service: transitionAppointmentStatus('confirmed')
    Service->>DB: Update status to 'confirmed'
    Service->>Notif: Dispatch Notification to Patient ("Appointment Confirmed")
    Routes-->>DocUI: Return Updated Appointment
    
    Note over Patient,Doctor: In-Person Consultation takes place at Clinic OPD Suite 204
    
    Doctor->>DocUI: Clicks "Mark Complete"
    DocUI->>Routes: PATCH /api/appointments/:id/complete
    Routes->>Service: transitionAppointmentStatus('completed')
    Service->>DB: Update status to 'completed'
    Routes-->>DocUI: Visit Archived as Completed
```

---

## 2. Step-by-Step Technical Execution

### Step 1: Doctor Discovery & Availability Exploration
- **Frontend Action:** Patient selects filters in [AppointmentsPage.jsx](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/frontend/src/pages/AppointmentsPage.jsx).
- **API Call:** `GET /api/doctors` with query filters `search`, `specialization`, and `city`.
- **Backend Handler:** [doctorRoutes.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/routes/doctorRoutes.js#L11-L81) searches both in-memory and MongoDB doctor records.

### Step 2: Slot Generation with Break & Block Exclusion
- **Frontend Action:** Patient opens [BookingModal.jsx](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/frontend/src/components/BookingModal.jsx) and selects a date.
- **API Call:** `GET /api/doctors/:id/availability?date=YYYY-MM-DD`.
- **Backend Processing:** In [appointmentService.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/services/appointmentService.js#L97-L249):
  1. Checks if the date is a working day (`availability.workingDays.includes(dayOfWeek)`).
  2. Checks if the date is in `unavailableDates`.
  3. Iterates in 30-minute increments from 09:00 to 17:00.
  4. Marks lunch break (13:00–14:00) with `available: false` and `unavailableReason: 'Clinic Break'`.
  5. Marks doctor-blocked slots with `available: false` and the doctor's custom reason.
  6. Marks past times today as `available: false`.
  7. Checks existing active bookings in MongoDB/store.js; any reserved slot is marked `available: false`.

### Step 3: Atomic Booking & Race-Condition Defense
- **Rate Limiting:** In [appointmentRoutes.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/routes/appointmentRoutes.js#L23), `bookingRateLimiter` ensures requests do not exceed 15 per minute per IP.
- **Mutex Acquisition:** In [appointmentService.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/services/appointmentService.js#L292-L302), a mutex string `${doctor.id}:${date}:${startTime}` is registered in `activeBookingLocks`.
- **Database Insertion:** Inserts the appointment document. MongoDB evaluates the partial unique index:
  ```javascript
  AppointmentSchema.index({ doctorId: 1, date: 1, startTime: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } } });
  ```
  If another process inserted the identical slot, MongoDB throws a duplicate key error (`code: 11000`), caught and translated to HTTP 409 Conflict.
- **Mutex Release:** In the `finally` block, `activeBookingLocks.delete(lockKey)` releases the lock.

### Step 4: Notification Dispatch
- The service calls `createNotification()`:
  - Doctor receives a `booking_created` alert: *"Raj Kumar has booked an in-person clinical visit on 2026-11-10 at 10:30."*
  - Patient receives a confirmation alert: *"Your in-person visit with Dr. Priya Nair... has been submitted."*

### Step 5: Doctor Confirmation & Lifecycle Transitions
- **Confirmation:** The attending doctor reviews their schedule on [DoctorAppointmentsPage.jsx](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/frontend/src/pages/DoctorAppointmentsPage.jsx) and clicks *"Confirm"*. `PATCH /api/appointments/:id/confirm` transitions status from `'pending'` to `'confirmed'` and notifies the patient.
- **Completion:** Following the physical clinic encounter, the doctor clicks *"Mark Complete"*. Status transitions to `'completed'`.
- **Cancellation / Rescheduling:** If the visit cannot take place, the patient or doctor can cancel or atomically reschedule using [RescheduleModal.jsx](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/frontend/src/components/RescheduleModal.jsx).

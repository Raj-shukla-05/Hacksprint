# Feature Documentation: Doctor Appointment Management & In-Person Scheduling

---

## 1. Feature Name
**In-Person Doctor Appointment Scheduling, Atomic Concurrency & Clinic Management System**

---

## 2. What is this feature?
This feature provides an end-to-end appointment discovery, availability generation, atomic booking, and lifecycle management system for **in-person clinical visits**. It features doctor discovery with multi-parameter filtering, discrete slot generation with break exclusion, double-booking prevention using an in-memory mutex and MongoDB partial unique indexes, atomic rescheduling, and role-enforced state transitions.

> [!IMPORTANT]
> **Strict Product Requirement:** Every appointment in NeuroGuard AI represents an **in-person, physical clinical consultation** at a verified hospital or rehabilitation clinic. Online telemedicine, video calls, and virtual consults are intentionally out of scope. Physical presence is required for manual neuro-motor examinations, spasticity grading, and physical therapy adjustments.

---

## 3. Why was this feature developed?
- **Anchoring Digital Health to Real-World Care:** Functional home monitoring is most impactful when connected to physical medical consultations.
- **Eliminating Double-Booking Conflicts:** High-demand specialists cannot afford double-booked consultation slots. The booking engine guarantees race-condition immunity.
- **Clinician Schedule Autonomy:** Doctors must have direct control over their clinic working hours, lunch breaks, vacation days, and ad-hoc blocked slots (e.g., attending clinical conferences).
- **Caregiver Proxy Access:** Stroke patients frequently rely on family members to manage medical logistics.

---

## 4. Who uses this feature?
- **Patient:** Discovers doctors, selects consultation dates/slots, books in-person visits, reschedules, or cancels.
- **Caregiver:** Books and manages appointments on behalf of an authorized patient.
- **Doctor:** Manages clinic working hours and breaks, blocks slots, confirms pending appointments, rejects with reasons, marks completed visits, and logs no-shows.

---

## 5. How does this feature work?
1. The user navigates to the Doctor Appointments tab ([AppointmentsPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AppointmentsPage.jsx)).
2. The user searches for clinicians by name or filters by specialization (Neurology, Neurorehabilitation, Physiotherapy, PM&R) and city.
3. The user clicks *"Book In-Person Visit"*, opening [BookingModal.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/BookingModal.jsx).
4. The client requests `GET /api/doctors/:id/availability?date=YYYY-MM-DD`.
5. The backend generates discrete 30-minute slots between clinic start and end times, excluding lunch breaks (13:00–14:00), past slots, doctor-blocked slots, and slots already reserved.
6. The user selects an available slot and submits `POST /api/appointments`.
7. The backend acquires a mutex lock (`activeBookingLocks`) for `{doctorId}:{date}:{startTime}`.
8. The backend inserts the appointment, enforced by a MongoDB partial unique index.
9. If another user simultaneously attempts to book the same slot, they receive HTTP 409 Conflict.
10. The appointment is created with status `'pending'`, and notifications are dispatched to both the patient and doctor.

---

## 6. Frontend implementation
- **Source Files:**
  - [AppointmentsPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AppointmentsPage.jsx): Multi-tab patient view (`Find Doctors`, `My Appointments`, `Shared Reports`).
  - [DoctorAppointmentsPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/DoctorAppointmentsPage.jsx): Doctor clinic schedule management, status filters, block slot form, confirm/reject/complete action buttons.
  - [BookingModal.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/BookingModal.jsx): Date picker, available slot pills, physical clinic location summary, and in-person badge.
  - [RescheduleModal.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/RescheduleModal.jsx): Atomic rescheduling dialog to select a new date and available slot.
- **State Management:**
  - `activeTab`: `'find'`, `'appointments'`, or `'reports'`.
  - `selectedSpecialty`, `selectedCity`, `search`: Search filters.
  - `slotsData`: Dynamic slots array with `available: true/false` and `unavailableReason`.

---

## 7. Backend implementation
- **Source Files:**
  - [routes/doctorRoutes.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/doctorRoutes.js):
    - `GET /api/doctors`: Discovery catalog with search and filters.
    - `GET /api/doctors/:id`: Detailed doctor profile.
    - `GET /api/doctors/:id/availability`: Generates discrete daily slots.
    - `PATCH /api/doctors/profile`: Doctor updates fee, bio, clinic info.
    - `PUT /api/doctors/availability`: Doctor configures working days, hours, and duration.
    - `POST /api/doctors/availability/block`: Doctor blocks specific slot.
    - `DELETE /api/doctors/availability/block/:id`: Doctor removes blocked slot.
  - [routes/appointmentRoutes.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/appointmentRoutes.js):
    - `POST /api/appointments`: Books appointment (rate limited).
    - `GET /api/appointments/my`: Patient/Caregiver appointment list.
    - `GET /api/appointments/doctor`: Doctor appointment list.
    - `PATCH /api/appointments/:id/confirm`: Doctor confirms.
    - `PATCH /api/appointments/:id/reject`: Doctor declines with reason.
    - `PATCH /api/appointments/:id/cancel`: User or Doctor cancels.
    - `PATCH /api/appointments/:id/reschedule`: Atomic rescheduling.
    - `PATCH /api/appointments/:id/complete`: Doctor marks visit complete.
    - `PATCH /api/appointments/:id/no-show`: Doctor marks no-show.
  - [services/appointmentService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/appointmentService.js): Slot generation algorithms, mutex locking, and state transitions.

---

## 8. Database implementation
- **Models Used:** [Appointment.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/Appointment.js), [Doctor.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/Doctor.js), [DoctorAvailability.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/DoctorAvailability.js).
- **Partial Unique Index in MongoDB ([Appointment.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/Appointment.js#L54-L64)):**
  ```javascript
  AppointmentSchema.index(
    { doctorId: 1, date: 1, startTime: 1 },
    {
      unique: true,
      partialFilterExpression: {
        status: { $in: ['pending', 'confirmed'] },
      },
    }
  );
  ```

---

## 9. Algorithms and Mathematical Formulas

### 1. Discrete Time Slot Generation Algorithm
Given `dayStartTime` ($T_{\text{start}}$), `dayEndTime` ($T_{\text{end}}$), and `slotDurationMinutes` ($D$):
1. Convert all times to minutes since midnight:
   $$\text{mins}(H:M) = H \times 60 + M$$
2. Iterate from $m = \text{mins}(T_{\text{start}})$ to $m + D \le \text{mins}(T_{\text{end}})$ with step $D$:
   $$\text{SlotStart} = \text{time}(m), \quad \text{SlotEnd} = \text{time}(m + D)$$
3. Slot Availability Evaluation:
   $$\text{Available} \iff (\text{IsWorkingDay}) \land (\text{Date} \notin \text{UnavailableDates}) \land (\text{No Break Overlap}) \land (\text{Not Blocked}) \land (\text{Not Past}) \land (\text{Not Booked})$$

### 2. Double-Booking Mutex Lock Logic
```javascript
const lockKey = `${doctor.id}:${date}:${startTime}`;
if (activeBookingLocks.has(lockKey)) {
  const err = new Error('Slot currently being processed. Please choose another.');
  err.statusCode = 409;
  throw err;
}
activeBookingLocks.add(lockKey);
try {
  // Check available slots & insert to DB
} finally {
  activeBookingLocks.delete(lockKey);
}
```

---

## 10. Data flow
```
Patient selects slot 
  ──> POST /api/appointments 
  ──> RateLimiter (max 15/min) 
  ──> Acquire Mutex activeBookingLocks 
  ──> Verify slot is available in getAvailableSlots() 
  ──> Insert to MongoDB (Partial Unique Index) 
  ──> Add to in-memory appointments array 
  ──> Dispatch notifications to Patient & Doctor 
  ──> Release Mutex 
  ──> Return HTTP 201 Created
```

---

## 11. External dependencies
- No external calendar APIs (e.g. Google Calendar) required; built as a self-contained clinical scheduling engine.

---

## 12. Security and privacy
- **Role Enforcement:** Patients cannot confirm, complete, or reject appointments. Only attending doctors can confirm, complete, or log no-shows.
- **Isolation:** Doctors cannot confirm or complete appointments assigned to a different doctor (`isDoctorUser` check).
- **Rate Limiting:** `bookingRateLimiter` limits booking requests to 15 per minute per IP/user to prevent slot hoarding attacks.

---

## 13. Limitations
- Does not currently support recurring appointment series (e.g., repeating every Tuesday for 6 weeks).
- Consultation fee payments are recorded for billing records; integrated payment gateway webhooks (e.g. Razorpay/Stripe) are planned for production.

---

## 14. Example execution
1. Anita Sharma (caregiver) books an appointment for Raj Kumar with Dr. Priya Nair for November 10 at 10:30 AM.
2. The slot is verified as a working day (Monday), outside lunch break (13:00–14:00), and currently unreserved.
3. Mutex is acquired; appointment is inserted with status `'pending'`.
4. Dr. Priya Nair receives an in-app notification: *"Raj Kumar has booked an in-person clinical visit on 2026-11-10 at 10:30."*
5. Dr. Priya reviews her schedule and clicks *"Confirm"*, transitioning status to `'confirmed'`.
6. Raj Kumar receives a confirmation notification.

---

## 15. Important technical interview questions

#### Q1: How does NeuroGuard prevent double-booking race conditions during simultaneous requests?
**Answer:** It uses a two-tier defense: (1) an application-level mutex using an in-memory `Set` (`activeBookingLocks`) that rejects simultaneous requests for the same `{doctorId}:{date}:{startTime}` with HTTP 409 Conflict, and (2) a database-level MongoDB partial unique index on `{ doctorId: 1, date: 1, startTime: 1 }` filtered on active statuses (`pending`, `confirmed`).

#### Q2: Why is a partial unique index used instead of a standard unique index?
**Answer:** In healthcare scheduling, if an appointment is cancelled or rejected, that slot becomes available again for another patient. A standard unique index would permanently prevent that slot from ever being booked again. A partial unique index applies uniqueness only to active appointments (`status: { $in: ['pending', 'confirmed'] }`).

#### Q3: How does the system enforce that appointments are in-person only?
**Answer:** The architecture contains no video call URLs, WebRTC signaling servers, or telemedicine flags. In [BookingModal.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/BookingModal.jsx#L70-L103), the UI displays *"IN-PERSON CLINICAL VISIT ONLY"* and renders physical clinic attributes (street address, city, room/suite number, clinic phone).

#### Q4: How does atomic rescheduling work?
**Answer:** In [appointmentService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/appointmentService.js#L602-L665), `rescheduleAppointment()` executes two coordinated steps: (1) it books the new requested slot via `bookAppointment()`, attaching metadata (`rescheduledFromId`, `previousSlot`), and (2) marks the previous appointment as `cancelled` with reason `"Rescheduled to [newDate] at [newStartTime]"`.

#### Q5: Can a patient mark their own visit as completed?
**Answer:** No. In [appointmentRoutes.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/appointmentRoutes.js#L234-L245), `PATCH /api/appointments/:id/complete` requires `requireRole('doctor')` and verifies that the calling user is the attending clinician. Any attempt by a patient returns HTTP 403 Forbidden.

#### Q6: How are clinic lunch breaks excluded from availability?
**Answer:** In [appointmentService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/appointmentService.js#L195-L200), `getAvailableSlots()` converts `breakStartTime` (13:00) and `breakEndTime` (14:00) into minutes. Any slot overlapping this interval is marked with `available: false` and `unavailableReason: 'Clinic Break'`.

#### Q7: What happens if a patient attempts to book an appointment in the past?
**Answer:** In [appointmentService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/appointmentService.js#L79-L92), `validateDate()` compares the target date against midnight of today. If in the past, or if the time slot has already passed today, the request is rejected with HTTP 400 Bad Request.

#### Q8: How can a doctor block time for personal leave or clinical conferences?
**Answer:** Doctors can call `POST /api/doctors/availability/block` with `{ date, startTime, endTime, reason }`. The slot generator automatically marks any overlapping slot as unavailable with the doctor's custom reason.

#### Q9: What happens when an appointment is rejected by the doctor?
**Answer:** The status transitions to `'rejected'`. The rejection reason is recorded in the `rejection` subdocument, a notification is sent to the patient, and the slot is instantly freed for other patients.

#### Q10: How does rate limiting protect the appointment service?
**Answer:** In [appointmentRoutes.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/appointmentRoutes.js#L16-L23), `bookingRateLimiter` limits requests to 15 per minute per IP/user, preventing automated bots or malicious scripts from scraping doctor schedules or locking slots.

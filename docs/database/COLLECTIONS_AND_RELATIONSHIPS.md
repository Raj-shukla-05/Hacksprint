# Database Collections, Foreign References & Relationships

This document details the relational architecture, cross-collection references, and cardinality across all collections in the NeuroGuard AI database.

---

## 1. Relational Map & Cardinality Summary

```
[ User (patient) ] 1 ───────────< N [ Assessment ]
        │                                  │
        │ 1                                │ 0..1
        │                                  │
        v N                                v 1
[ Assignment ] >────────────────────── [ User (doctor) ]
        ^                                  │
        │                                  │ 1
        │                                  │
        │ 0..1                             v 1
[ Appointment ] >───────────────────── [ Doctor ] 1 ──── 1 [ DoctorAvailability ]
        │                                  │
        │ 0..1                             │ N
        │                                  │
        v 1                                v 1
[ SharedRecoveryReport ] >──────────── [ AccessAuditLog ]
```

---

## 2. Collection References and Key Linkages

### 1. User $\leftrightarrow$ Doctor
- **Primary Link:** `Doctor.userId` references `User.id` ($1:1$).
- **Relationship:** When a user registers with `role: 'doctor'`, `User.id` (e.g. `'doctor-priya'`) is created, and the seed/signup pipeline creates `Doctor.id` (`'doc-priya'`) with `Doctor.userId = 'doctor-priya'`.
- **Integrity Rule:** `findDoctor(doctorIdOrUserId)` in [appointmentService.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/services/appointmentService.js#L15-L34) dynamically queries either `id` or `userId`, ensuring seamless cross-referencing.

### 2. Doctor $\leftrightarrow$ DoctorAvailability
- **Primary Link:** `DoctorAvailability.doctorId` references `Doctor.id` ($1:1$).
- **Relationship:** Every active clinician has exactly one availability profile governing their clinic hours, working days, and blocked slots.

### 3. Patient $\leftrightarrow$ Assessment
- **Primary Link:** `Assessment.userId` references `User.id` ($1:N$).
- **Relationship:** A stroke patient accumulates multiple assessment records over time. The longitudinal baseline engine slices these records to build personal trend models.

### 4. Assignment $\leftrightarrow$ Assessment
- **Primary Link:** `Assignment.completedSessionId` references `Assessment.id` ($1:1$ optional).
- **Secondary Link:** `Assessment.assignmentId` references `Assignment.id` ($N:1$ optional).
- **Relationship:** When a patient performs an assessment prescribed by their clinician, `POST /api/assessments` links the session record to the assignment and transitions the assignment status to `'completed'`.

### 5. Patient $\leftrightarrow$ Doctor (Clinical Assignment)
- **Primary Link:** `User.doctorId` references `Doctor.userId` or `Doctor.id` ($N:1$).
- **Relationship:** In the prototype, patients are assigned to a primary clinician (`doctorId: 'doctor-priya'`). When a doctor creates an assignment for an unassigned patient, the system automatically assigns the patient to that doctor.

### 6. Appointment $\leftrightarrow$ SharedRecoveryReport
- **Primary Link:** `Appointment.sharedReportId` references `SharedRecoveryReport.id` ($1:1$ optional).
- **Secondary Link:** `SharedRecoveryReport.appointmentId` references `Appointment.id` ($1:1$ optional).
- **Relationship:** When a patient authorizes sharing their recovery profile for an upcoming clinic visit, both records are linked. However, the report is an independent consent document; cancelling the appointment does **not** delete or invalidate the shared report.

# Database Architecture

## 1. Dual-Storage Architecture (MongoDB & In-Memory)

NeuroGuard AI implements a robust, dual-storage persistence architecture designed to support both production enterprise deployments with MongoDB and zero-configuration local evaluations:

```
+-----------------------------------------------------------------------------------+
|                        NEUROGUARD PERSISTENCE ENGINE                              |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|           Incoming Write Operation (e.g. bookAppointment / createAssessment)      |
|                                       |                                           |
|                   +-------------------+-------------------+                       |
|                   |                                       |                       |
|                   v                                       v                       |
|      [ In-Memory Store: store.js ]        [ MongoDB Database: Mongoose 8.9 ]      |
|      • Synchronous array / map push       • Asynchronous Mongoose .create()       |
|      • Zero external dependency           • Permanent disk persistence            |
|      • Fast unit & integration tests      • Partial unique compound indexes       |
|      • Instant demo readiness             • High scalability                      |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### Connection Management ([db.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/db.js))
- When the backend starts (`require.main === module`), `connectDB()` inspects `process.env.MONGODB_URI`.
- If the URI is absent or empty, the server logs a notice and initializes in resilient in-memory mode without crashing.
- If a URI is present, Mongoose attempts connection with a 4-second timeout (`serverSelectionTimeoutMS: 4000`). If connection fails (e.g., database offline), it logs a warning and automatically falls back to in-memory mode.
- The function `isMongoConnected()` dynamically verifies whether Mongoose is active (`mongoose.connection.readyState === 1`).

---

## 2. Seed Synchronization Service ([seedService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/seedService.js))

When MongoDB connects successfully, `seedDatabaseIfEmpty()` runs automatically to ensure database consistency:

1. **Doctor Seeding:** Checks the `Doctor` collection and provisions default clinical profiles (Dr. Priya Nair, Dr. Vikram Rao, Dr. Sunita Menon, Dr. Arvind Patel) if they are missing.
2. **Availability Seeding:** Checks the `DoctorAvailability` collection and sets default schedules (Monday–Friday, 09:00–17:00, 30-minute slots, 13:00–14:00 lunch break).
3. **User & Credential Sync:** Seeds initial accounts (patient Raj Kumar, caregiver Anita Sharma, doctor Dr. Priya Nair) with bcrypt password hashes.
4. **Auto-Provisioning for New Doctors:** Scans all users with `role: 'doctor'`. If any doctor registered without an explicit clinical profile, the service automatically generates their `Doctor` and `DoctorAvailability` records.
5. **Memory Synchronization:** Rehydrates in-memory arrays in `store.js` with active records from MongoDB so queries return consistent data regardless of access path.

---

## 3. Database Collections and Mongoose Schemas

The application defines 9 distinct Mongoose schemas in `backend/src/models/`:

### 1. User (`users` collection) — [User.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/User.js)
Stores authentication credentials, profile data, and relational links across roles.
- `id` (String, unique, indexed): Unique user identifier (`user-raj`, `doc-priya`).
- `name` (String, required): Full display name.
- `email` (String, required, unique, lowercase): Login email.
- `passwordHash` (String, required): Bcrypt hash.
- `role` (String, enum: `['patient', 'doctor', 'caregiver']`, default: `'patient'`).
- `age` (Number): Optional patient age.
- `preferredLanguage` (String, default: `'English'`).
- `doctorId` (String, indexed): Assigned doctor ID for patients.
- `authorizedCaregivers` ([String]): Array of caregiver user IDs permitted to access this patient's records.
- `caregiverPatients` ([String]): Array of patient IDs this caregiver is authorized to manage.

### 2. Doctor (`doctors` collection) — [Doctor.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/Doctor.js)
Stores professional credentials and physical clinic information.
- `id` (String, unique, indexed): Doctor domain ID (`doc-priya`).
- `userId` (String, unique, indexed): Corresponding `User.id`.
- `name` (String, required): Formatted name (e.g. `Dr. Priya Nair`).
- `specialization` (String, enum: `['Neurology', 'Physical Medicine and Rehabilitation', 'Physiotherapy', 'Occupational Therapy', 'Speech and Language Therapy', 'Neurorehabilitation']`).
- `qualifications` ([String]): Medical degrees and certifications.
- `experienceYears` (Number, min: 0): Years in practice.
- `consultationFee` (Number, min: 0): Consultation fee in INR (₹).
- `bio` (String): Clinical focus summary.
- `clinic` (Object): Physical clinic details:
  - `name`, `address`, `city`, `roomNumber`, `phone`.
- `rating` (Number, min: 1, max: 5): Patient feedback rating.
- `isActive` (Boolean, default: true).

### 3. DoctorAvailability (`doctoravailabilities` collection) — [DoctorAvailability.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/DoctorAvailability.js)
Configures scheduling rules and blocked calendar periods.
- `doctorId` (String, required, unique, indexed): Target doctor ID.
- `workingDays` ([Number]): Days of week (0 = Sunday, 1 = Monday ... 6 = Saturday).
- `dayStartTime` (String, default: `'09:00'`): Format `HH:mm`.
- `dayEndTime` (String, default: `'17:00'`): Format `HH:mm`.
- `slotDurationMinutes` (Number, enum: `[15, 20, 30, 45, 60]`, default: 30).
- `breakStartTime` (String, default: `'13:00'`).
- `breakEndTime` (String, default: `'14:00'`).
- `unavailableDates` ([String]): Array of `YYYY-MM-DD` vacation dates.
- `blockedSlots` ([Object]): Ad-hoc blocked slots:
  - `id`, `date`, `startTime`, `endTime`, `reason`.

### 4. Appointment (`appointments` collection) — [Appointment.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/Appointment.js)
Stores verified in-person clinical encounters.
- `id` (String, unique, indexed): Format `apt-<timestamp>-<hash>`.
- `patientId`, `patientName` (String, required).
- `doctorId`, `doctorName`, `doctorSpecialty` (String, required).
- `clinic` (Object): Snapshot of clinic location at time of booking.
- `date` (String, required, indexed): `YYYY-MM-DD`.
- `startTime`, `endTime` (String, required): `HH:mm`.
- `status` (String, enum: `['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no-show']`, default: `'pending'`).
- `consultationFee` (Number, required).
- `reason` (String): Chief patient concern.
- `bookedBy` (Object: `{ userId, role, name }`).
- `cancellation` (Object: `{ cancelledBy, cancelledByRole, cancelledAt, reason }`).
- `rejection` (Object: `{ rejectedBy, rejectedAt, reason }`).
- `sharedReportId` (String, default: null): Linked recovery report share ID.
- `rescheduleInfo` (Object: `{ rescheduledFromId, rescheduledAt, previousSlot }`).

### 5. Assessment (`assessments` collection) — [Assessment.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/Assessment.js)
Stores recorded kinematic assessment sessions.
- `id` (String, unique, indexed): Format `assessment-<timestamp>`.
- `userId` (String, required, indexed).
- `assignmentId` (String, indexed, nullable): Linked clinician assignment.
- `timestamp` (Date, default: Date.now).
- `exerciseType` (String, required): `arm_raise`, `sit_to_stand`, or `seated_reach`.
- `duration` (Number): Session duration in seconds.
- `score` (Number, min: 0, max: 100): Calculated functional score.
- `metrics` (Mixed): Normalized metrics (`movement`, `balance`, `coordination`, `rangeOfMotion`, `symmetry`).
- `trackingQuality` (Object): `{ validFrames, totalFrames, trackingRatio, qualityWarning, isValid }`.
- `source` (String, default: `'live'`).

### 6. Assignment (`assignments` collection) — [Assignment.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/Assignment.js)
Stores clinician-prescribed home exercise protocols.
- `id` (String, unique, indexed): Format `asgn-<timestamp>-<hash>`.
- `doctorId` (String, required, indexed).
- `patientId` (String, required, indexed).
- `exerciseType` (String, enum: `['arm_raise', 'sit_to_stand', 'seated_reach']`).
- `instructions` (String, required): Clinician guidance.
- `targetReps` (Number, min: 1, max: 50, default: 5).
- `startDate` (Date, default: Date.now).
- `dueDate` (Date, required).
- `status` (String, enum: `['assigned', 'in_progress', 'completed', 'reviewed', 'cancelled', 'expired']`, default: `'assigned'`).
- `completedSessionId` (String, nullable): Linked `Assessment.id`.
- `doctorNotes` (String): Review feedback attached by clinician.
- `reviewedAt` (Date, nullable).

### 7. SharedRecoveryReport (`sharedrecoveryreports` collection) — [SharedRecoveryReport.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/SharedRecoveryReport.js)
Stores authorized recovery reports shared between patients and doctors.
- `id` (String, unique, indexed): Format `share-<timestamp>-<hash>`.
- `patientId`, `patientName` (String, required, indexed).
- `doctorId`, `doctorName` (String, required, indexed).
- `appointmentId` (String, nullable, indexed).
- `status` (String, enum: `['active', 'revoked']`, default: `'active'`).
- `reportData` (Mixed): Complete compiled snapshot of recovery metrics, baseline trends, and sessions.
- `sharedAt` (Date, default: Date.now).
- `revokedAt` (Date, nullable).
- `accessAuditLog` ([AccessAuditSchema]): Array of `{ doctorId, action, accessedAt, ip, userAgent }`.

### 8. Notification (`notifications` collection) — [Notification.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/Notification.js)
Stores in-app notifications.
- `id` (String, unique, indexed): Format `notif-<timestamp>-<hash>`.
- `userId` (String, required, indexed).
- `type` (String, enum: `['booking_created', 'booking_confirmed', 'booking_rejected', 'appointment_cancelled', 'appointment_rescheduled', 'report_shared', 'report_revoked', 'general']`).
- `title`, `message` (String, required).
- `appointmentId` (String, nullable).
- `read` (Boolean, default: false, indexed).

### 9. Alert (`alerts` collection) — [Alert.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/Alert.js)
Stores functional anomaly alerts generated by the baseline engine.
- `id` (String, unique, indexed).
- `userId` (String, required, indexed).
- `severity` (String, enum: `['review', 'monitor', 'stable']`).
- `type` (String, e.g. `'Persistent deviation'`).
- `reason` (String).
- `timestamp` (String).
- `action` (String, e.g. `'Review recommended'`).

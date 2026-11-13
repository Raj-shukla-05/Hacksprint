# Database Models Reference & Field Specifications

This document provides complete field-level technical specifications for all 9 Mongoose schemas in NeuroGuard AI.

---

## 1. User Model ([models/User.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/models/User.js))

Stores core authentication, identity, and relational linkage data.

| Field | Type | Required | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `id` | String | **Yes** | — | Unique identifier (`user-raj`, `doctor-priya`). Indexed, Unique. |
| `name` | String | **Yes** | — | User's full display name (trimmed). |
| `email` | String | **Yes** | — | Login email address (lowercase, trimmed). Indexed, Unique. |
| `passwordHash` | String | **Yes** | — | Bcrypt hash with work factor of 10. |
| `role` | String | **Yes** | `'patient'` | Enum: `['patient', 'doctor']`. |
| `age` | Number | No | `null` | Patient age in years. |
| `preferredLanguage`| String | No | `'English'` | Preferred communication language. |
| `doctorId` | String | No | `null` | Primary attending doctor user ID (indexed). |
| `createdAt` | Date | No | `Date.now` | Account creation timestamp. |

---

## 2. Doctor Model ([models/Doctor.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/models/Doctor.js))

Stores professional medical credentials and physical clinic location metadata.

| Field | Type | Required | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `id` | String | **Yes** | — | Doctor domain ID (`doc-priya`). Indexed, Unique. |
| `userId` | String | **Yes** | — | Corresponding `User.id`. Indexed, Unique. |
| `name` | String | **Yes** | — | Formatted clinical name (e.g. `Dr. Priya Nair`). |
| `specialization` | String | **Yes** | — | Enum: `['Neurology', 'Physical Medicine and Rehabilitation', 'Physiotherapy', 'Occupational Therapy', 'Speech and Language Therapy', 'Neurorehabilitation']`. |
| `qualifications` | [String] | No | `[]` | Array of degrees (e.g. `['MBBS', 'MD - PMR']`). |
| `experienceYears` | Number | **Yes** | `0` | Years in clinical practice (min: 0). |
| `consultationFee` | Number | **Yes** | `0` | Consultation fee in INR (₹) (min: 0). |
| `bio` | String | No | `''` | Clinical focus summary (max 1000 chars). |
| `clinic.name` | String | **Yes** | — | Name of physical rehabilitation facility. |
| `clinic.address` | String | **Yes** | — | Physical street address. |
| `clinic.city` | String | **Yes** | — | City location (e.g. `'Mumbai'`). |
| `clinic.roomNumber`| String | No | `'Suite 101'` | Physical room or OPD suite number. |
| `clinic.phone` | String | **Yes** | — | Clinic front desk contact number. |
| `rating` | Number | No | `null` | Aggregated patient feedback rating (1.0 to 5.0). |
| `isActive` | Boolean| No | `true` | Active roster status flag. |
| `createdAt` | Date | No | `Date.now` | Record creation timestamp. |
| `updatedAt` | Date | No | `Date.now` | Last profile update timestamp. |

---

## 3. DoctorAvailability Model ([models/DoctorAvailability.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/models/DoctorAvailability.js))

Configures working schedule rules, consultation durations, and ad-hoc calendar blocks.

| Field | Type | Required | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `id` | String | **Yes** | — | Availability record identifier (`avail-doc-priya`). Indexed, Unique. |
| `doctorId` | String | **Yes** | — | Target doctor identifier. Indexed, Unique. |
| `workingDays` | [Number] | **Yes** | `[1,2,3,4,5]` | Days of week (0=Sun, 1=Mon, ..., 6=Sat). |
| `dayStartTime` | String | **Yes** | `'09:00'` | Daily clinic opening time in `HH:mm`. |
| `dayEndTime` | String | **Yes** | `'17:00'` | Daily clinic closing time in `HH:mm`. |
| `slotDurationMinutes`| Number| **Yes** | `30` | Duration per slot. Enum: `[15, 20, 30, 45, 60]`. |
| `breakStartTime` | String | No | `'13:00'` | Clinic lunch break start time in `HH:mm`. |
| `breakEndTime` | String | No | `'14:00'` | Clinic lunch break end time in `HH:mm`. |
| `unavailableDates` | [String] | No | `[]` | Array of vacation/leave dates (`YYYY-MM-DD`). |
| `blockedSlots` | [Object] | No | `[]` | Ad-hoc blocked intervals (`{ id, date, startTime, endTime, reason }`). |
| `updatedAt` | Date | No | `Date.now` | Last schedule modification timestamp. |

---

## 4. Appointment Model ([models/Appointment.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/models/Appointment.js))

Stores confirmed or requested in-person clinical consultations.

| Field | Type | Required | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `id` | String | **Yes** | — | Unique appointment ID (`apt-<timestamp>-<hash>`). Indexed, Unique. |
| `patientId` | String | **Yes** | — | Patient user identifier (indexed). |
| `patientName` | String | **Yes** | — | Patient display name. |
| `doctorId` | String | **Yes** | — | Attending doctor identifier (indexed). |
| `doctorName` | String | **Yes** | — | Attending doctor display name. |
| `doctorSpecialty` | String | **Yes** | — | Doctor specialization. |
| `clinic` | Object | **Yes** | — | Immutable snapshot of clinic address, room, and phone. |
| `date` | String | **Yes** | — | Consultation date in `YYYY-MM-DD` (indexed). |
| `startTime` | String | **Yes** | — | Slot start time in `HH:mm`. |
| `endTime` | String | **Yes** | — | Slot end time in `HH:mm`. |
| `status` | String | **Yes** | `'pending'` | Enum: `['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no-show']` (indexed). |
| `consultationFee` | Number | **Yes** | — | Fee snapshot at time of booking. |
| `reason` | String | No | `''` | Chief complaint or reason for visit. |
| `bookedBy` | Object | **Yes** | — | Identity of booking user (`{ userId, role, name }`). |
| `cancellation` | Object | No | `{}` | Details if cancelled (`{ cancelledBy, cancelledByRole, cancelledAt, reason }`). |
| `rejection` | Object | No | `{}` | Details if doctor declined (`{ rejectedBy, rejectedAt, reason }`). |
| `sharedReportId` | String | No | `null` | Linked `SharedRecoveryReport.id`. |
| `rescheduleInfo` | Object | No | `{}` | Linkage if rescheduled (`{ rescheduledFromId, rescheduledAt, previousSlot }`). |
| `createdAt` | Date | No | `Date.now` | Booking timestamp. |

---

## 5. Assessment Model ([models/Assessment.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/models/Assessment.js))

Stores completed kinematic movement assessment records.

| Field | Type | Required | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `id` | String | **Yes** | — | Assessment ID (`assessment-<timestamp>`). Indexed, Unique. |
| `userId` | String | **Yes** | — | Patient user identifier (indexed). |
| `assignmentId` | String | No | `null` | Linked clinician assignment ID (indexed). |
| `timestamp` | Date | No | `Date.now` | Exact session timestamp (indexed). |
| `exerciseType` | String | **Yes** | — | Exercise protocol (`arm_raise`, `sit_to_stand`, `seated_reach`). |
| `duration` | Number | No | `0` | Session duration in seconds. |
| `score` | Number | **Yes** | — | Composite score from 0 to 100 (min: 0, max: 100). |
| `metrics` | Mixed | No | `{}` | Domain metrics (`movement`, `balance`, `coordination`, `rangeOfMotion`, `symmetry`). |
| `trackingQuality` | Object | No | `{}` | Edge validation metadata (`{ validFrames, totalFrames, trackingRatio, isValid }`). |
| `source` | String | No | `'live'` | Data provenance (`'live'`, `'demo'`, or `'seed'`). |

---

## 6. Assignment Model ([models/Assignment.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/models/Assignment.js))

Stores clinician-prescribed home exercise protocols.

| Field | Type | Required | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `id` | String | **Yes** | — | Assignment ID (`asgn-<timestamp>-<hash>`). Indexed, Unique. |
| `doctorId` | String | **Yes** | — | Prescribing doctor user ID (indexed). |
| `patientId` | String | **Yes** | — | Target patient user ID (indexed). |
| `exerciseType` | String | **Yes** | `'arm_raise'`| Enum: `['arm_raise', 'sit_to_stand', 'seated_reach']`. |
| `instructions` | String | **Yes** | — | Clinician guidance notes. |
| `targetReps` | Number | No | `5` | Repetition target (min: 1, max: 50). |
| `startDate` | Date | No | `Date.now` | Protocol active start timestamp. |
| `dueDate` | Date | **Yes** | — | Protocol completion deadline. |
| `status` | String | **Yes** | `'assigned'` | Enum: `['assigned', 'in_progress', 'completed', 'reviewed', 'cancelled', 'expired']` (indexed). |
| `completedSessionId` | String | No | `null` | Linked `Assessment.id` once completed. |
| `doctorNotes` | String | No | `''` | Clinician review feedback notes. |
| `reviewedAt` | Date | No | `null` | Timestamp when doctor completed review. |

---

## 7. SharedRecoveryReport Model ([models/SharedRecoveryReport.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/models/SharedRecoveryReport.js))

Stores authorized clinical recovery reports with access audit logs.

| Field | Type | Required | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `id` | String | **Yes** | — | Share identifier (`share-<timestamp>-<hash>`). Indexed, Unique. |
| `patientId` | String | **Yes** | — | Patient user identifier (indexed). |
| `patientName` | String | **Yes** | — | Patient display name. |
| `doctorId` | String | **Yes** | — | Recipient doctor identifier (indexed). |
| `doctorName` | String | **Yes** | — | Recipient doctor display name. |
| `appointmentId` | String | No | `null` | Associated appointment ID (indexed). |
| `status` | String | **Yes** | `'active'` | Access status. Enum: `['active', 'revoked']` (indexed). |
| `reportData` | Mixed | **Yes** | — | Compiled recovery snapshot (metrics, baseline, trends, sessions). |
| `sharedAt` | Date | No | `Date.now` | Timestamp when patient consented. |
| `revokedAt` | Date | No | `null` | Timestamp if access was revoked. |
| `accessAuditLog` | [Object] | No | `[]` | Array of audit events (`{ doctorId, action, accessedAt, ip, userAgent }`). |

---

## 8. Notification Model ([models/Notification.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/models/Notification.js))

Stores in-app event notifications.

| Field | Type | Required | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `id` | String | **Yes** | — | Notification identifier (`notif-...`). Indexed, Unique. |
| `userId` | String | **Yes** | — | Recipient user ID (indexed). |
| `type` | String | **Yes** | — | Enum: `['booking_created', 'booking_confirmed', 'booking_rejected', 'appointment_cancelled', 'appointment_rescheduled', 'report_shared', 'report_revoked', 'general']`. |
| `title` | String | **Yes** | — | Notification title. |
| `message` | String | **Yes** | — | Notification message body. |
| `appointmentId` | String | No | `null` | Optional linked appointment ID. |
| `read` | Boolean| No | `false` | Read status flag (indexed). |
| `createdAt` | Date | No | `Date.now` | Creation timestamp. |

---

## 9. Alert Model ([models/Alert.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/models/Alert.js))

Stores anomaly alerts generated by the baseline trend engine.

| Field | Type | Required | Default | Description |
| :--- | :--- | :---: | :---: | :--- |
| `id` | String | **Yes** | — | Unique alert ID. Indexed, Unique. |
| `userId` | String | **Yes** | — | Target patient user ID (indexed). |
| `severity` | String | No | `'monitor'` | Enum: `['review', 'monitor', 'stable']`. |
| `type` | String | **Yes** | — | Alert category (e.g. `'Persistent deviation'`). |
| `reason` | String | **Yes** | — | Plain-language explanation of deviation. |
| `timestamp` | String | **Yes** | — | Formatted display timestamp. |
| `action` | String | **Yes** | — | Recommended clinical action. |
| `createdAt` | Date | No | `Date.now` | Creation timestamp. |

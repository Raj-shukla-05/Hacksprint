# 04 — Feature Catalog

This catalog outlines all features and functional modules in the NeuroGuard AI platform, indexing their implementation status, primary components, associated endpoints, and database models.

---

## Comprehensive Feature Matrix

| ID | Feature Name | Primary Role(s) | Implementation Status | Frontend Components | Backend Endpoints | Persistence Model |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F01** | **User Authentication & RBAC** | Patient, Doctor | **REAL IMPLEMENTATION** | [LoginPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/LoginPage.jsx) | `POST /api/auth/login`<br>`POST /api/auth/signup` | `User`, `Doctor`, `DoctorAvailability` |
| **F02** | **Patient Recovery Dashboard** | Patient | **REAL IMPLEMENTATION** | [PatientDashboard.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/PatientDashboard.jsx), [MetricCard.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/MetricCard.jsx), [ScoreRing.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/ScoreRing.jsx) | `GET /api/users/:id/dashboard`<br>`GET /api/alerts/:id` | `Assessment`, `Alert`, `Assignment` |
| **F03** | **MediaPipe Computer Vision Pipeline** | Patient | **REAL IMPLEMENTATION** | [pose.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/pose.js), [CameraAssessment.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/CameraAssessment.jsx) | N/A (On-Device Local Processing) | Local WASM & TFLite model |
| **F04** | **Movement Assessment: Arm Raise** | Patient | **REAL IMPLEMENTATION** | [CameraAssessment.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/CameraAssessment.jsx), [scoring.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/scoring.js) | `POST /api/assessments` | `Assessment`, `Assignment` |
| **F05** | **Movement Assessment: Sit-to-Stand** | Patient | **REAL IMPLEMENTATION** | [CameraAssessment.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/CameraAssessment.jsx), [scoring.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/scoring.js) | `POST /api/assessments` | `Assessment`, `Assignment` |
| **F06** | **Movement Assessment: Seated Reach** | Patient | **REAL IMPLEMENTATION** | [CameraAssessment.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/CameraAssessment.jsx), [scoring.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/scoring.js) | `POST /api/assessments` | `Assessment`, `Assignment` |
| **F07** | **Speech Phonation Analysis** | Patient | **PARTIALLY IMPLEMENTED** (Backend endpoint ready; Client-side placeholder) | [PatientDashboard.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/PatientDashboard.jsx#L288) | `POST /api/speech/analyze` | None (Stateless analysis) |
| **F08** | **Personal Baseline & Trend Engine** | Patient, Doctor | **REAL IMPLEMENTATION** | [TrendChart.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/TrendChart.jsx), [ProgressPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/ProgressPage.jsx) | `GET /api/users/:id/trends`<br>`POST /api/users/:id/demo-decline` | `trendEngine.js`, `Assessment` |
| **F09** | **Gemini AI Recovery Insights** | Patient | **REAL IMPLEMENTATION** | [PatientDashboard.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/PatientDashboard.jsx#L232-L264) | `POST /api/explanation` | `geminiService.js` (Stateless generation) |
| **F10** | **Doctor Clinical Triage & Patient Roster** | Doctor | **REAL IMPLEMENTATION** | [DoctorPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/DoctorPage.jsx), [DoctorProgressPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/DoctorProgressPage.jsx) | `GET /api/doctors/:id/patients`<br>`GET /api/doctors/:id/assignments` | `User`, `Assignment`, `Assessment` |
| **F11** | **Doctor Exercise Prescription & Review** | Doctor, Patient | **REAL IMPLEMENTATION** | [DoctorPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/DoctorPage.jsx), [AssessmentPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AssessmentPage.jsx) | `POST /api/assignments`<br>`GET /api/patients/:id/assignments`<br>`PATCH /api/assignments/:id/status` | `Assignment`, `Assessment` |
| **F12** | **Doctor Discovery & Profile Search** | Patient | **REAL IMPLEMENTATION** | [AppointmentsPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AppointmentsPage.jsx) | `GET /api/doctors`<br>`GET /api/doctors/:id` | `Doctor`, `DoctorAvailability` |
| **F13** | **In-Person Appointment Booking & Mutex** | Patient | **REAL IMPLEMENTATION** | [BookingModal.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/BookingModal.jsx), [AppointmentsPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AppointmentsPage.jsx) | `GET /api/doctors/:id/availability`<br>`POST /api/appointments` | `Appointment`, `DoctorAvailability` |
| **F14** | **Appointment Lifecycle Management** | Doctor, Patient | **REAL IMPLEMENTATION** | [AppointmentsPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AppointmentsPage.jsx), [DoctorAppointmentsPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/DoctorAppointmentsPage.jsx) | `PATCH /api/appointments/:id/confirm`<br>`PATCH /api/appointments/:id/reject`<br>`PATCH /api/appointments/:id/cancel`<br>`PATCH /api/appointments/:id/complete` | `Appointment`, `Notification` |
| **F15** | **Atomic Rescheduling Workflow** | Patient, Doctor | **REAL IMPLEMENTATION** | [RescheduleModal.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/RescheduleModal.jsx) | `PATCH /api/appointments/:id/reschedule` | `Appointment` (Chained atomic record) |
| **F16** | **Doctor Availability & Schedule Blocking** | Doctor | **REAL IMPLEMENTATION** | [DoctorAppointmentsPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/DoctorAppointmentsPage.jsx#L111-L138) | `PUT /api/doctors/availability`<br>`POST /api/doctors/availability/block`<br>`DELETE /api/doctors/availability/block/:id` | `DoctorAvailability` |
| **F17** | **Recovery Report Generation & Sharing** | Patient | **REAL IMPLEMENTATION** | [ShareReportModal.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/ShareReportModal.jsx), [RecoveryReportModal.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/RecoveryReportModal.jsx) | `GET /api/reports/preview`<br>`POST /api/reports/share`<br>`GET /api/reports/shared/:id` | `SharedRecoveryReport` |
| **F18** | **Patient Report Access Revocation** | Patient | **REAL IMPLEMENTATION** | [AppointmentsPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AppointmentsPage.jsx#L127-L140) | `DELETE /api/reports/shares/:id` | `SharedRecoveryReport`, `Notification` |
| **F19** | **In-App Notification Center** | Patient, Doctor | **REAL IMPLEMENTATION** | [Topbar.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/Topbar.jsx#L75-L125) | `GET /api/notifications`<br>`PATCH /api/notifications/:id/read`<br>`POST /api/notifications/read-all` | `Notification` |
| **F21** | **Demo Decline Simulation Engine** | Patient, Evaluator | **DEMO / SEEDED DATA** | [Sidebar.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/Sidebar.jsx#L46) | `POST /api/users/:id/demo-decline` | In-memory session injections |
| **F22** | **System Health & Persistence Monitor** | All | **REAL IMPLEMENTATION** | [Topbar.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/Topbar.jsx#L61-L69) | `GET /api/health` | System memory & Mongoose connection status |

---

## Detailed Catalog Descriptions

### F01: User Authentication & Role-Based Access Control
- Provides registration and login for `patient` and `doctor` roles.
- Employs bcrypt password hashing (10 rounds) and 7-day signed JSON Web Tokens (`jsonwebtoken`).
- Auto-provisions doctor clinic metadata and default availability schedules upon registration.

### F02: Patient Recovery Dashboard
- High-level overview displaying the primary **Functional Recovery Score** (0–100), baseline delta percentage, and trend classification badge.
- Displays 4 domain scorecards: Movement, Balance, Coordination, Speech.
- Features Prescribed Functional Protocols assigned by the attending physician with countdown due timers and direct "Start Protocol" execution buttons.

### F03: MediaPipe Computer Vision Engine
- Loads `@mediapipe/tasks-vision` FilesetResolver from local `/mediapipe/wasm` binaries.
- Initializes `PoseLandmarker` using `/models/pose_landmarker_lite.task`.
- Executes video frame detection loop via `requestAnimationFrame` and renders skeleton overlays to an HTML5 canvas.
- Includes automatic GPU-to-CPU execution fallback if hardware acceleration fails.

### F04–F06: Objective Kinematic Movement Assessments
- **Arm Raise:** Tracks bilateral shoulder-elbow-wrist vectors, computes range of motion against vertical elevation, and checks bilateral symmetry.
- **Sit-to-Stand:** Analyzes bilateral knee joint angles (hip-knee-ankle) and trunk height to count sit-stand cycles and measure ascent stability.
- **Seated Reach:** Measures forward reach magnitude from shoulder midpoint to wrist midpoint and scores kinematic path efficiency.

### F07: Speech Phonation Analysis
- Implemented on backend via `POST /api/speech/analyze`, computing speaking rate (words/min), pause count, and Jaccard token similarity against target phrases.
- Currently marked as optional in patient check-in UI pending full Web Speech API browser integration.

### F08: Personal Baseline & Longitudinal Trend Engine
- Calculates moving window average ($N=5$) of prior session scores.
- Computes relative percentage delta: $\Delta = \frac{\text{Current} - \text{Baseline}}{\text{Baseline}}$.
- Classifies into four bands: Normal ($\le 5\%$), Monitor ($5\text{--}10\%$), Significant ($10\text{--}15\%$), and Review ($> 15\%$).
- Implements `detectPersistentDecline` to catch 3 consecutive sessions below baseline.

### F09: Gemini AI Rehabilitation Explanations
- Sends structured, pre-computed functional metrics to Google Gemini (`gemini-3.5-flash-lite`).
- Strict prompt sanitization strips unmeasured metric keys to prevent LLM hallucination.
- Implements abort timeouts (15s) and automatic fallback to `buildLocalExplanation` if API keys are missing or provider quota is exceeded.

### F10–F11: Doctor Triage Roster & Protocol Prescriptions
- Patient roster sorted by clinical priority (`Review Recommended` $\rightarrow$ `Monitor` $\rightarrow$ `Stable`).
- Clinicians can prescribe specific exercises, repetition targets, and due dates with custom instructions.
- Clinicians can review completed sessions, inspect joint metric breakdowns, and attach clinical review notes.

### F12–F16: Doctor Discovery, In-Person Scheduling & Mutex Locks
- Searchable doctor directory filterable by 6 clinical specialties and cities.
- Generates 30-minute discrete clinic consultation slots, automatically excluding doctor break hours and blocked times.
- Atomic mutex lock (`activeBookingLocks`) and MongoDB partial unique indexes eliminate double-booking race conditions.
- Strict state transitions: `pending` $\rightarrow$ `confirmed` $\rightarrow$ `completed` / `no-show` or `cancelled`.
- Atomic reschedule endpoint cancels old slot and reserves new slot in a single coordinated action.

### F17–F18: Recovery Report Generation & Revocable Sharing
- Aggregates genuine assessment history, baseline trends, and protocol compliance into an objective clinical summary.
- Requires explicit patient consent checkbox before sharing with a specific clinician.
- Doctor access is logged with timestamp, IP, and user agent in an immutable audit trail.
- Patients can revoke doctor access instantly via `DELETE /api/reports/shares/:shareId`.

### F19: In-App Notification System
- Asynchronous notifications generated on appointment bookings, confirmations, cancellations, rescheduling, report sharing, and revocations.
- Topbar badge displays unread counts, with dropdown interface to mark individual or all notifications as read.
- Client polls `GET /api/notifications` every 15 seconds.

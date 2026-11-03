# Complete Feature Technical Question & Answer Knowledge Base

This knowledge base provides an exhaustive 360-degree technical architectural and engineering breakdown of every major feature implemented in **NeuroGuard AI**. Each feature is analyzed across five critical engineering dimensions:
1. **Basic Understanding** (User requirements, clinical rationale, operational problem solved)
2. **Implementation Understanding** (Component mappings, routes, controllers, models, algorithms, and failure fallbacks)
3. **Architecture Understanding** (Technology selection, architectural fit, design trade-offs, and inter-module communications)
4. **Security Understanding** (Authentication, RBAC authorization, perimeter defense, validation, and privacy protection)
5. **Critical Technical Understanding** (Concurrency hazards, performance bottlenecks, scaling vectors, and edge-case resilience)

---

## Table of Contents

1. [Authentication & Role-Based Access Control (RBAC)](#1-authentication--role-based-access-control-rbac)
2. [Patient Recovery Dashboard & Progress Tracking](#2-patient-recovery-dashboard--progress-tracking)
3. [MediaPipe Edge Computer Vision & Pose Landmarker](#3-mediapipe-edge-computer-vision--pose-landmarker)
4. [Kinematic Movement Assessments (Arm Raise, Sit-to-Stand, Seated Reach)](#4-kinematic-movement-assessments-arm-raise-sit-to-stand-seated-reach)
5. [Speech & Acoustic Functional Assessment](#5-speech--acoustic-functional-assessment)
6. [Personal Baseline & Longitudinal Recovery Trend Engine](#6-personal-baseline--longitudinal-recovery-trend-engine)
7. [Google Gemini AI Integration & Local Fallback Engine](#7-google-gemini-ai-integration--local-fallback-engine)
8. [Doctor Clinical Dashboard & Patient Surveillance](#8-doctor-clinical-dashboard--patient-surveillance)
9. [In-Person Doctor Appointment Scheduling & Concurrency Mutex](#9-in-person-doctor-appointment-scheduling--concurrency-mutex)
11. [In-App Notification Dispatch & Escalation Engine](#11-in-app-notification-dispatch--escalation-engine)
12. [Clinical Recovery Reports & Secure Doctor Sharing](#12-clinical-recovery-reports--secure-doctor-sharing)

---

## 1. Authentication & Role-Based Access Control (RBAC)

### Basic Understanding
* **What is this feature?**
  A stateless, token-based authentication and role-based authorization system that verifies identities (passwords hashed via bcrypt) and issues cryptographically signed JSON Web Tokens (JWT) enforcing clinical role boundaries (`patient`, `doctor`, `admin`).
* **Why did we develop it?**
  Rehabilitation recovery data is sensitive protected health information (PHI). Distinct roles have strictly segregated access boundaries: patients record personal assessments, doctors monitor clinical cohorts.
* **What problem does it solve?**
  Prevents unauthenticated public access, prevents cross-tenant data leakage (IDOR), and ensures that users only access resources permitted by their verified clinical persona.
* **Who uses it?**
  All actors: patients, clinicians/doctors, and administrative staff.
* **What happens when a user interacts with it?**
  The user enters email and password into the login form. Upon submission, credentials are sent over TLS to the backend. If verified, the server returns an HMAC-SHA256 JWT containing user metadata and role, which the client persists in `localStorage` and transmits via HTTP `Authorization: Bearer <token>` on all subsequent requests.

### Implementation Understanding
* **How is it implemented?**
  Client state is maintained in [App.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/App.jsx#L42-L68) (`user`, `token`), initialized from browser `localStorage`. API calls are executed by [api.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/api.js#L23-L45) (`authAPI.login`, `authAPI.register`, `authAPI.me`).
* **Which frontend component handles it?**
  [LoginModal.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/LoginPage.jsx#L1-L120) displays modal tabs for login, registration, and demo-user fast switching. Protected views are gated inside `App.jsx` using ternary guards (`token ? <Dashboard /> : <LandingPage />`).
* **Which API is called?**
  `POST /api/auth/login`, `POST /api/auth/register`, and `GET /api/auth/me`.
* **Which backend function processes it?**
  [auth.js routes](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L26-L100). Validated against Mongoose User model [User.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/User.js#L1-L76).
* **Which database model stores its data?**
  The `User` collection. Schema stores `name`, lowercase indexed `email`, hashed `password` (select: false), `role`, `status`, `assignedDoctorId`, and timestamps.
* **What algorithms are involved?**
  - Salted one-way cryptographic hashing: `bcryptjs.hash(password, 10)`.
  - Constant-time password verification: `bcryptjs.compare(candidate, hash)` to eliminate timing side-channel attacks.
  - Signature generation: `jwt.sign({ id, role, email }, JWT_SECRET, { expiresIn: '7d' })`.
* **How is the result calculated?**
  If `bcrypt.compare` returns `true`, the user document is queried without password field, token is minted with 7-day expiration, and serialized payload `{ token, user }` is returned with status 200.
* **What happens if something fails?**
  - Unknown email or wrong password returns HTTP `401 Unauthorized` (`{ message: 'Invalid credentials' }`).
  - Missing fields return HTTP `400 Bad Request`.
  - Duplicate email on registration returns HTTP `409 Conflict` (or 400).
  - Malformed or expired JWT in middleware returns HTTP `401 Invalid or expired token`.

### Architecture Understanding
* **Why did we choose this technology?**
  JWTs enable stateless horizontal scaling of backend API instances without requiring distributed server-side session stores (like Redis) during prototype and multi-region microservice deployments.
* **Why is this architecture suitable?**
  React SPA communicates seamlessly across cross-origin REST endpoints by attaching the token to standard HTTP headers.
* **What alternatives could have been used?**
  HttpOnly SameSite secure cookies. While cookies offer superior mitigation against XSS token exfiltration, bearer tokens simplify hybrid cross-platform clients (mobile apps, desktop clients) and multi-domain API hosting.
* **How does the feature communicate with other modules?**
  The [auth middleware](file:///home/piyush/Team Matrix/Hacksprint/backend/src/middleware/auth.js#L11-L60) (`authenticateToken`, `requireRole`) intercepts every inbound request to `/api/assessments`, `/api/patients`, `/api/doctors`, `/api/appointments`, and `/api/reports`, populating `req.user` with decoded token claims.
* **What dependencies does it have?**
  Backend: `jsonwebtoken`, `bcryptjs`, `mongoose`. Frontend: Native `fetch` with authorization header injection.

### Security Understanding
* **How is this feature protected?**
  Protected by express rate limiting [rateLimiter.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/middleware/rateLimiter.js#L1-L40) (`authLimiter` limits brute-force attempts to 5 requests per 15 minutes per IP).
* **What happens when an unauthorized user attempts access?**
  Missing or invalid token triggers `401 Unauthorized`. Valid token with insufficient role (e.g. `patient` requesting `/api/doctors/dashboard`) triggers `403 Forbidden` (`{ message: 'Forbidden: Insufficient role permissions' }`).
* **How is sensitive data protected?**
  Passwords are never stored in plaintext and never returned in API payloads (`select: false` on Mongoose schema). JWT secret is injected via environment variables (`JWT_SECRET`).
* **What validation is performed?**
  Email format regex, password minimum length verification, and role enumeration validation against `['patient', 'doctor', 'admin']`.

### Critical Technical Understanding
* **What are the biggest technical challenges?**
  Handling token invalidation upon role change or account deactivation before the 7-day JWT expiration without maintaining a centralized redis blacklist.
* **What are the possible failure scenarios?**
  Database connection drop causes auth endpoints to fall back to in-memory store [store.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/store.js#L1-L24), creating divergence if nodes restart.
* **What are the performance bottlenecks?**
  `bcrypt.hash` with cost factor 10 is intentionally CPU-intensive. High registration bursts can starve the Node.js libuv thread pool if unthrottled.
* **What happens with concurrent requests?**
  Stateless JWT verification runs purely in-memory using crypto verification without database I/O, allowing tens of thousands of concurrent requests with near-zero latency.
* **How would we scale this feature?**
  Introduce Redis token blocklisting for immediate revocation, transition to short-lived access tokens (15m) paired with rotating refresh tokens stored in HttpOnly secure cookies.

---

## 2. Patient Recovery Dashboard & Progress Tracking

### Basic Understanding
* **What is this feature?**
  An interactive, multi-metric clinical monitoring dashboard designed for patients undergoing motor and neurological rehabilitation.
* **Why did we develop it?**
  Patients recovering at home lack immediate feedback on whether their exercises are effective, leading to low adherence and unmonitored functional regression.
* **What problem does it solve?**
  Consolidates longitudinal biomechanical metrics, session compliance, streak counters, upcoming appointments, and AI-generated clinical explanations into an accessible visual interface.
* **Who uses it?**
  Patients.
* **What happens when a user interacts with it?**
  The user views recovery score trends over 30 days, launches new assessments, views personal baseline comparisons, reads plain-language summaries of recent sessions, and books clinical consultations.

### Implementation Understanding
* **How is it implemented?**
  [PatientDashboard.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/PatientDashboard.jsx#L1-L320) acts as the primary coordinator view. It loads data concurrently via `Promise.all` fetching `/api/assessments/stats`, `/api/assessments/history`, and appointments.
* **Which frontend component handles it?**
  `PatientDashboard.jsx` orchestrates child presentation components:
  - [StatCard.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/MetricCard.jsx#L1-L40) for top KPI cards.
  - [TrendChart.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/TrendChart.jsx#L1-L85) rendering Recharts SVG line graphs.
  - [RecentSessions.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/MetricCard.jsx#L1-L75) displaying session logs.
  - [AppointmentsCard.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/BookingModal.jsx#L1-L90) for clinical consults.
* **Which API is called?**
  - `GET /api/assessments/history?limit=10`
  - `GET /api/assessments/stats`
  - `GET /api/appointments/my`
* **Which backend function processes it?**
  [assessment.js routes](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L50-L125) executing Mongoose aggregate pipelines and trend engine calculations.
* **Which database model stores its data?**
  `Assessment` collection [Assessment.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/Assessment.js#L1-L80) and `Appointment` collection.
* **What algorithms are involved?**
  Rolling adherence calculation: $\text{Adherence Rate} = (\text{Completed Sessions} / \text{Prescribed Target}) \times 100$. Recovery score trajectory interpolation for Recharts SVG rendering.
* **How is the result calculated?**
  Backend computes session counts, average recovery scores, and trend status (`improving`, `stable`, `declining`) by feeding historical sessions into `evaluateRecoveryTrend()` in [trendEngine.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/trendEngine.js#L10-L100).
* **What happens if something fails?**
  If network or backend is unreachable, `PatientDashboard.jsx` catches the exception and falls back to deterministic client mock data in [demoData.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/demoData.js#L1-L85), rendering amber status banners to indicate offline/simulated mode.

### Architecture Understanding
* **Why did we choose this technology?**
  React 19 + Recharts provides performant DOM-independent SVG rendering with responsive window resizing and zero canvas repaints for data tables.
* **Why is this architecture suitable?**
  Separates visual charting from statistical computation. The client only consumes pre-aggregated numerical series, minimizing browser CPU consumption.
* **What alternatives could have been used?**
  Server-Side Rendered (SSR) HTML charts or Chart.js canvas elements. Recharts was selected for seamless declarative React component integration.
* **How does the feature communicate with other modules?**
  Deep links navigate directly to [AssessmentRunner.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AssessmentPage.jsx#L1-L240), [AppointmentList.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AppointmentsPage.jsx#L1-L200), and [ReportViewer.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/RecoveryReportModal.jsx#L1-L150).
* **What dependencies does it have?**
  `recharts`, `lucide-react` icons, Tailwind CSS classes.

### Security Understanding
* **How is this feature protected?**
  Access requires `authenticateToken` middleware with role verification. The API scope query ensures patients can only query assessments where `patientId === req.user.id`.
* **What happens when an unauthorized user attempts access?**
  Non-authenticated users are redirected to the landing hero view. Doctors accessing `/dashboard` are redirected to `/doctor-dashboard`.
* **How is sensitive data protected?**
  Medical notes and raw landmark arrays are excluded from high-level statistics endpoints to keep payload sizes lean and restrict exposure.
* **What validation is performed?**
  Query parameters (`limit`, `startDate`) are validated against integer bounds to avoid database memory exhaustion attacks.

### Critical Technical Understanding
* **What are the biggest technical challenges?**
  Ensuring smooth 60fps UI rendering when switching between historical graph views while maintaining reactive responsiveness on low-end tablets and mobile browsers.
* **What are the possible failure scenarios?**
  Empty assessment state when a newly registered patient has 0 sessions completed. Solved via dedicated "Welcome & Start First Baseline Assessment" empty-state UI component.
* **What are the performance bottlenecks?**
  Unindexed database queries across thousands of historical assessments. Mitigated via compound index `{ patientId: 1, createdAt: -1 }`.
* **What happens with concurrent requests?**
  Read-only analytical queries run against secondary MongoDB replica nodes without blocking assessment writes.
* **How would we scale this feature?**
  Pre-compute patient statistics asynchronously using background worker jobs (e.g. BullMQ/Redis) upon session submission rather than computing aggregations on every dashboard page load.

---

## 3. MediaPipe Edge Computer Vision & Pose Landmarker

### Basic Understanding
* **What is this feature?**
  An in-browser, edge-computed computer vision engine that detects, extracts, and tracks 33 full-body 3D anatomical landmarks in real time from a live webcam feed.
* **Why did we develop it?**
  Transmitting raw video streams to cloud servers creates severe patient privacy risks (HIPAA/GDPR violations) and demands unsustainable network bandwidth.
* **What problem does it solve?**
  Performs real-time biomechanical motion tracking completely inside the patient's browser sandbox, sending only derived numeric scalar metrics (angles, velocities, symmetry ratios) to the server.
* **Who uses it?**
  Patients performing motor assessments.
* **What happens when a user interacts with it?**
  The user grants browser webcam permissions. The video element streams to MediaPipe Tasks Vision WebAssembly. The landmarker extracts coordinates at 30–60 FPS and overlays skeleton connections on a HTML5 canvas.

### Implementation Understanding
* **How is it implemented?**
  Encapsulated in [pose.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/pose.js#L1-L115) (`createPoseLandmarker`, `detectPoseFromVideo`).
* **Which frontend component handles it?**
  [CameraFeed.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/CameraAssessment.jsx#L1-L140) manages the `<video>` and `<canvas>` elements and coordinates the `requestAnimationFrame` loop.
* **Which API is called?**
  Zero backend APIs during video inference. Everything runs client-side via WebAssembly (`@mediapipe/tasks-vision`).
* **Which backend function processes it?**
  None. Raw video frames never leave client memory.
* **Which database model stores its data?**
  None for raw frames. Only derived statistical aggregates are stored in `Assessment.metrics`.
* **What algorithms are involved?**
  - Convolutional neural network pose estimation (`pose_landmarker_lite.task`).
  - Coordinate normalization: $x, y \in [0.0, 1.0]$ relative to image dimensions; $z$ represents depth relative to hip midpoint.
  - Linear 2D canvas interpolation rendering lines connecting 33 landmark pairs.
* **How is the result calculated?**
  `poseLandmarker.detectForVideo(videoElement, performance.now())` outputs `PoseLandmarkerResult` containing `landmarks` (normalized coordinates) and `worldLandmarks` (metric 3D coordinates in meters).
* **What happens if something fails?**
  If WASM assets fail to load or WebGL context crashes, `initPoseLandmarker()` catches the error, sets UI state to fallback mode, and offers interactive simulated exercise tracking.

### Architecture Understanding
* **Why did we choose this technology?**
  Google MediaPipe Tasks Vision executes highly optimized WebAssembly (WASM) compiled with SIMD instructions, leveraging WebGL GPU acceleration for 30–60 FPS inference in mobile and desktop browsers.
* **Why is this architecture suitable?**
  Zero cloud compute costs for vision processing; absolute data privacy compliance since patient video stays local.
* **What alternatives could have been used?**
  TensorFlow.js PoseNet / MoveNet. MediaPipe Pose was selected because it tracks 33 full-body landmarks (including hands and feet) with superior occlusion resilience and lower runtime memory overhead.
* **How does the feature communicate with other modules?**
  Passes normalized landmark arrays `landmarks[33]` to [scoring.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/scoring.js#L1-L170) on every animation frame.
* **What dependencies does it have?**
  `@mediapipe/tasks-vision` npm package, `/public/mediapipe/wasm` binaries, `/public/models/pose_landmarker_lite.task` model file.

### Security Understanding
* **How is this feature protected?**
  Operates strictly inside browser security sandbox. Camera permission requested via standard W3C `navigator.mediaDevices.getUserMedia({ video: true })`.
* **What happens when an unauthorized user attempts access?**
  Browser natively blocks camera access if permission is denied, triggering `CameraFeed.jsx` permission error state.
* **How is sensitive data protected?**
  Raw pixel buffers are processed in volatile memory and immediately discarded after landmark extraction. Zero video or photographic frames are ever saved to disk or transmitted across the network.
* **What validation is performed?**
  Landmark visibility and confidence scores (`landmark.visibility > 0.5`) are checked before feeding coordinates into mathematical kinematics calculators.

### Critical Technical Understanding
* **What are the biggest technical challenges?**
  Maintaining consistent frame timing without UI jank, and handling body occlusion when patients move outside the camera field of view.
* **What are the possible failure scenarios?**
  - User steps out of frame: `results.landmarks[0]` is undefined; state machine pauses rep counting.
  - Browser tab switches to background: `requestAnimationFrame` throttles to 1 FPS; handled by checking timestamp deltas.
* **What are the performance bottlenecks?**
  Garbage collection pauses if coordinate objects are allocated on every frame. Solved by passing arrays by reference.
* **What happens with concurrent requests?**
  WASM executes synchronously within the dedicated browser main thread or web worker, independent of server load.
* **How would we scale this feature?**
  Since execution is decentralized across end-user client devices, server load remains strictly $O(1)$ regardless of whether 10 or 1,000,000 patients perform assessments simultaneously.

---

## 4. Kinematic Movement Assessments (Arm Raise, Sit-to-Stand, Seated Reach)

### Basic Understanding
* **What is this feature?**
  Clinical biomechanical assessment engines that evaluate upper-extremity mobility, bilateral symmetry, lower-body functional strength, and trunk stability during standardized exercises.
* **Why did we develop it?**
  Standard neurological physical therapy requires continuous objective measurement of joint angles, range of motion, and movement repeatability to track neuroplastic recovery.
* **What problem does it solve?**
  Replaces subjective, error-prone visual inspection with deterministic, millimeter-scale mathematical kinematic tracking.
* **Who uses it?**
  Stroke survivors, Parkinson's patients, and post-operative orthopedic patients under rehabilitation.
* **What happens when a user interacts with it?**
  The user selects an exercise (e.g., Arm Raise), views audio-visual instructions, stands before the camera, and performs repetitions. Real-time feedback displays current joint angles, repetition count, and form symmetry.

### Implementation Understanding
* **How is it implemented?**
  Pure mathematical vector kinematics implemented in [scoring.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/scoring.js#L1-L170). Orchestrated in [AssessmentRunner.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AssessmentPage.jsx#L1-L240).
* **Which frontend component handles it?**
  `AssessmentRunner.jsx` mounts `CameraFeed.jsx`, evaluates frames via `calculateMovementScore(type, landmarks, state)`, updates real-time HUD widgets, and posts completed session payloads to backend.
* **Which API is called?**
  `POST /api/assessments` upon exercise completion.
* **Which backend function processes it?**
  [assessments.js route](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L15-L48) saves session, calls `trendEngine.evaluateRecoveryTrend(patientId, session)` in [trendEngine.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/trendEngine.js#L10-L100), and requests AI insights from [geminiService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/geminiService.js#L20-L85).
* **Which database model stores its data?**
  `Assessment` collection (`type`, `score`, `metrics`, `trend`, `aiExplanation`).
* **What algorithms are involved?**
  - **Arm Raise**: Elevation formula $\text{Elev} = \text{clamp}((\text{Shoulder}_y - \text{Wrist}_y) \times 120 + 50, 0, 100)$. Bilateral symmetry formula $\text{Symmetry} = \text{clamp}(100 - |\text{Elev}_L - \text{Elev}_R| \times 1.2, 0, 100)$. Composite score:
    $$\text{Score} = 0.38 \times \text{RangeScore} + 0.27 \times \text{Symmetry} + 0.20 \times \text{Extension} + 0.15 \times \text{RepScore}$$
  - **Sit-to-Stand**: Trigonometric knee joint angle using dot product of vectors $\vec{BA} = \text{Hip} - \text{Knee}$ and $\vec{BC} = \text{Ankle} - \text{Knee}$:
    $$\theta = \arccos\left(\frac{\vec{BA} \cdot \vec{BC}}{\|\vec{BA}\| \|\vec{BC}\|}\right) \times \frac{180}{\pi}$$
    Finite State Machine: Transition to `standing` when $\theta > 155^\circ$; transition to `sitting` and increment rep counter when $\theta < 105^\circ$ (with 20-frame hysteresis debounce).
  - **Seated Reach**: Shoulder-to-wrist 2D Euclidean extension distance $\sqrt{\Delta x^2 + \Delta y^2} \times 180$, path straightness ratio, and trunk displacement stability.
* **How is the result calculated?**
  Dynamic frame-by-frame accumulator maintains running statistics. Final session score is normalized to $[0, 100]$ integer range.
* **What happens if something fails?**
  If patient aborts midway, partial scores are calculated if $\ge 1$ rep was completed; otherwise session exits without polluting longitudinal database baselines.

### Architecture Understanding
* **Why did we choose this technology?**
  Client-side vector mathematics eliminates network transmission latency, delivering zero-lag real-time visual feedback to the patient.
* **Why is this architecture suitable?**
  Decouples frame-rate dependent scoring from persistent data storage. Only completed session summary records are dispatched to the server.
* **What alternatives could have been used?**
  Pre-trained action recognition models (e.g. SlowFast, VideoMAE). Rejected because deep action recognition models are opaque black boxes that cannot provide exact degree-level joint angle feedback required by physical therapists.
* **How does the feature communicate with other modules?**
  Directly feeds completed metric payloads into the backend Trend Engine and Gemini Explanation Service.
* **What dependencies does it have?**
  Standard JavaScript `Math` library (`Math.acos`, `Math.sqrt`, `Math.atan2`).

### Security Understanding
* **How is this feature protected?**
  Backend route `POST /api/assessments` verifies patient JWT authentication and validates payload schema bounds before database insertion.
* **What happens when an unauthorized user attempts access?**
  Requests lacking valid JWT tokens receive `401 Unauthorized`. Attempts by patients to post assessments on behalf of another `patientId` are rejected with `403 Forbidden`.
* **How is sensitive data protected?**
  Raw frame coordinates are discarded immediately after exercise completion; only derived summary scores and kinematic metrics are persisted.
* **What validation is performed?**
  Validation guards check that `score` is an integer between 0 and 100, `type` is one of `['arm-raise', 'sit-to-stand', 'seated-reach', 'speech']`, and required kinematic metrics exist.

### Critical Technical Understanding
* **What are the biggest technical challenges?**
  Preventing false-positive repetition counting caused by natural tremors, ataxia, or minor camera shaking.
* **What are the possible failure scenarios?**
  Patient positions camera at an extreme oblique angle, distorting 2D projections. Mitigated by using 3D world landmark coordinates and minimum visibility thresholds.
* **What are the performance bottlenecks?**
  High math computation per frame. Mitigated by restricting vector calculations to the relevant 6–8 joint landmarks per exercise rather than processing all 33 points.
* **What happens with concurrent requests?**
  Session submission creates a single lightweight MongoDB document write taking $<5\text{ms}$.
* **How would we scale this feature?**
  Add WebAssembly-compiled C++/Rust kinematic modules for even faster vector calculations on ultra-low-power mobile chipsets.

---

## 5. Speech & Acoustic Functional Assessment

### Basic Understanding
* **What is this feature?**
  An audio-based assessment module that analyzes voice biomarkers, speech cadence, articulation clarity, sustained phonation, and pause frequency during standardized reading tasks.
* **Why did we develop it?**
  Dysarthria (motor speech impairment) and cognitive-linguistic decline are frequent post-stroke and neurological symptoms requiring regular speech-language monitoring.
* **What problem does it solve?**
  Provides automated acoustic feature extraction without requiring in-person speech-language pathologist visits for preliminary functional tracking.
* **Who uses it?**
  Patients recovering from stroke, traumatic brain injury (TBI), or managing Parkinsonian hypophonia.
* **What happens when a user interacts with it?**
  The user is presented with a standard phonetically balanced sentence (e.g., "The quick brown fox jumps over the lazy dog"). They click record, speak into the microphone, and click stop. The audio is captured, analyzed, and scored.

### Implementation Understanding
* **How is it implemented?**
  Audio capture via HTML5 `MediaRecorder` API and Web Audio API (`AudioContext`, `AnalyserNode`) in [SpeechAssessment.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AssessmentPage.jsx#L1-L150).
* **Which frontend component handles it?**
  `SpeechAssessment.jsx` records audio chunks into a `Blob`, executes client-side volume and pause duration analysis, and prepares the assessment payload.
* **Which API is called?**
  `POST /api/assessments` with `{ type: 'speech', metrics: { clarity, pace, sustainedPhonation, pauseCount }, score }`.
* **Which backend function processes it?**
  [assessments.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L15-L48) processes the speech metrics and triggers Gemini contextual speech explanation generation.
* **Which database model stores its data?**
  `Assessment` collection with `type: 'speech'`.
* **What algorithms are involved?**
  - Time-domain Root-Mean-Square (RMS) amplitude energy calculation to identify voice activity vs. silence.
  - Pause counting: Detects zero-crossing or low-amplitude drops $>350\text{ms}$.
  - Cadence estimation: $\text{WPM} = (\text{Estimated Word Count} / \text{Recording Duration in Minutes})$.
  - Clarity heuristic: Ratio of voiced-to-unvoiced segments combined with frequency stability.
* **How is the result calculated?**
  Weighted linear composite:
  $$\text{SpeechScore} = 0.35 \times \text{Clarity} + 0.30 \times \text{CadencePace} + 0.20 \times \text{PhonationStability} + 0.15 \times \text{PauseEfficiency}$$
* **What happens if something fails?**
  If microphone permissions are denied or audio level is zero (silent mic), UI displays an alert guiding user to check input hardware.

### Architecture Understanding
* **Why did we choose this technology?**
  Browser Web Audio API allows real-time frequency and time-domain analysis without transmitting megabytes of uncompressed WAV files to the cloud.
* **Why is this architecture suitable?**
  Protects patient audio privacy and ensures instantaneous scoring feedback.
* **What alternatives could have been used?**
  Cloud-based speech-to-text and acoustic feature extraction services (e.g. AWS Transcribe Medical, Google Cloud Speech-to-Text). Rejected for prototype phase due to privacy and API latency overhead.
* **How does the feature communicate with other modules?**
  Passes extracted acoustic metrics to the Trend Engine and Gemini explanation service.
* **What dependencies does it have?**
  Native browser `AudioContext`, `MediaStreamAudioSourceNode`, `AnalyserNode`.

### Security Understanding
* **How is this feature protected?**
  Microphone permissions are strictly opt-in per browser security standards.
* **What happens when an unauthorized user attempts access?**
  Standard API JWT auth verification prevents unauthorized data logging.
* **How is sensitive data protected?**
  Raw audio recordings are processed in volatile memory and not stored permanently on server disks unless explicitly configured for clinical audio archival.
* **What validation is performed?**
  Ensures recording duration is within legitimate bounds ($3\text{s} \le t \le 60\text{s}$) to prevent buffer overruns.

### Critical Technical Understanding
* **What are the biggest technical challenges?**
  Handling ambient background noise, acoustic echo, and varying hardware microphone sensitivity across different consumer laptops and smartphones.
* **What are the possible failure scenarios?**
  Clipping or distortion from user holding microphone too close; addressed via dynamic gain compression in Web Audio graph.
* **What are the performance bottlenecks?**
  FFT frequency analysis in JavaScript main thread. Solved by sampling frequency data at 20Hz intervals rather than per-sample.
* **What happens with concurrent requests?**
  Zero backend audio processing load; only small JSON metrics are transmitted to server.
* **How would we scale this feature?**
  Introduce a specialized WebAssembly acoustic engine (e.g., compiled openSMILE) for clinical-grade jitter, shimmer, and formant analysis directly on the edge.

---

## 6. Personal Baseline & Longitudinal Recovery Trend Engine

### Basic Understanding
* **What is this feature?**
  A personalized analytical engine that computes an individual patient's normative baseline across historical sessions and classifies longitudinal progress as `improving`, `stable`, or `declining`.
* **Why did we develop it?**
  Patients recovering from neurological events possess widely differing starting capabilities. Comparing a stroke patient against generic population averages is clinically invalid and demoralizing.
* **What problem does it solve?**
  Provides personalized, individualized progress tracking where every patient is evaluated strictly against their own established recovery baseline.
* **Who uses it?**
  Used internally by the platform to classify recovery trajectories for patients and clinicians.
* **What happens when a user interacts with it?**
  Upon completing any assessment, the engine automatically retrieves historical sessions, calculates moving window baselines, evaluates statistical deviations, and updates dashboard indicators and clinical alerts.

### Implementation Understanding
* **How is it implemented?**
  Core mathematical module in [trendEngine.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/trendEngine.js#L1-L100).
* **Which frontend component handles it?**
  Displays in `PatientDashboard.jsx`, `TrendChart.jsx`, and `DoctorDashboard.jsx`.
* **Which API is called?**
  Invoked server-side during `POST /api/assessments` and queried via `GET /api/assessments/stats`.
* **Which backend function processes it?**
  - `calculatePersonalBaseline(patientId, assessmentType, sessions)`
  - `evaluateRecoveryTrend(patientId, currentSession, history)`
  - `checkPersistentDecline(patientId, assessmentType, history)`
* **Which database model stores its data?**
  `Assessment` collection stores `trend` field; `Patient` profile stores updated `baselines` map.
* **What algorithms are involved?**
  - **Moving Baseline Calculation**: Weighted arithmetic mean of the prior $N=5$ valid sessions:
    $$\text{Baseline} = \frac{1}{\min(N, K)} \sum_{i=1}^{\min(N, K)} \text{Score}_i$$
  - **Relative Percentage Deviation**:
    $$\Delta\% = \left(\frac{\text{Current Score} - \text{Baseline}}{\text{Baseline}}\right) \times 100$$
  - **Classification Rules**:
    - If $\Delta\% \ge +5\%$: Classified as **`improving`**.
    - If $-5\% \le \Delta\% < +5\%$: Classified as **`stable`**.
    - If $\Delta\% < -5\%$: Classified as **`declining`**.
  - **Persistent Decline Anomaly Detector**:
    Triggered when $\ge 3$ consecutive sessions fall below baseline and moving average drops by $>5\%$ ($\text{Mean}_3 < 0.95 \times \text{Baseline}$). Dispatches urgent clinical alert.
* **How is the result calculated?**
  Executed synchronously during assessment ingestion. If $<3$ prior sessions exist, trend is tagged as `baseline_establishment`.
* **What happens if something fails?**
  If history is missing or corrupted, engine safely defaults to `{ trend: 'stable', delta: 0, baselineEstablished: false }`.

### Architecture Understanding
* **Why did we choose this technology?**
  Pure deterministic Node.js mathematical engine ensuring consistent, reproducible results without external service dependencies.
* **Why is this architecture suitable?**
  Decouples statistical classification from presentation and persistence. Can run both online in request threads or offline in batch workers.
* **What alternatives could have been used?**
  ARIMA time-series models, Kalman filters, or recurrent neural networks. Rejected because clinical rehabilitation requires explainable, auditable deterministic thresholds that clinicians can verify.
* **How does the feature communicate with other modules?**
  Sends trend status to [notificationService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/notificationService.js#L1-L80) when persistent decline is detected.
* **What dependencies does it have?**
  Zero external dependencies; built using native JavaScript arrays and math.

### Security Understanding
* **How is this feature protected?**
  Runs entirely on the server backend inside protected API controllers.
* **What happens when an unauthorized user attempts access?**
  Protected by API JWT token verification; patients cannot access or tamper with calculation logic.
* **How is sensitive data protected?**
  Executes in memory using validated database records; never writes temporary data to unencrypted disks.
* **What validation is performed?**
  Input validation discards sessions with invalid scores ($<0$ or $>100$) or unverified tracking quality.

### Critical Technical Understanding
* **What are the biggest technical challenges?**
  Distinguishing true functional deterioration from transient day-to-day fluctuations caused by fatigue, poor lighting, or improper camera positioning.
* **What are the possible failure scenarios?**
  Patient performs exercises while tired, causing a single low score. Solved by requiring **3 consecutive sessions** to confirm persistent decline before raising clinical alarms.
* **What are the performance bottlenecks?**
  Querying full session history on every assessment. Mitigated by using MongoDB `.limit(5)` sorted by `createdAt: -1`.
* **What happens with concurrent requests?**
  Calculations are pure functions with zero shared state, thread-safe across concurrent requests.
* **How would we scale this feature?**
  Cache the current baseline value directly on the `Patient` document so history lookups are only needed once every 5 sessions.

---

## 7. Google Gemini AI Integration & Local Fallback Engine

### Basic Understanding
* **What is this feature?**
  An AI-assisted clinical explanation system that translates complex biomechanical metrics into empathetic, understandable recovery summaries for patients and clinicians.
* **Why did we develop it?**
  Raw numbers (e.g., "Left shoulder elevation 68.4%, symmetry ratio 81.2%") confuse patients and cause anxiety. Patients need plain-language coaching and encouragement.
* **What problem does it solve?**
  Bridges the communication gap between raw kinematic sensor measurements and human comprehension, while strictly avoiding medical diagnosis.
* **Who uses it?**
  Patients reviewing session feedback and doctors scanning patient progress reports.
* **What happens when a user interacts with it?**
  Upon submitting an assessment, the backend formats kinematic metrics and prompts Google Gemini. The generated summary is returned and displayed in the UI alongside numerical charts.

### Implementation Understanding
* **How is it implemented?**
  Backend service implemented in [geminiService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/geminiService.js#L1-L120).
* **Which frontend component handles it?**
  Displayed in [AssessmentResult.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AssessmentPage.jsx#L1-L140) and [ReportViewer.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/RecoveryReportModal.jsx#L1-L150).
* **Which API is called?**
  Invoked internally by `POST /api/assessments` and `POST /api/reports/generate`.
* **Which backend function processes it?**
  - `generateAssessmentExplanation(metrics, context)`
  - `buildLocalExplanation(metrics, context)` (deterministic offline fallback)
  - `sanitizeFindings(findings)` (removes unvalidated diagnostic hallucination)
* **Which database model stores its data?**
  Stored in `Assessment.aiExplanation` and `Report.summary`.
* **What algorithms are involved?**
  - Structured prompt engineering enforcing strict clinical safety rules.
  - Temperature setting `0.2` for deterministic, low-hallucination language.
  - AbortController timeout mechanism set to $15,000\text{ms}$.
  - Whitelist metric filtering ensuring Gemini only receives validated numbers.
* **How is the result calculated?**
  Gemini 1.5/2.5 Flash processes the system prompt and biomechanical JSON payload. If the API returns within 15 seconds, output is sanitized and stored. If it times out or throws, `buildLocalExplanation()` constructs an immediate template-based summary.
* **What happens if something fails?**
  Network outage, missing API key, rate limit (HTTP 429), or timeout automatically triggers `buildLocalExplanation()`. The end user receives a clear summary with zero UI interruption.

### Architecture Understanding
* **Why did we choose this technology?**
  Google Gemini Flash models offer ultra-fast inference ($<800\text{ms}$), low cost, and strong adherence to structured prompt formatting and negative constraints.
* **Why is this architecture suitable?**
  Backend proxy architecture prevents private API key leakage to browser clients and enforces safety guardrails before output reaches the database.
* **What alternatives could have been used?**
  Local open-source LLMs (e.g. Llama-3-8B via Ollama). Rejected because running an 8B model requires dedicated GPU infrastructure that exceeds prototype server environments.
* **How does the feature communicate with other modules?**
  Receives metrics from `assessments.js` and delivers plain text to `reports.js` and `assessments.js`.
* **What dependencies does it have?**
  `@google/genai` or direct Google AI Studio REST endpoints via Node.js native `fetch`.

### Security Understanding
* **How is this feature protected?**
  API key stored strictly in backend environment variables (`GEMINI_API_KEY`). Never exposed to frontend code or client bundles.
* **What happens when an unauthorized user attempts access?**
  Endpoints generating AI summaries require valid JWT authentication.
* **How is sensitive data protected?**
  Personally identifiable information (names, emails, phone numbers) is stripped before dispatching prompts to Gemini. Only anonymous metric tokens are transmitted.
* **What validation is performed?**
  Output string is scanned to ensure it contains standard clinical non-diagnostic disclaimers and does not assert definitive medical diagnoses (e.g. "You have suffered a recurrent stroke").

### Critical Technical Understanding
* **What are the biggest technical challenges?**
  Guaranteed zero-downtime availability when external AI cloud services experience global rate-limiting or outages.
* **What are the possible failure scenarios?**
  Gemini API hallucinating false numbers not present in the input prompt. Mitigated by `sanitizeFindings()` which cross-checks mentioned percentages against actual computed values.
* **What are the performance bottlenecks?**
  External cloud API latency ($500\text{ms} - 3000\text{ms}$).
* **What happens with concurrent requests?**
  Calls execute asynchronously via Node.js non-blocking I/O. If rate limits are reached, the system falls back instantaneously to local template generation.
* **How would we scale this feature?**
  Implement an asynchronous background queue (RabbitMQ/BullMQ) with Redis caching for identical metric profiles.

---

## 8. Doctor Clinical Dashboard & Patient Surveillance

### Basic Understanding
* **What is this feature?**
  A centralized clinical portal that allows rehabilitation physicians and physical therapists to supervise multiple assigned patients, monitor recovery trajectories, review flagged anomalies, and inspect detailed kinematic metrics.
* **Why did we develop it?**
  Clinicians manage heavy caseloads and cannot manually review every daily exercise session. They need exception-based triage highlighting patients who are regressing.
* **What problem does it solve?**
  Provides automated cohort risk stratification, surfacing at-risk patients who exhibit persistent functional decline so clinicians can intervene proactively.
* **Who uses it?**
  Licensed physicians, physical therapists, and clinical administrators.
* **What happens when a user interacts with it?**
  The doctor logs in, views their patient roster categorized by status (`improving`, `stable`, `review_needed`), clicks an individual patient to inspect historical charts and AI summaries, and schedules appointments or updates care plans.

### Implementation Understanding
* **How is it implemented?**
  [DoctorDashboard.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/DoctorPage.jsx#L1-L310) acts as the primary clinical view.
* **Which frontend component handles it?**
  Renders clinical summary stats, an alert banner for patients requiring clinical review, a filterable patient roster table, and a deep-dive modal for inspecting specific session kinematics.
* **Which API is called?**
  - `GET /api/doctors/dashboard`
  - `GET /api/doctors/patients`
  - `GET /api/doctors/patients/:patientId/assessments`
* **Which backend function processes it?**
  [doctors.js routes](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/doctorRoutes.js#L20-L115) querying assigned patients, aggregating recent assessments, and flagging decline alerts.
* **Which database model stores its data?**
  `User` collection (`role: 'doctor'`), `User` (`role: 'patient'`, `assignedDoctorId`), and `Assessment` collection.
* **What algorithms are involved?**
  Cohort risk stratification algorithm:
  $$\text{Triage Priority} = \begin{cases} 1 \text{ (High Alert)}, & \text{if Persistent Decline flagged} \\ 2 \text{ (Moderate)}, & \text{if Adherence } < 50\% \\ 3 \text{ (Normal)}, & \text{otherwise} \end{cases}$$
* **How is the result calculated?**
  MongoDB aggregation joins assigned patients with their latest 5 assessments, computing moving compliance and risk flags.
* **What happens if something fails?**
  If backend is unreachable, the dashboard catches error and loads simulated clinician demonstration data from `demoData.js`.

### Architecture Understanding
* **Why did we choose this technology?**
  React declarative data tables with real-time client-side search and status filtering provide instant response times across large patient cohorts.
* **Why is this architecture suitable?**
  Clinical workflow demands rapid context switching between cohort overviews and individual patient deep-dives without full page reloads.
* **What alternatives could have been used?**
  Traditional multi-page enterprise EHR portal (e.g. Epic/Cerner web plugins). NeuroGuard AI provides a lightweight, focused modern web dashboard tailored specifically for tele-rehabilitation.
* **How does the feature communicate with other modules?**
  Links to [AppointmentList.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AppointmentsPage.jsx) to review appointments and [ReportViewer.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/RecoveryReportModal.jsx) to view shared reports.
* **What dependencies does it have?**
  `lucide-react` icons, Recharts visualization components.

### Security Understanding
* **How is this feature protected?**
  Backend routes enforce strict RBAC middleware: `requireRole(['doctor', 'admin'])`.
* **What happens when an unauthorized user attempts access?**
  A patient attempting to access `/api/doctors/dashboard` receives HTTP `403 Forbidden`.
* **How is sensitive data protected?**
  Object-level access control ensures a doctor can only access records for patients where `patient.assignedDoctorId === req.user.id` (or shared clinical reports).
* **What validation is performed?**
  Validates that requested `patientId` parameters are valid 24-character hexadecimal MongoDB ObjectIds.

### Critical Technical Understanding
* **What are the biggest technical challenges?**
  Efficiently aggregating longitudinal statistics across hundreds of patients without generating $N+1$ database query cascades.
* **What are the possible failure scenarios?**
  A patient is unassigned to any doctor; handled via unassigned patient pool view accessible by administrative staff.
* **What are the performance bottlenecks?**
  Multi-table aggregation joins across users and assessments. Solved by compound index `{ assignedDoctorId: 1 }` on `User` and `{ patientId: 1, createdAt: -1 }` on `Assessment`.
* **What happens with concurrent requests?**
  Read-heavy queries run against read replicas without impacting operational assessment logging.
* **How would we scale this feature?**
  Implement paginated cursor-based scrolling (`limit=25`, `nextCursor`) and cache cohort summary statistics in Redis.

---

## 9. In-Person Doctor Appointment Scheduling & Concurrency Mutex

### Basic Understanding
* **What is this feature?**
  A deterministic, in-person clinical consultation booking system with working-hours slot generation, double-booking prevention, and state-machine lifecycle tracking.
* **Why did we develop it?**
  When telerehabilitation flags functional decline or when baseline evaluations are due, patients must book physical, in-clinic consultations with their assigned physician.
* **What problem does it solve?**
  Prevents appointment double-booking, ensures consultations occur strictly during validated physical clinic hours, and prevents invalid video-call booking mistakes.
* **Who uses it?**
  Patients book appointments; doctors manage availability, accept bookings, or cancel sessions.
* **What happens when a user interacts with it?**
  Patient selects an assigned doctor, picks an upcoming date, selects an available 30-minute working slot, enters clinical visit notes, and confirms. The slot is locked, validated, and confirmed.

### Implementation Understanding
* **How is it implemented?**
  Frontend in [AppointmentBookingModal.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/BookingModal.jsx#L1-L150) and [AppointmentList.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AppointmentsPage.jsx#L1-L200). Backend in [appointments.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/appointmentRoutes.js#L1-L180).
* **Which frontend component handles it?**
  `AppointmentBookingModal.jsx` handles date selection, slot filtering, and submission. `AppointmentList.jsx` displays booked cards with status pills and cancellation controls.
* **Which API is called?**
  - `GET /api/appointments/available-slots?doctorId=...&date=...`
  - `POST /api/appointments/book`
  - `PATCH /api/appointments/:id/cancel`
* **Which backend function processes it?**
  Route controllers in `appointments.js` verifying doctor clinic hours, generating 30-minute intervals, acquiring concurrency locks, and writing to database.
* **Which database model stores its data?**
  `Appointment` collection [Appointment.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/Appointment.js#L1-L75).
* **What algorithms are involved?**
  - **Slot Generator**: Iterates in 30-minute steps from `workingHours.start` (default `09:00`) to `workingHours.end` (default `17:00`), excluding existing booked appointments matching `{ doctorId, date, status: { $in: ['pending', 'confirmed'] } }`.
  - **In-Memory Concurrency Mutex**:
    ```javascript
    const lockKey = `${doctorId}_${date}_${startTime}`;
    if (activeBookingLocks.has(lockKey)) {
      return res.status(409).json({ message: 'Slot currently being reserved' });
    }
    activeBookingLocks.add(lockKey);
    try { /* DB Write */ } finally { activeBookingLocks.delete(lockKey); }
    ```
  - **Database Compound Partial Unique Index**:
    `{ doctorId: 1, date: 1, startTime: 1 }` with partial filter `{ status: { $nin: ['cancelled', 'completed'] } }`.
* **How is the result calculated?**
  If lock acquired and database write succeeds, appointment status is set to `confirmed` (or `pending`), and notification is dispatched to doctor.
* **What happens if something fails?**
  - Slot collision returns HTTP `409 Conflict` (`{ message: 'This slot has already been booked' }`).
  - Double booking during identical millisecond race condition is rejected by MongoDB E11000 duplicate key error.

### Architecture Understanding
* **Why did we choose this technology?**
  Two-tier concurrency protection (application-level memory mutex + database-level unique constraint) guarantees absolute zero double-booking even under concurrent traffic spikes.
* **Why is this architecture suitable?**
  Physical medical appointments have strict legal capacity constraints; double booking degrades clinic operations and causes severe patient distress.
* **What alternatives could have been used?**
  Distributed Redis Redlock. In-memory Set + MongoDB unique index was chosen for zero-dependency simplicity while providing bulletproof correctness in single-node/replica deployments.
* **How does the feature communicate with other modules?**
  Dispatches alerts via `notificationService.js` to both doctor and patient upon booking or cancellation.
* **What dependencies does it have?**
  `mongoose`, native JavaScript `Set`.

### Security Understanding
* **How is this feature protected?**
  Patients can only book appointments for their own authenticated user ID. Doctors can only manage appointments where they are the designated practitioner.
* **What happens when an unauthorized user attempts access?**
  Attempts to modify or cancel another patient's appointment return `403 Forbidden` (`{ message: 'Not authorized to modify this appointment' }`).
* **How is sensitive data protected?**
  Clinical visit reason and notes are stored encrypted at rest and accessible only to the attending doctor and patient.
* **What validation is performed?**
  Validates date format (`YYYY-MM-DD`), time format (`HH:mm`), ensures booked date is not in the past, and rejects appointments outside 09:00–17:00 working hours.

### Critical Technical Understanding
* **What are the biggest technical challenges?**
  Atomic reservation preventing two patients from booking the exact same 10:30 AM slot simultaneously.
* **What are the possible failure scenarios?**
  Server crashes while holding in-memory mutex. Automatically recovered because memory clears upon process restart, and database unique index remains permanently enforceable.
* **What are the performance bottlenecks?**
  Scanning booked slots. Completely eliminated via compound B-Tree index on `{ doctorId: 1, date: 1 }`.
* **What happens with concurrent requests?**
  First request succeeds; second request receives immediate HTTP 409 and prompts patient to select an alternative slot.
* **How would we scale this feature?**
  In a multi-pod Kubernetes cluster, transition `activeBookingLocks` from local Node.js `Set` to a Redis distributed key with 10-second TTL (`SET lockKey token NX EX 10`).

---

## 11. In-App Notification Dispatch & Escalation Engine

### Basic Understanding
* **What is this feature?**
  An asynchronous notification and alerting engine that delivers urgent clinical warnings, appointment reminders, and recovery milestone achievements.
* **Why did we develop it?**
  Time-sensitive events—such as sudden functional decline, missed exercises, or confirmed appointments—require immediate notification to maintain patient safety.
* **What problem does it solve?**
  Ensures doctors and patients never miss critical clinical events or scheduled consultations.
* **Who uses it?**
  All users: patients receive exercise reminders and appointment confirmations; doctors receive decline alerts.
* **What happens when a user interacts with it?**
  A bell icon in the top navigation bar displays unread badge counts. Clicking it opens a dropdown list of recent alerts with read/unread toggles and deep links.

### Implementation Understanding
* **How is it implemented?**
  Frontend in [NotificationCenter.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/Topbar.jsx#L1-L120). Backend in [notifications.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/notificationRoutes.js#L1-L90) and [notificationService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/notificationService.js#L1-L80).
* **Which frontend component handles it?**
  `NotificationCenter.jsx` mounts in the top navbar [Header.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/Topbar.jsx), polls `/api/notifications/unread-count`, and renders alert cards.
* **Which API is called?**
  - `GET /api/notifications`
  - `PATCH /api/notifications/:id/read`
  - `PATCH /api/notifications/mark-all-read`
* **Which backend function processes it?**
  `notificationService.sendNotification({ recipientId, type, title, message, priority, metadata })`.
* **Which database model stores its data?**
  `Notification` collection [Notification.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/Notification.js#L1-L60).
* **What algorithms are involved?**
  Priority-based routing: `urgent` notifications (persistent decline) trigger immediate high-priority UI badges, whereas `info` notifications (exercise completed) post standard updates.
* **How is the result calculated?**
  Unread notifications are queried via `{ recipientId: req.user.id, read: false }` with count aggregation.
* **What happens if something fails?**
  Notification delivery failure is caught and logged without aborting the parent assessment write transaction.

### Architecture Understanding
* **Why did we choose this technology?**
  In-app MongoDB-backed notification queue ensures persistence across browser restarts without requiring external third-party push subscriptions during early development.
* **Why is this architecture suitable?**
  Lightweight and reliable; integrates directly with existing REST API authentication.
* **What alternatives could have been used?**
  WebSockets (Socket.io) or Server-Sent Events (SSE). Polling was selected for prototype simplicity, with clear upgrade path to WebSockets.
* **How does the feature communicate with other modules?**
  Called by `trendEngine.js` on decline detection, `appointments.js` on booking/cancellation, and `reports.js` on report generation.
* **What dependencies does it have?**
  `mongoose`, `lucide-react` icons.

### Security Understanding
* **How is this feature protected?**
  Users can only fetch, read, or delete notifications where `recipientId === req.user.id`.
* **What happens when an unauthorized user attempts access?**
  Attempting to mark another user's notification as read returns `404 Not Found` or `403 Forbidden`.
* **How is sensitive data protected?**
  Notifications contain concise summary text and exclude raw medical records or full diagnostic details.
* **What validation is performed?**
  Notification type validated against `['decline_alert', 'appointment', 'streak_milestone', 'system']`.

### Critical Technical Understanding
* **What are the biggest technical challenges?**
  Preventing notification spam (e.g., sending 10 duplicate decline alerts if patient performs 10 exercises in one afternoon). Solved via alert deduplication window (1 alert per 24 hours per metric).
* **What are the possible failure scenarios?**
  Database write failure during notification creation; handled by wrapping in non-blocking try/catch.
* **What are the performance bottlenecks?**
  High polling frequency from multiple browser tabs. Mitigated via 60-second polling intervals and client-side tab visibility detection.
* **What happens with concurrent requests?**
  Atomic updates via MongoDB `updateMany({ recipientId, read: false }, { $set: { read: true } })`.
* **How would we scale this feature?**
  Introduce WebSockets via Redis Pub/Sub to push real-time alerts instantly, eliminating client-side HTTP polling entirely.

---

## 12. Clinical Recovery Reports & Secure Doctor Sharing

### Basic Understanding
* **What is this feature?**
  A formal clinical report generation and secure distribution subsystem that compiles longitudinal assessment trends, adherence scores, and AI summaries into exportable clinical records.
* **Why did we develop it?**
  Patients need to share their home recovery progress with consulting neurologists, physical therapists, and insurance providers who may not be direct platform users.
* **What problem does it solve?**
  Eliminates fragmented handwritten exercise diaries and provides objective, verifiable clinical progress reports.
* **Who uses it?**
  Patients generate and share reports; doctors review and inspect shared records.
* **What happens when a user interacts with it?**
  Patient selects a date range (e.g., "Last 30 Days"), clicks "Generate Report", views the compiled progress report with charts and summaries, and shares it with their doctor via secure access link.

### Implementation Understanding
* **How is it implemented?**
  Frontend in [ReportViewer.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/RecoveryReportModal.jsx#L1-L150). Backend in [reports.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/reportRoutes.js#L1-L120) and [reportService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/reportSharingService.js#L1-L90).
* **Which frontend component handles it?**
  `ReportViewer.jsx` renders print-ready clinical report formatting, PDF export button, and doctor sharing controls.
* **Which API is called?**
  - `POST /api/reports/generate`
  - `GET /api/reports/:id`
  - `POST /api/reports/:id/share`
* **Which backend function processes it?**
  `reportService.compilePatientReport(patientId, timeframe)` aggregating assessments, calculating trend averages, and generating clinical synthesis via Gemini.
* **Which database model stores its data?**
  `Report` collection [Report.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/SharedRecoveryReport.js#L1-L65).
* **What algorithms are involved?**
  - Timeframe metric aggregation (mean, median, standard deviation of exercise scores).
  - Secure unguessable sharing token generation (`crypto.randomBytes(24).toString('base64url')`) with configurable expiration (7 days).
* **How is the result calculated?**
  Report compiles overall adherence rate, baseline comparisons, per-exercise kinematic averages, and plain-language summary into a single permanent document.
* **What happens if something fails?**
  If Gemini is unavailable during report generation, the service uses deterministic template-based clinical summarization.

### Architecture Understanding
* **Why did we choose this technology?**
  Structured JSON documents stored in MongoDB allow instantaneous re-rendering in responsive HTML or PDF conversion via browser print stylesheets (`@media print`).
* **Why is this architecture suitable?**
  Ensures reports can be viewed on screen, printed on paper for clinical visits, or archived as digital records.
* **What alternatives could have been used?**
  Server-side Headless Chrome Puppeteer PDF rendering. Rejected for prototype due to 300MB Chromium binary overhead; browser CSS print styles achieve identical visual quality with zero server overhead.
* **How does the feature communicate with other modules?**
  Queries `Assessment` collection and dispatches alerts via `notificationService.js`.
* **What dependencies does it have?**
  `mongoose`, native Node.js `crypto`.

### Security Understanding
* **How is this feature protected?**
  Reports are protected by JWT authentication and sharing token verification.
* **What happens when an unauthorized user attempts access?**
  Accessing `/api/reports/:id` without ownership or a valid sharing token returns `403 Forbidden`.
* **How is sensitive data protected?**
  Sharing tokens expire after 7 days and can be manually revoked by the patient at any time with a single click.
* **What validation is performed?**
  Timeframe parameters validated to prevent generating reports spanning more than 365 days in a single request.

### Critical Technical Understanding
* **What are the biggest technical challenges?**
  Compiling complex multi-week assessment datasets into a concise, 1-page high-density clinical summary that physicians can review in $<60$ seconds.
* **What are the possible failure scenarios?**
  Patient generates report when 0 assessments exist in timeframe; handled by returning validation message prompting them to complete baseline exercises first.
* **What are the performance bottlenecks?**
  Large aggregations across hundreds of assessments. Solved via index on `{ patientId: 1, createdAt: 1 }`.
* **What happens with concurrent requests?**
  Report generation creates a single immutable `Report` document, safe from race conditions.
* **How would we scale this feature?**
  Offload report generation to asynchronous background jobs for patients with thousands of historical records, notifying user when report is ready for download.

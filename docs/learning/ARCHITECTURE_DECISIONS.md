# Architecture Decision Records (ADRs)

This document records the foundational architectural decisions made during the design and engineering of **NeuroGuard AI**. Each record documents the context, alternatives considered, decision outcome, trade-offs, and supporting codebase references.

---

## Index of Architecture Decision Records

- [ADR-001: Client-Side Edge Computer Vision vs. Cloud Video Streaming](#adr-001-client-side-edge-computer-vision-vs-cloud-video-streaming)
- [ADR-002: Google MediaPipe Tasks Vision (WASM) vs. TensorFlow.js MoveNet](#adr-002-google-mediapipe-tasks-vision-wasm-vs-tensorflowjs-movenet)
- [ADR-003: Deterministic Mathematical Kinematics vs. End-to-End Action Recognition Models](#adr-003-deterministic-mathematical-kinematics-vs-end-to-end-action-recognition-models)
- [ADR-004: Dynamic 5-Session Personal Baselines vs. Static Population Benchmarks](#adr-004-dynamic-5-session-personal-baselines-vs-static-population-benchmarks)
- [ADR-005: Stateless Bearer JWTs vs. Stateful Server-Side Session Stores](#adr-005-stateless-bearer-jwts-vs-stateful-server-side-session-stores)
- [ADR-006: Two-Tier Concurrency Control for Doctor Appointment Booking](#adr-006-two-tier-concurrency-control-for-doctor-appointment-booking)
- [ADR-007: Strictly In-Person Physical Consultations for Motor Decline Triage](#adr-007-strictly-in-person-physical-consultations-for-motor-decline-triage)
- [ADR-008: Backend Gemini LLM Proxy with Strict Abort Timeout & Local Fallback](#adr-008-backend-gemini-llm-proxy-with-strict-abort-timeout--local-fallback)
- [ADR-009: Dual-Persistence MongoDB Atlas with Transparent In-Memory Fallback](#adr-009-dual-persistence-mongodb-atlas-with-transparent-in-memory-fallback)
- [ADR-010: Declarative Recharts (SVG) vs. Imperative Chart.js (HTML5 Canvas)](#adr-010-declarative-recharts-svg-vs-imperative-chartjs-html5-canvas)

---

### ADR-001: Client-Side Edge Computer Vision vs. Cloud Video Streaming

* **Status:** Accepted
* **Context:**
  Patients perform physical rehabilitation exercises in front of a camera. We needed to choose between streaming live video frames to a cloud server for computer vision inference (WebRTC/RTMP stream to a Python/PyTorch backend) or performing inference directly inside the client's web browser using WebAssembly.
* **Decision Drivers:**
  1. Patient privacy: Video of patients in their homes constitutes sensitive Protected Health Information (PHI).
  2. Bandwidth and server compute costs: Streaming high-definition video from thousands of simultaneous patients requires expensive GPU clusters and gigabit networking.
  3. Real-time latency: Patients require immediate (<50ms) visual skeleton feedback to correct form during exercises.
* **Considered Alternatives:**
  - *Alternative A: Cloud Video Streaming (WebRTC to Cloud GPU)*: High latency (~300–800ms), prohibitive cloud GPU costs ($0.05/minute), and severe HIPAA liability risks.
  - *Alternative B: Client-Side Edge Processing (Selected)*: Zero video transmission, zero cloud GPU costs, instantaneous local canvas rendering.
* **Decision Outcome:**
  We selected **Client-Side Edge Processing**. The browser processes video frames in volatile RAM using WebAssembly and GPU acceleration. Only scalar, non-visual kinematic metrics (joint angles, symmetry percentages, repetitions) are transmitted to the backend API.
* **Consequences & Trade-offs:**
  - *Positive:* Absolute video privacy compliance by design; zero video cloud hosting costs; $<20\text{ms}$ local visual feedback latency.
  - *Negative:* Performance depends on the client device's CPU/GPU capabilities. Very old low-end smartphones may experience frame drops.
* **Implementation References:**
  - [CameraFeed.jsx](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/components/CameraAssessment.jsx)
  - [pose.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/lib/pose.js)

---

### ADR-002: Google MediaPipe Tasks Vision (WASM) vs. TensorFlow.js MoveNet

* **Status:** Accepted
* **Context:**
  For client-side edge pose estimation, we needed an open-source, production-ready JavaScript/WebAssembly pose estimation runtime capable of running in modern web browsers.
* **Decision Drivers:**
  1. Number and coverage of anatomical landmarks (full body vs. partial upper body).
  2. Availability of true 3D metric world coordinates.
  3. Inference speed and bundle size.
* **Considered Alternatives:**
  - *Alternative A: TensorFlow.js MoveNet (SinglePose.Lightning)*: Tracks only 17 keypoints. Lacks hand articulation (wrists/pinkies) and foot orientation keypoints; outputs only 2D normalized coordinates.
  - *Alternative B: MediaPipe Tasks Vision Pose Landmarker Lite (Selected)*: Tracks 33 full-body landmarks, outputs both 2D normalized coordinates and 3D metric world coordinates in meters, and leverages SIMD-compiled WebAssembly with WebGL GPU acceleration.
* **Decision Outcome:**
  We selected **MediaPipe Tasks Vision Pose Landmarker Lite**. The 33 landmarks provide critical wrist, elbow, hip, knee, and ankle keypoints required to calculate bilateral symmetry, knee joint angles, and reach distances.
* **Consequences & Trade-offs:**
  - *Positive:* 33 landmarks enable clinical-grade joint angle tracking; 3D metric coordinates prevent perspective foreshortening distortion.
  - *Negative:* Model weight asset (`pose_landmarker_lite.task`, ~9MB) and WASM binaries must be loaded on initial assessment mount.
* **Implementation References:**
  - [pose.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/lib/pose.js#L15-L45)
  - Asset directory: `/public/models/pose_landmarker_lite.task`

---

### ADR-003: Deterministic Mathematical Kinematics vs. End-to-End Action Recognition Models

* **Status:** Accepted
* **Context:**
  We evaluated whether to assess exercise form using an end-to-end deep learning action recognition model (e.g. VideoMAE or 3D CNNs) or deterministic vector trigonometry applied to extracted spatial landmarks.
* **Decision Drivers:**
  1. Clinical interpretability: Physical therapists require exact joint degrees (e.g. $145^\circ$ knee extension), not unexplainable black-box confidence scores.
  2. Compute efficiency: Running deep temporal neural networks on top of pose estimation in the browser would cause severe frame drops.
  3. Auditability and safety: Algorithmic calculations must be reproducible and mathematically verifiable.
* **Considered Alternatives:**
  - *Alternative A: End-to-End Action Classifier Neural Network*: Opaque black box; cannot explain why an exercise was scored 70 vs 90; prone to bias.
  - *Alternative B: Deterministic Vector Kinematics (Selected)*: 3D dot products, Euclidean norms, and hysteresis state machines.
* **Decision Outcome:**
  We selected **Deterministic Vector Kinematics**. All exercise scores are derived from clear geometric formulas: vector dot products for knee angles, coordinate deltas for arm elevations, and state machines with debounce cooldowns for repetitions.
* **Consequences & Trade-offs:**
  - *Positive:* 100% explainable, deterministic, and auditable; zero inference compute overhead; directly maps to clinical physical therapy metrics.
  - *Negative:* Formulas must be carefully tuned per exercise to handle morphological diversity and camera angles.
* **Implementation References:**
  - [scoring.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/lib/scoring.js#L13-L167)
  - [ALGORITHMS_AND_FORMULAS.md](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/docs/technical/ALGORITHMS_AND_FORMULAS.md)

---

### ADR-004: Dynamic 5-Session Personal Baselines vs. Static Population Benchmarks

* **Status:** Accepted
* **Context:**
  Patients recovering from stroke or brain injury possess widely varying starting functional capabilities. We needed to choose how to benchmark and classify their ongoing progress.
* **Decision Drivers:**
  1. Patient psychological motivation: Measuring a hemiparetic stroke survivor against an unimpaired adult baseline yields permanent 10% scores, inducing despair.
  2. Clinical validity: Detecting whether a patient is regaining motor unit recruitment requires comparing them against their own recent envelope.
* **Considered Alternatives:**
  - *Alternative A: Static Population Norms*: Fixed normative tables based on healthy demographics. Clinically misleading for acute post-stroke patients.
  - *Alternative B: Dynamic 5-Session Rolling Baseline (Selected)*: Arithmetic mean of the patient's prior 5 valid sessions.
* **Decision Outcome:**
  We selected the **Dynamic 5-Session Personal Baseline**. A patient's recovery trajectory is evaluated against their own moving average: $\Delta\% \ge +5\%$ indicates improvement, whereas 3 consecutive sessions below baseline with a mean drop $>5\%$ triggers a persistent decline clinical review alert.
* **Consequences & Trade-offs:**
  - *Positive:* Clinically appropriate; motivates incremental recovery; prevents alarm fatigue by requiring 3 consecutive declining sessions.
  - *Negative:* Requires at least 3 historical sessions before baseline trends can be established (`baseline_establishment` phase).
* **Implementation References:**
  - [trendEngine.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/trendEngine.js#L30-L95)
  - [BASELINE_AND_TREND_ENGINE.md](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/docs/features/BASELINE_AND_TREND_ENGINE.md)

---

### ADR-005: Stateless Bearer JWTs vs. Stateful Server-Side Session Stores

* **Status:** Accepted
* **Context:**
  We evaluated whether to authenticate users using server-side session stores (e.g. Express-session with Redis) or stateless cryptographically signed JSON Web Tokens (JWT).
* **Decision Drivers:**
  1. Horizontal scalability: Backend services should be able to scale without sharing session memory.
  2. Cross-client versatility: Support web SPAs and future native mobile apps using standard HTTP headers.
  3. Architectural simplicity for simple deployment without mandatory Redis infrastructure.
* **Considered Alternatives:**
  - *Alternative A: Stateful Server-Side Sessions with Redis*: Requires a dedicated Redis instance; complicates deployment and memory management.
  - *Alternative B: Stateless Bearer JWTs (Selected)*: Signed with HMAC-SHA256 (`JWT_SECRET`), containing user ID and role, valid for 7 days.
* **Decision Outcome:**
  We selected **Stateless Bearer JWTs**. Express middleware (`authenticateToken`, `requireRole`) verifies the cryptographic signature in-memory on every request without issuing a database lookup, delivering microsecond verification times.
* **Consequences & Trade-offs:**
  - *Positive:* Zero database overhead for auth verification; horizontally scalable across multiple server instances; simple deployment.
  - *Negative:* Instant token revocation before the 7-day expiration requires token blocklisting; client stores token in `localStorage`.
* **Implementation References:**
  - [auth.js middleware](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/middleware/auth.js#L11-L60)
  - [auth.js routes](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/server.js#L26-L100)

---

### ADR-006: Two-Tier Concurrency Control for Doctor Appointment Booking

* **Status:** Accepted
* **Context:**
  When multiple patients attempt to book the exact same 30-minute doctor time slot simultaneously, the system must guarantee that double-booking is strictly impossible.
* **Decision Drivers:**
  1. Medical clinic capacity: Doctors cannot physically attend two in-person clinical consultations at the same time.
  2. ACID compliance: Protection against simultaneous race conditions under high network concurrency.
* **Considered Alternatives:**
  - *Alternative A: Simple Read-Check-Write*: Query database for existing booking, then insert. Highly vulnerable to race conditions (time-of-check to time-of-use flaw).
  - *Alternative B: Distributed Redis Lock*: Requires adding Redis infrastructure.
  - *Alternative C: Two-Tier Mutex + Database Unique Constraint (Selected)*: Application-level memory lock for instant rejection + MongoDB compound partial unique index.
* **Decision Outcome:**
  We implemented **Two-Tier Concurrency Control**:
  1. In-memory `activeBookingLocks` Set: Fast-rejects concurrent reservation attempts on the same key (`doctorId_date_startTime`).
  2. MongoDB Compound Partial Unique Index: `{ doctorId: 1, date: 1, startTime: 1 }` filtered on `{ status: { $in: ['pending', 'confirmed'] } }`. Guarantees database-level uniqueness even if multiple server processes execute simultaneously.
* **Consequences & Trade-offs:**
  - *Positive:* 100% mathematical guarantee against double-booking; zero external dependencies (no Redis required for single node).
  - *Negative:* In-memory lock is node-local; scaling to a multi-instance Kubernetes cluster requires transitioning the mutex to Redis Redlock.
* **Implementation References:**
  - [appointments.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/routes/appointmentRoutes.js#L40-L75)
  - [Appointment.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/models/Appointment.js#L55-L65)

---

### ADR-007: Strictly In-Person Physical Consultations for Motor Decline Triage

* **Status:** Accepted
* **Context:**
  We evaluated whether doctor appointment bookings should support remote telehealth video calls or be restricted strictly to in-person physical clinical consultations.
* **Decision Drivers:**
  1. Clinical safety: When the trend engine detects persistent motor decline, hands-on neurological examination is required to evaluate spasticity (Modified Ashworth Scale), deep tendon reflexes, and cranial nerve function.
  2. Patient positioning: Video calls often suffer from poor camera framing, making remote clinical diagnosis of motor regression unreliable.
* **Considered Alternatives:**
  - *Alternative A: Telehealth Video Call Appointments*: Convenient for patients, but clinically inadequate for diagnosing neurological deterioration.
  - *Alternative B: Strictly In-Person Clinical Consultations (Selected)*: Appointments are reserved for physical clinic visits at the doctor's registered medical facility.
* **Decision Outcome:**
  We restricted appointments to **Strictly In-Person Consultations**. The UI and backend schemas store physical clinic addresses and working hours, explicitly guiding patients to visit the clinic for hands-on evaluation when tele-monitoring flags regression.
* **Consequences & Trade-offs:**
  - *Positive:* Highest clinical safety standard; ensures appropriate medical physical triage when patients experience regression.
  - *Negative:* Patients living in remote rural areas must travel to the clinic.
* **Implementation References:**
  - [Appointment.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/models/Appointment.js#L1-L75)
  - [AppointmentBookingModal.jsx](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/components/BookingModal.jsx)

---

### ADR-008: Backend Gemini LLM Proxy with Strict Abort Timeout & Local Fallback

* **Status:** Accepted
* **Context:**
  We evaluated how to integrate Google Gemini AI for generating patient recovery explanations without compromising security, reliability, or latency.
* **Decision Drivers:**
  1. API key security: The private `GEMINI_API_KEY` must never be exposed in client-side bundles or network tabs.
  2. Zero-downtime reliability: External AI APIs can experience rate limits, latency spikes, or global outages. The application must never hang or fail if Gemini is unavailable.
  3. Prompt safety: Prevent hallucinations and medical diagnosis claims.
* **Considered Alternatives:**
  - *Alternative A: Direct Client-Side Gemini API Calls*: Critical security vulnerability (exposes API key in browser); zero prompt sanitization.
  - *Alternative B: Backend Proxy with Abort Timeout & Local Fallback (Selected)*: Backend manages API key, runs 15s AbortController timeout, sanitizes metrics, and falls back to deterministic local explanations.
* **Decision Outcome:**
  We selected the **Backend Proxy with Abort Timeout & Local Fallback**. If Gemini does not respond within 15 seconds or returns an error, `buildLocalExplanation()` generates an immediate rule-based summary, guaranteeing that assessment submissions never fail.
* **Consequences & Trade-offs:**
  - *Positive:* 100% uptime resilience; private keys remain secure; strictly eliminates diagnostic hallucination risks.
  - *Negative:* Adds minor network round-trip latency to the assessment write endpoint.
* **Implementation References:**
  - [geminiService.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/services/geminiService.js#L1-L120)
  - [GEMINI_AI_INTEGRATION.md](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/docs/features/GEMINI_AI_INTEGRATION.md)

---

### ADR-009: Dual-Persistence MongoDB Atlas with Transparent In-Memory Fallback

* **Status:** Accepted
* **Context:**
  During development and offline demos, cloud database connectivity (MongoDB Atlas) may be unavailable due to firewall restrictions, missing environment variables, or internet drops.
* **Decision Drivers:**
  1. Demonstration reliability: Reviewers and evaluators must be able to boot the project with zero setup and test all features even without a live MongoDB connection string.
  2. Clean degradation: Switching to in-memory mode must happen automatically without throwing unhandled exceptions.
* **Considered Alternatives:**
  - *Alternative A: Fail-Fast (Halt process on DB error)*: Standard for production, but brittle for demonstrations and local developer testing.
  - *Alternative B: Dual-Persistence with Transparent In-Memory Fallback (Selected)*: `connectDB()` attempts MongoDB connection with 5s timeout; falls back to `store.js` in-memory repository on failure.
* **Decision Outcome:**
  We implemented **Dual-Persistence with Transparent In-Memory Fallback**. If `MONGODB_URI` is missing or connection fails, the server seeds initial demo records into memory Maps and logs an informative warning banner. All routes operate seamlessly against the in-memory store.
* **Consequences & Trade-offs:**
  - *Positive:* Flawless developer onboarding and offline demonstration capability; 100% test reliability.
  - *Negative:* In-memory mutations are lost upon server restart. Production deployments must configure a persistent database.
* **Implementation References:**
  - [db.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/db.js#L1-L45)
  - [store.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/store.js#L1-L150)

---

### ADR-010: Declarative Recharts (SVG) vs. Imperative Chart.js (HTML5 Canvas)

* **Status:** Accepted
* **Context:**
  We evaluated whether to render longitudinal recovery trend graphs and radar charts using Chart.js (canvas-based) or Recharts (declarative SVG-based).
* **Decision Drivers:**
  1. React component integration and lifecycle ergonomics.
  2. Responsive resizing behavior inside Tailwind CSS grid layouts.
  3. Accessibility and custom component tooltips.
* **Considered Alternatives:**
  - *Alternative A: Chart.js / react-chartjs-2*: Imperative canvas API; requires manual chart destruction on component unmount; sizing bugs inside flex containers.
  - *Alternative B: Recharts (Selected)*: Declarative React component model rendering native DOM SVG elements.
* **Decision Outcome:**
  We selected **Recharts**. Its `<ResponsiveContainer>`, `<LineChart>`, `<Tooltip>`, and `<RadarChart>` components integrate naturally with React state, handle window resize events via ResizeObserver, and allow full CSS/Tailwind customization.
* **Consequences & Trade-offs:**
  - *Positive:* Clean declarative React code; responsive resizing; accessible SVG nodes; rich custom tooltips.
  - *Negative:* SVG DOM nodes have higher memory overhead than canvas for massive datasets ($>10,000$ points), but longitudinal rehabilitation charts typically display 10–30 points, where SVG performance is optimal.
* **Implementation References:**
  - [TrendChart.jsx](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/components/TrendChart.jsx)
  - [FRONTEND_ARCHITECTURE.md](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/docs/architecture/FRONTEND_ARCHITECTURE.md)

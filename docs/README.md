# NeuroGuard AI — Developer Knowledge Base & Technical Documentation

Welcome to the comprehensive technical documentation and reverse-engineered architecture guide for **NeuroGuard AI**.

NeuroGuard AI is an AI-assisted home recovery and functional monitoring platform designed for stroke survivors and neurological rehabilitation patients. It empowers patients to conduct privacy-first computer vision assessments in the comfort of their home, tracks personal longitudinal baselines, and enables attending clinicians to prescribe exercise protocols, review objective kinematic trends, manage in-person clinic appointments, and inspect patient-authorized recovery reports.

---

## Documentation Directory Map

This documentation suite is organized into 10 structured sections:

```
docs/
│
├── README.md                              <- You are here: Root entry point & navigation index
├── 01_PROJECT_OVERVIEW.md                 <- High-level executive overview, mission, core stack
├── 02_PROBLEM_STATEMENT.md                <- Post-stroke rehabilitation gap and clinical pain points
├── 03_PRODUCT_VISION.md                   <- Long-term vision, ethics, non-diagnostic safety boundaries
├── 04_FEATURE_CATALOG.md                  <- Exhaustive catalog of all implemented & planned capabilities
│
├── architecture/
│   ├── SYSTEM_ARCHITECTURE.md             <- End-to-end full-stack component architecture & topologies
│   ├── FRONTEND_ARCHITECTURE.md           <- React 19, Vite, state management, component tree
│   ├── BACKEND_ARCHITECTURE.md            <- Express routing, controllers, services, middleware
│   ├── DATABASE_ARCHITECTURE.md           <- Dual storage architecture (In-Memory + MongoDB Mongoose)
│   ├── DATA_FLOW.md                       <- Data lifecycles from webcam frames to database persistence
│   └── ER_DIAGRAM.md                      <- Entity-Relationship diagram, schemas, and relational keys
│
├── features/
│   ├── AUTHENTICATION.md                  <- JWT auth, bcrypt hashing, RBAC, session management
│   ├── PATIENT_DASHBOARD.md               <- Patient UI, metric scorecards, baseline cards, trends
│   ├── MEDIAPIPE_COMPUTER_VISION.md       <- MediaPipe Tasks Vision, Pose Landmarker, GPU/CPU pipeline
│   ├── MOVEMENT_ASSESSMENTS.md            <- Arm Raise, Sit-to-Stand, Seated Reach kinematic engines
│   ├── SPEECH_ASSESSMENT.md               <- Audio capture, speech rate, pause detection, similarity
│   ├── BASELINE_AND_TREND_ENGINE.md       <- Moving-window baseline, percentage deltas, anomaly alerts
│   ├── GEMINI_AI_INTEGRATION.md           <- Google Gemini API integration, prompt guardrails, fallback
│   ├── DOCTOR_DASHBOARD.md                <- Clinician triage roster, protocol assignments, notes
│   ├── DOCTOR_APPOINTMENTS.md             <- In-person clinic visit discovery, slots, mutex reservation
│   ├── NOTIFICATION_SYSTEM.md             <- In-app notification store, HTTP polling, unread counts
│   └── RECOVERY_REPORTS.md                <- Recovery report compilation, sharing consent, audit logging
│
├── api/
│   ├── API_OVERVIEW.md                    <- REST conventions, authentication headers, error envelopes
│   ├── AUTHENTICATION_APIS.md             <- /api/auth/login, /api/auth/signup specifications
│   ├── PATIENT_APIS.md                    <- /api/users/:id/dashboard, /trends, /alerts, /health
│   ├── ASSESSMENT_APIS.md                 <- /api/assessments, /assignments, /api/speech/analyze
│   ├── DOCTOR_APIS.md                     <- /api/doctors, /patients, /availability, /profile
│   ├── APPOINTMENT_APIS.md                <- /api/appointments, /confirm, /reject, /reschedule, /cancel
│   ├── REPORT_APIS.md                     <- /api/reports/preview, /share, /shared/:id, /shares/:id
│   └── NOTIFICATION_APIS.md               <- /api/notifications, /:id/read, /read-all
│
├── security/
│   ├── SECURITY_ARCHITECTURE.md           <- Defense-in-depth model, JWT lifecycle, sanitization
│   ├── AUTHORIZATION_MATRIX.md            <- Granular role-based & resource-based access control matrix
│   ├── DATA_PRIVACY.md                    <- Zero-video retention, on-device MediaPipe, HIPAA alignment
│   └── SECURITY_LIMITATIONS.md            <- Known security gaps, production hardening roadmap
│
├── workflows/
│   ├── PATIENT_WORKFLOW.md                <- Registration, daily check-in, dashboard review
│   ├── ASSESSMENT_WORKFLOW.md             <- Camera initialization, pose tracking, metric calculation
│   ├── RECOVERY_TRACKING_WORKFLOW.md      <- Baseline calculation, persistent decline detection, alerts
│   ├── APPOINTMENT_WORKFLOW.md            <- Discovery, slot generation, mutex booking, confirmation
│   └── REPORT_SHARING_WORKFLOW.md         <- Preview generation, consent grant, doctor review, revocation
│
├── database/
│   ├── DATABASE_MODELS.md                 <- Schema definitions, Mongoose fields, validation rules
│   ├── COLLECTIONS_AND_RELATIONSHIPS.md   <- Cross-collection keys, foreign references, cardinality
│   └── INDEXES_AND_VALIDATION.md          <- Partial unique indexes, TTL, compound performance indexes
│
├── development/
│   ├── LOCAL_SETUP.md                     <- Clean-clone installation, prerequisites, environment setup
│   ├── ENVIRONMENT_VARIABLES.md           <- Comprehensive reference for frontend and backend variables
│   ├── DEVELOPMENT_COMMANDS.md            <- npm scripts, build commands, test runners, inspection
│   ├── TESTING_GUIDE.md                   <- Node test runner suite, security test cases, mocking
│   └── DEPLOYMENT_GUIDE.md                <- Production build, containerization, hosting topology
│
├── technical/
│   ├── ALGORITHMS_AND_FORMULAS.md         <- Mathematical kinematics, joint angle trigonometry, scoring
│   ├── DEPENDENCIES.md                    <- Exhaustive package audit for client and server dependencies
│   ├── ERROR_HANDLING.md                  <- Resilience patterns, HTTP status codes, graceful degradation
│   └── REAL_VS_MOCK_AUDIT.md              <- Critical audit of live DB vs in-memory vs seeded demo data
│
└── learning/
    ├── COMPLETE_FEATURE_QA.md             <- 360-degree technical Q&A across every core system feature
    ├── TECHNICAL_INTERVIEW_QUESTIONS.md   <- Deep engineering interview questions & answers
    ├── ARCHITECTURE_DECISIONS.md          <- ADR records (ADR-001 through ADR-010) explaining trade-offs
    └── DEVELOPER_GLOSSARY.md              <- Domain glossary spanning clinical, CV, and web concepts
```

---

## Quick Technology Reference

| Layer | Technologies Used | Primary Implementation Files |
| :--- | :--- | :--- |
| **Frontend UI** | React 19, Vite 6, Vanilla CSS Modules | [App.jsx](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/App.jsx), [app.css](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/styles/app.css) |
| **Computer Vision** | MediaPipe Tasks-Vision 0.10.22, WebAssembly | [pose.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/lib/pose.js), [CameraAssessment.jsx](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/components/CameraAssessment.jsx) |
| **Kinematic Scoring** | Vector trigonometry, 2D angle dot products | [scoring.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/lib/scoring.js) |
| **Data Visualizations** | Recharts 2.15 (SVG LineCharts, ResponsiveContainers) | [TrendChart.jsx](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/components/TrendChart.jsx), [ScoreRing.jsx](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/components/ScoreRing.jsx) |
| **Backend API** | Node.js (v20+), Express 4.21, CORS, Helmet | [server.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/server.js) |
| **Database Persistence** | MongoDB, Mongoose 8.9 (with fallback in-memory store) | [db.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/db.js), [store.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/store.js), [models/](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/models/) |
| **Authentication** | JSON Web Tokens (jsonwebtoken 9.0), bcryptjs 3.0 | [auth.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/middleware/auth.js) |
| **AI Explanations** | Google Gemini API (v1beta `gemini-3.5-flash-lite`) | [geminiService.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/services/geminiService.js) |
| **Statistical Engine** | Moving-window baseline averages, relative delta deltas | [trendEngine.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/trendEngine.js) |

---

## Architectural Principles & Clinical Boundaries

1. **Strict Non-Diagnostic Scope:** NeuroGuard AI provides assistive functional monitoring and objective kinematic measurements. It **never diagnoses medical conditions, replaces clinical judgment, or prescribes pharmaceutical interventions**.
2. **Personal Baselines over Population Averages:** Rehabilitation progress is non-linear and varies wildly across stroke survivors. Every metric is evaluated relative to the patient's own historical moving window ($N=5$ sessions), not generic demographic norms.
3. **Data Minimization & Video Privacy:** Computer vision processing occurs strictly inside the patient's browser using client-side WebAssembly and WebGL/GPU delegates. Raw video frames and camera streams are **never transmitted over the network or persisted to any server or cloud storage**.
4. **Physical In-Person Clinic Encounters:** All appointment booking workflows represent real, physical clinical encounters at verified hospital OPDs and rehabilitation clinics. Telemedicine and remote video calls are intentionally out of scope.
5. **Deterministic Foundation, LLM Explanation:** All calculations, rep counts, and anomaly alerts are 100% deterministic mathematical functions. Generative AI (Gemini) is employed solely for empathetic, plain-language translations of pre-computed numbers, safeguarded by strict prompt sanitization and local deterministic fallback routines.

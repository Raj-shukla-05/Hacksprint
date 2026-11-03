# End-to-End Workflow: Patient Registration, Daily Check-In & Dashboard

This document details the complete end-to-end user and technical workflow for a stroke survivor using NeuroGuard AI—from initial registration through daily functional check-in and dashboard inspection.

---

## 1. Complete Workflow Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    participant UI as React Frontend (App.jsx)
    participant Auth as Auth Middleware & Routes
    participant Dashboard as Dashboard & Trend Engine
    participant MediaPipe as MediaPipe WASM Engine
    participant DB as MongoDB / store.js

    Patient->>UI: Navigates to NeuroGuard AI
    UI->>UI: Checks sessionStorage ('neuroguard.user')
    alt No active session
        UI->>Patient: Render LoginPage.jsx
        Patient->>UI: Enters name, email, password & selects "Patient"
        UI->>Auth: POST /api/auth/signup
        Auth->>DB: Hash password (bcrypt) & insert User
        Auth-->>UI: Return JWT Token & User Profile
        UI->>UI: Save to sessionStorage ('neuroguard.token', 'neuroguard.user')
    end

    UI->>Dashboard: GET /api/users/:id/dashboard (Bearer JWT)
    Dashboard->>DB: Query historical Assessments & active Assignments
    Dashboard-->>UI: Return JSON { summary, metrics, baseline }
    UI->>Patient: Render PatientDashboard.jsx (ScoreRing, Domain Cards, Care Plan)

    Patient->>UI: Clicks "Start Today's Check"
    UI->>UI: Transitions view to 'assessment' (AssessmentPage.jsx)
    Patient->>UI: Selects "Arm Raise" (or follows prescribed protocol)
    UI->>MediaPipe: Request Camera Permission & Load WASM Model
    MediaPipe->>Patient: Render Video + Live Skeleton Overlay
    Patient->>MediaPipe: Performs 5 controlled arm raises
    Patient->>UI: Clicks "Finish Assessment"
    UI->>DB: POST /api/assessments (Numerical scores only)
    DB-->>UI: HTTP 201 Created (Updated Baseline Delta)
    UI->>Patient: Display Completion Banner & Toast Notification
    Patient->>UI: Clicks "Back to overview"
    UI->>Dashboard: Refresh Dashboard & Fetch Gemini AI Explanation
    Dashboard-->>UI: Render updated ScoreRing & Plain-Language Summary
```

---

## 2. Step-by-Step Technical Execution

### Step 1: Authentication & Session Initialization
- **User Action:** Patient enters credentials or clicks demo login.
- **Frontend Component:** [LoginPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/LoginPage.jsx).
- **API Request:** `POST /api/auth/login` with `{ email, password }`.
- **Backend Handler:** [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L66-L100).
- **Backend Function:** `bcrypt.compare()` verifies the password hash, and `generateToken()` issues a 7-day JWT.
- **Client Storage:** `api.setAuthToken(token)` stores the JWT in `sessionStorage.getItem('neuroguard.token')`.

### Step 2: Dashboard Data Retrieval
- **Frontend Component:** [PatientDashboard.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/PatientDashboard.jsx).
- **API Request:** `GET /api/users/:id/dashboard`.
- **Backend Processing:** [trendEngine.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/trendEngine.js#L51-L92) compiles the last 5 sessions into an arithmetic baseline and calculates the relative percentage change.
- **Rendering:** [ScoreRing.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/ScoreRing.jsx) renders the circular gauge, while [MetricCard.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/MetricCard.jsx) renders domain cards for Movement, Balance, Coordination, and Speech.

### Step 3: Clinician Protocol Identification
- **Frontend Processing:** Queries `GET /api/patients/:id/assignments`.
- **Display:** If an active assignment exists, an amber/blue card displays the doctor's specific guidance (e.g., *"Perform 5 slow arm raises; hold 1s at peak"*).
- **Action:** Clicking *"Start Assigned Protocol"* binds `selectedAssignment`, automatically pre-selecting the prescribed exercise in the assessment view.

### Step 4: Camera Check & Kinetic Assessment
- **Frontend Component:** [CameraAssessment.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/CameraAssessment.jsx).
- **Browser Permission:** `navigator.mediaDevices.getUserMedia({ video: true, audio: false })`.
- **Engine Initialization:** MediaPipe FilesetResolver loads `/mediapipe/wasm` and builds `PoseLandmarker` from `/models/pose_landmarker_lite.task`.
- **Execution Loop:** `requestAnimationFrame` continuously executes `detectForVideo()` and `drawSkeleton()`.

### Step 5: Session Submission & Persistence
- **Client Validation:** [AssessmentPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AssessmentPage.jsx#L26-L37) verifies `score > 0` and `duration >= 3`.
- **API Request:** `POST /api/assessments` sending metrics `{ score, duration, metrics, assignmentId, trackingQuality }`.
- **Backend Verification:** [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L540-L545) verifies `validFrames >= 5`.
- **Database Persistence:** Inserts document into MongoDB `Assessment` collection (or `store.js`). If `assignmentId` is present, it transitions the assignment status to `completed`.

### Step 6: Post-Session AI Summary
- **API Request:** `POST /api/explanation` with `{ findings }`.
- **Backend Processing:** `sanitizeFindings()` cleans unmeasured metrics and queries Gemini API (with local fallback).
- **User Display:** The dashboard updates with the new baseline delta and displays an empathetic AI explanation.

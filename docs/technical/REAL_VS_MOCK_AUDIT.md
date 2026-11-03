# Implementation Authenticity Audit: Real vs. Mock, Seeded & Simulated Components

This document provides a strict, code-grounded audit of the NeuroGuard AI codebase. It clearly separates genuine, persistent, and mathematically calculated functionality from mock fallbacks, seeded demonstration records, and simulation tools.

---

## 1. Feature Classification Summary Matrix

| Module / Component | Authenticity Status | Primary Code Reference | Audit Findings & Supporting Code Details |
| :--- | :---: | :--- | :--- |
| **MediaPipe Pose Tracking** | **REAL IMPLEMENTATION** | [pose.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/pose.js#L9-L47) | Genuine edge WebAssembly execution. Loads `/mediapipe/wasm` and `/models/pose_landmarker_lite.task`. Tracks real 33 3D landmarks from live webcam at 30–60 FPS. |
| **Arm Raise Kinematics** | **REAL IMPLEMENTATION** | [scoring.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/scoring.js#L13-L87) | Genuine vector trigonometry and state machine. Calculates real shoulder-wrist elevation, bilateral symmetry, elbow extension, and counts reps. |
| **Sit-to-Stand Kinematics** | **REAL IMPLEMENTATION** | [scoring.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/scoring.js#L89-L136) | Genuine knee angle ($B = \text{knee}$) trigonometry across hip, knee, and ankle landmarks. Repetition state machine with 20-frame cooldown. |
| **Seated Reach Kinematics** | **REAL IMPLEMENTATION** | [scoring.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/scoring.js#L138-L167) | Genuine Euclidean distance tracking from shoulder midpoint to wrist midpoint and path efficiency calculations. |
| **Personal Baseline Engine** | **REAL IMPLEMENTATION** | [trendEngine.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/trendEngine.js#L34-L50) | Genuine 5-session moving-window arithmetic mean calculation and relative percentage delta mathematics. |
| **Persistent Decline Anomaly Detector** | **REAL IMPLEMENTATION** | [trendEngine.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/trendEngine.js#L42-L49) | Genuine multi-condition check: inspects last 3 sessions, checks every session below baseline, and enforces $< 0.95 \times \text{baseline}$. |
| **MongoDB Persistence Engine** | **REAL IMPLEMENTATION** | [db.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/db.js), [models/](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/) | Fully implemented Mongoose models for 9 collections with real disk writes, connection timeouts, and partial unique indexes. |
| **In-Memory Fallback Store** | **REAL IMPLEMENTATION** | [store.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/store.js) | Genuine in-memory data structures (Maps and Arrays) used when MongoDB is offline or unconfigured. |
| **JWT & Password Security** | **REAL IMPLEMENTATION** | [auth.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/middleware/auth.js) | Genuine bcrypt (10 rounds) hashing and signed HMAC-SHA256 tokens with 7-day lifespans and role validation. |
| **Appointment Mutex Locking** | **REAL IMPLEMENTATION** | [appointmentService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/appointmentService.js#L292-L302) | Real in-memory mutex (`activeBookingLocks = new Set()`) and MongoDB partial unique index preventing concurrent double-booking. |
| **Atomic Rescheduling Engine** | **REAL IMPLEMENTATION** | [appointmentService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/appointmentService.js#L602-L665) | Books new slot, cancels previous slot, and records historical links in a single coordinated action. |
| **Recovery Report Compilation** | **REAL IMPLEMENTATION** | [reportSharingService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/reportSharingService.js#L14-L95) | Gathers real historical session records, derives genuine baseline and trend data, and formats clinical documentation. |
| **Report Access Audit Trail** | **REAL IMPLEMENTATION** | [reportSharingService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/reportSharingService.js#L259-L278) | Logs every view event with timestamp, doctor ID, client IP, and browser User-Agent in an immutable audit array. |
| **In-App Notification Center** | **REAL IMPLEMENTATION** | [notificationService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/notificationService.js), [Topbar.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/Topbar.jsx) | Dispatches notifications on clinical events; client polls `GET /api/notifications` every 15 seconds with read toggles. |
| **Caregiver Authorization Boundary** | **REAL IMPLEMENTATION** | [auth.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/middleware/auth.js#L44-L57) | Checks bidirectional links (`authorizedCaregivers` / `caregiverPatients`); unauthorized caregivers receive HTTP 403. |
| **Gemini AI API Integration** | **REAL IMPLEMENTATION** | [geminiService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/geminiService.js#L119-L251) | Real HTTPS fetch requests to Google Generative Language API (`gemini-3.5-flash-lite`) when `GEMINI_API_KEY` is provided. |
| **Gemini Local Fallback Engine** | **REAL IMPLEMENTATION** | [geminiService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/geminiService.js#L15-L64) | Deterministic rule engine used when API key is missing, network hangs (15s abort), or quota is exceeded. |
| **Seeded Initial Patients & Baseline** | **DEMO / SEEDED DATA** | [store.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/store.js#L3-L25) | 7 synthetic historical sessions for patient Raj Kumar (Sep 01 to Sep 21) to provide an immediate presentation-ready baseline. |
| **Seeded Clinician Catalog** | **DEMO / SEEDED DATA** | [store.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/store.js#L127-L205) | 4 pre-configured doctors (Dr. Priya Nair, Dr. Vikram Rao, Dr. Sunita Menon, Dr. Arvind Patel) with realistic bios, clinic addresses, and fees. |
| **Demo Decline Simulation** | **MOCK / SIMULATED** | [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L650-L695) | Endpoint `POST /api/users/:id/demo-decline` injects 5 consecutive declining scores (`[81, 79, 75, 71, 68]`) to simulate clinical deterioration. |
| **Fallback Client Mock Data** | **DEMO / SEEDED DATA** | [demoData.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/demoData.js) | Static dashboard and trend structures rendered on the client if the backend server is completely offline. |
| **Speech Phonation Analysis** | **PARTIALLY IMPLEMENTED** | [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L699-L724) | Backend endpoint `POST /api/speech/analyze` is fully implemented. Client microphone streaming via Web Speech API is currently marked as optional. |
| **Payment Gateway Integration** | **NOT IMPLEMENTED** | [Appointment.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/Appointment.js#L34) | Consultation fee (`consultationFee: 1200`) is recorded for billing documentation; online payment processing (Stripe/Razorpay) is planned for future builds. |

---

## 2. Code Evidence of Real vs. Simulated Components

### Evidence 1: Real MediaPipe Processing ([pose.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/pose.js#L9-L47))
```javascript
// Real edge WebAssembly model loading with hardware GPU fallback
export async function createPoseLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(POSE_WASM_URL);
  try {
    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.55,
      minPosePresenceConfidence: 0.55,
      minTrackingConfidence: 0.55,
    });
  } catch (gpuError) {
    return await PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: 'CPU' },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.55,
      minPosePresenceConfidence: 0.55,
      minTrackingConfidence: 0.55,
    });
  }
}
```

### Evidence 2: Real Atomic Mutex Concurrency Lock ([appointmentService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/appointmentService.js#L292-L302))
```javascript
// Real mutex preventing simultaneous bookings of the same slot
const lockKey = `${doctor.id}:${date}:${startTime}`;
if (activeBookingLocks.has(lockKey)) {
  const error = new Error('This appointment slot is currently being processed by another patient.');
  error.statusCode = 409;
  throw error;
}
activeBookingLocks.add(lockKey);
try {
  // Insert with partial unique index
} finally {
  activeBookingLocks.delete(lockKey);
}
```

### Evidence 3: Simulation Utility ([server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L650-L675))
```javascript
// Explicit simulation tool for hackathon evaluation
app.post('/api/users/:id/demo-decline', (req, res) => {
  const userId = req.params.id;
  const template = [81, 79, 75, 71, 68];
  template.forEach((score, index) => {
    assessments.push({
      id: `decline-${Date.now()}-${index}`,
      userId,
      exerciseType: 'arm_raise',
      score,
      source: 'demo' // Explicitly tagged as synthetic data
    });
  });
  res.json({ ok: true, message: 'Decline demo loaded' });
});
```

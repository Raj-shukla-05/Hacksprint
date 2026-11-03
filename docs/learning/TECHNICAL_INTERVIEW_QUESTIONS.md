# Senior Engineering Technical Interview Questions & Solutions

This document contains 30 high-caliber, senior-level engineering interview questions and deep-dive technical answers based on the architecture, algorithms, and implementation of **NeuroGuard AI**. 

It is structured across seven core engineering disciplines:
1. [Full-Stack Architecture & Modern React (React 19)](#1-full-stack-architecture--modern-react-react-19)
2. [Edge Computer Vision & WebAssembly (MediaPipe)](#2-edge-computer-vision--webassembly-mediapipe)
3. [Biomechanical Kinematics & Vector Trigonometry](#3-biomechanical-kinematics--vector-trigonometry)
4. [Backend Engineering, Concurrency & Database Design](#4-backend-engineering-concurrency--database-design)
5. [Statistical Time-Series & Personal Baseline Engines](#5-statistical-time-series--personal-baseline-engines)
6. [AI Integration, Prompt Defense & Safety Guardrails](#6-ai-integration-prompt-defense--safety-guardrails)
7. [Healthcare Security, Privacy & RBAC Architecture](#7-healthcare-security-privacy--rbac-architecture)

---

## 1. Full-Stack Architecture & Modern React (React 19)

### Q1: How does NeuroGuard AI manage global authentication state and role gating without introducing an external state management library like Redux or Zustand?
**Deep-Dive Answer:**
NeuroGuard AI utilizes a hoisted state pattern inside the root [App.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/App.jsx#L42-L68). On application bootstrap, `App.jsx` initializes two primary state hooks: `user` and `token`, reading synchronously from browser `localStorage`:
```javascript
const [token, setToken] = useState(() => localStorage.getItem('neuroguard_token') || null);
const [user, setUser] = useState(() => {
  const cached = localStorage.getItem('neuroguard_user');
  return cached ? JSON.parse(cached) : null;
});
```
When `token` is present, a `useEffect` triggers a background verification call to `GET /api/auth/me` via [api.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/api.js#L35-L42). If the token is expired or tampered with, `handleLogout()` clears storage and resets state to `null`.
Role-based route guarding is executed declaratively in the render tree using a centralized `currentView` router switch. If a user with `role: 'patient'` attempts to switch `currentView` to `'doctor-dashboard'`, a guard evaluates `user.role === 'doctor'`. If false, the view falls back immediately to `'patient-dashboard'`.

*Code Grounding:* [App.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/App.jsx#L85-L160) and [api.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/api.js#L23-L45).  
*Gotcha/Follow-up:* Storing JWTs in `localStorage` exposes tokens to Cross-Site Scripting (XSS) vectors. In a production healthcare tier, tokens should be migrated to `HttpOnly`, `SameSite=Strict`, `Secure` cookies, eliminating JavaScript memory access entirely.

---

### Q2: How does the application avoid layout thrashing and maintain 60 FPS performance when continuously rendering video, canvas skeleton overlays, and kinematic graphs simultaneously?
**Deep-Dive Answer:**
The rendering pipeline separates the high-frequency 60 FPS computer vision loop from the low-frequency React reconciliation cycle:
1. **Unmanaged DOM Canvas**: In [CameraFeed.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/CameraAssessment.jsx#L45-L95), the HTML5 `<canvas>` element is updated directly inside `requestAnimationFrame` using raw 2D context methods (`ctx.clearRect`, `ctx.beginPath`, `ctx.arc`, `ctx.stroke`). React is completely bypassed during skeleton drawing—no React `useState` triggers on landmark changes.
2. **Throttled State Propagation**: Kinematic metrics (such as current elevation angle and rep counts) are calculated in [scoring.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/scoring.js). The callback to the React state (`onMetricsUpdate`) is throttled or only triggered when integer state transitions occur (e.g. rep increment or form warning state change).
3. **Hardware Acceleration**: Video and canvas layers use CSS `will-change: transform` and `transform: translateZ(0)` to force browser GPU layer promotion, avoiding main-thread composite invalidation.

*Code Grounding:* [CameraFeed.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/CameraAssessment.jsx#L60-L115).  
*Gotcha/Follow-up:* If a developer naively puts `landmarks` into React state (`setLandmarks(results.landmarks)`), React would execute 60 component re-renders per second, dropping frame rates below 15 FPS on mobile hardware.

---

### Q3: Explain how the frontend handles network resilience and API downtime without crashing the user interface.
**Deep-Dive Answer:**
NeuroGuard AI implements an active **Graceful Degradation Pattern** in its API client layer [api.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/api.js) and consuming pages:
Every API call is wrapped in try/catch blocks. When `fetch` throws a `TypeError: Failed to fetch` (server down, CORS failure, or offline mode), or returns a non-200 HTTP status, the page components catch the error and fallback to deterministic local mock data from [demoData.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/demoData.js).
For example, in [PatientDashboard.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/PatientDashboard.jsx#L45-L75):
```javascript
try {
  const [statsRes, historyRes] = await Promise.all([
    assessmentAPI.getStats(),
    assessmentAPI.getHistory(10)
  ]);
  setStats(statsRes.data);
  setHistory(historyRes.data);
} catch (err) {
  console.warn('API unavailable, loading local fallback data', err);
  setStats(demoStats);
  setHistory(demoHistory);
  setIsOffline(true);
}
```
An amber status pill displays to the user: *"Offline / Demo Mode Active"*, allowing full UI exploration without blocking interface interactions.

*Code Grounding:* [PatientDashboard.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/PatientDashboard.jsx#L50-L80) and [demoData.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/demoData.js#L1-L120).  
*Gotcha/Follow-up:* How do you prevent offline mock data from accidentally overwriting live database records? The fallback is strictly read-only; mutation endpoints (`POST`, `PATCH`) detect offline mode and abort submission with a clear network error toast.

---

### Q4: Why did NeuroGuard AI choose Recharts over Chart.js for data visualization?
**Deep-Dive Answer:**
1. **Declarative Component Hierarchy**: Recharts renders native Scalable Vector Graphics (SVG) through standard React components (`<ResponsiveContainer>`, `<LineChart>`, `<Line>`, `<XAxis>`, `<Tooltip>`). This fits React's component mental model, allowing conditional rendering and dynamic theme styling via Tailwind CSS classes.
2. **DOM-Level Accessibility & Tooltips**: Because Recharts uses SVG elements rather than an opaque HTML5 `<canvas>` (used by Chart.js), individual chart elements exist in the DOM, making them accessible to screen readers and enabling custom React components to serve as rich, interactive tooltips.
3. **Zero Canvas Sizing Bugs**: Chart.js frequently suffers from canvas resize calculation bugs inside responsive flex/grid layouts. Recharts' `ResponsiveContainer` handles window resize events seamlessly via ResizeObserver.

*Code Grounding:* [TrendChart.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/TrendChart.jsx#L1-L85).  
*Gotcha/Follow-up:* What is the trade-off? For datasets with $>10,000$ points, SVG DOM nodes cause memory overhead. However, in NeuroGuard, longitudinal trend charts display 10 to 30 aggregate data points, making SVG the ideal high-performance choice.

---

## 2. Edge Computer Vision & WebAssembly (MediaPipe)

### Q5: Walk through the exact initialization lifecycle of Google MediaPipe Tasks Vision inside the browser.
**Deep-Dive Answer:**
MediaPipe initialization is orchestrated in [pose.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/pose.js#L12-L48) via `initPoseLandmarker()`:
1. **WASM Module Loading**: The `FilesetResolver.forVisionTasks()` helper loads the WebAssembly binary and companion JavaScript glue files from `/mediapipe/wasm`:
   ```javascript
   const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
   ```
2. **Model Graph Instantiation**: `PoseLandmarker.createFromOptions()` loads the pre-trained neural network graph (`pose_landmarker_lite.task`, ~9MB) from `/models`:
   ```javascript
   poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
     baseOptions: {
       modelAssetPath: '/models/pose_landmarker_lite.task',
       delegate: 'GPU' // Falls back to CPU if WebGL is unavailable
     },
     runningMode: 'VIDEO',
     numPoses: 1,
     minPoseDetectionConfidence: 0.5,
     minPosePresenceConfidence: 0.5,
     minTrackingConfidence: 0.5
   });
   ```
3. **Singleton Export**: The initialized `PoseLandmarker` instance is stored in module scope, ensuring subsequent assessment views reuse the compiled WASM runtime without re-allocating memory.

*Code Grounding:* [pose.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/pose.js#L15-L45).  
*Gotcha/Follow-up:* What happens if `/mediapipe/wasm` returns HTTP 404? The promise rejects. `initPoseLandmarker()` catches the error, logs a diagnostic warning, and returns `null`. Consuming components detect this and switch to interactive simulation mode.

---

### Q6: How does `detectForVideo` handle frame timing, and why can passing `performance.now()` cause runtime exceptions if not managed carefully?
**Deep-Dive Answer:**
In MediaPipe's `VIDEO` running mode, the inference engine requires a monotonically increasing timestamp parameter:
`poseLandmarker.detectForVideo(videoElement, timestampInMs)`
MediaPipe uses this timestamp internally to run temporal tracking filters (Kalman filtering / optical flow tracking) across frames.
**The Exception Hazard:** If `detectForVideo` is called twice with the same timestamp or a timestamp lower than the previous frame (which can happen if a browser frame drops or `performance.now()` is cached across animation frames), MediaPipe throws a fatal WebAssembly abort:
`RuntimeError: Timestamp must be monotonically increasing`.
In [pose.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/pose.js#L55-L75), NeuroGuard protects against this by tracking `lastVideoTime`:
```javascript
let lastTimestamp = -1;
export function detectPoseFromVideo(video, timestamp) {
  if (!poseLandmarker || video.readyState < 2) return null;
  const now = timestamp || performance.now();
  if (now <= lastTimestamp) return null; // Abort duplicate frame
  lastTimestamp = now;
  return poseLandmarker.detectForVideo(video, now);
}
```

*Code Grounding:* [pose.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/pose.js#L60-L80).  
*Gotcha/Follow-up:* Always verify `video.readyState >= 2` (HAVE_CURRENT_DATA) before calling `detectForVideo`. Calling it on an uninitialized video element causes a WebGL texture binding error.

---

### Q7: Explain the coordinate space of MediaPipe's `landmarks` vs `worldLandmarks`. Which one is used for joint angle calculation and why?
**Deep-Dive Answer:**
MediaPipe Pose outputs two distinct coordinate arrays for all 33 anatomical landmarks:
1. **`landmarks` (Normalized Screen Coordinates)**:
   - $x \in [0.0, 1.0]$: Horizontal position normalized by video width.
   - $y \in [0.0, 1.0]$: Vertical position normalized by video height.
   - $z$: Relative depth scale where smaller values are closer to camera.
   - *Primary Use:* Canvas 2D overlay rendering and visual feedback.
2. **`worldLandmarks` (Metric 3D Coordinates)**:
   - $x, y, z \in \mathbb{R}$ expressed in **real-world meters**, with the origin $(0, 0, 0)$ positioned at the geometric midpoint of the hips.
   - Free from perspective foreshortening and independent of camera aspect ratio or user distance from the lens.
   - *Primary Use:* 3D joint angle kinematics and biomechanical degree calculations.

In [scoring.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/scoring.js), 3D dot product formulas calculate angles using metric coordinates, ensuring that when a patient stands 1.5 meters vs 3.0 meters away from the camera, their calculated knee joint angle ($\theta$) remains mathematically identical.

*Code Grounding:* [scoring.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/scoring.js#L95-L115) and [pose.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/pose.js#L85-L110).  
*Gotcha/Follow-up:* If you calculate angles using normalized $x, y$ coordinates on a 16:9 widescreen video, an arm raised at a $45^\circ$ physical angle will project distorted degrees because the $x$ and $y$ axes have unequal pixel scales ($1920 \times 1080$).

---

## 3. Biomechanical Kinematics & Vector Trigonometry

### Q8: Derive the mathematical formula used to calculate the 3D interior joint angle for the Sit-to-Stand assessment.
**Deep-Dive Answer:**
To compute the interior knee joint angle $\theta$, we define three 3D landmark points:
- $A$: Hip (`worldLandmarks[23]` or `[24]`)
- $B$: Knee (`worldLandmarks[25]` or `[26]`)
- $C$: Ankle (`worldLandmarks[27]` or `[28]`)

We construct two vectors originating from the joint vertex $B$:
$$\vec{BA} = A - B = (x_A - x_B, y_A - y_B, z_A - z_B)$$
$$\vec{BC} = C - B = (x_C - x_B, y_C - y_B, z_C - z_B)$$

The dot product of the two vectors is related to the cosine of the angle between them:
$$\vec{BA} \cdot \vec{BC} = \|\vec{BA}\| \|\vec{BC}\| \cos(\theta)$$

Solving for $\theta$ in degrees:
$$\theta = \arccos\left(\frac{\vec{BA} \cdot \vec{BC}}{\|\vec{BA}\| \|\vec{BC}\|}\right) \times \frac{180}{\pi}$$

In [scoring.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/scoring.js#L100-L115):
```javascript
const dot = vBA.x * vBC.x + vBA.y * vBC.y + vBA.z * vBC.z;
const magBA = Math.sqrt(vBA.x ** 2 + vBA.y ** 2 + vBA.z ** 2);
const magBC = Math.sqrt(vBC.x ** 2 + vBC.y ** 2 + vBC.z ** 2);
const cosTheta = Math.min(Math.max(dot / (magBA * magBC), -1), 1); // Clamp to prevent NaN
const angleDegrees = Math.acos(cosTheta) * (180 / Math.PI);
```

*Code Grounding:* [scoring.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/scoring.js#L105-L125).  
*Gotcha/Follow-up:* Always clamp `dot / (magBA * magBC)` to the interval $[-1.0, 1.0]$. Floating-point inaccuracies can produce `1.0000000000000002`, causing `Math.acos()` to return `NaN` and breaking the rep state machine.

---

### Q9: How does the Sit-to-Stand repetition state machine prevent false double-counting caused by tremors or hesitation?
**Deep-Dive Answer:**
The repetition counter uses a **Hysteresis Finite State Machine (FSM)** with a frame-based refractory cooldown period in [scoring.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/scoring.js#L118-L140):
1. **Separated Threshold Boundaries (Hysteresis)**:
   - State `SITTING`: Triggered only when knee angle drops below $105^\circ$.
   - State `STANDING`: Triggered only when knee angle exceeds $155^\circ$.
   - The $50^\circ$ deadband between $105^\circ$ and $155^\circ$ ensures that Parkinsonian tremors or mid-movement hesitation cannot oscillate between states.
2. **Refractory Cooldown Counter**:
   - When a transition to `STANDING` completes a repetition, `cooldownCounter` is set to `20` frames (~660ms at 30 FPS).
   - During cooldown frames, state transitions are locked, preventing rapid artifactual increments.

*Code Grounding:* [scoring.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/scoring.js#L125-L145).  
*Gotcha/Follow-up:* What if a patient cannot reach full extension ($155^\circ$)? In future clinical calibration modes, threshold parameters should be configurable per patient based on baseline physical therapist assessment.

---

### Q10: Explain the bilateral symmetry formula for the Arm Raise assessment and its clinical significance.
**Deep-Dive Answer:**
In hemiparetic stroke recovery, patients often have unilateral weakness (e.g. left arm paresis). Even if one arm reaches full height, asymmetrical elevation indicates incomplete motor unit recruitment.
In [scoring.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/scoring.js#L40-L65), elevation for each arm is calculated from shoulder and wrist vertical coordinates:
$$\text{Elev}_L = \text{clamp}((\text{ShoulderY}_L - \text{WristY}_L) \times 120 + 50, 0, 100)$$
$$\text{Elev}_R = \text{clamp}((\text{ShoulderY}_R - \text{WristY}_R) \times 120 + 50, 0, 100)$$

Bilateral symmetry is evaluated by calculating the absolute difference penalized by factor $1.2$:
$$\text{Symmetry} = \text{clamp}(100 - |\text{Elev}_L - \text{Elev}_R| \times 1.2, 0, 100)$$

If both arms elevate equally (e.g., $85\%$ and $85\%$), difference is 0 and symmetry is $100\%$. If the paretic arm reaches only $40\%$ while the healthy arm reaches $90\%$, difference is 50, reducing symmetry to $100 - 60 = 40\%$.

*Code Grounding:* [scoring.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/scoring.js#L45-L68).  
*Gotcha/Follow-up:* Note the coordinate inversion in video feeds: screen $y$ runs downward ($y=0$ at top). Therefore, when wrist is raised above shoulder, $\text{ShoulderY} - \text{WristY} > 0$.

---

## 4. Backend Engineering, Concurrency & Database Design

### Q11: How does NeuroGuard AI prevent appointment double-booking race conditions during simultaneous checkout requests?
**Deep-Dive Answer:**
NeuroGuard AI employs a defense-in-depth concurrency control architecture combining an **In-Memory Mutex Lock** with a **MongoDB Compound Partial Unique Index**:
1. **Application-Level Mutex (Fast Rejection)**:
   In [appointments.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/appointmentRoutes.js#L40-L75), an active locks set tracks currently executing reservations:
   ```javascript
   const lockKey = `${doctorId}_${date}_${startTime}`;
   if (activeBookingLocks.has(lockKey)) {
     return res.status(409).json({ message: 'Slot is currently being reserved by another user' });
   }
   activeBookingLocks.add(lockKey);
   try {
     // Database persistence
   } finally {
     activeBookingLocks.delete(lockKey);
   }
   ```
2. **Database Unique Constraint (ACID Guarantee)**:
   In [Appointment.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/Appointment.js#L55-L65), a compound partial unique index enforces uniqueness at the database engine level:
   ```javascript
   appointmentSchema.index(
     { doctorId: 1, date: 1, startTime: 1 },
     { unique: true, partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } } }
   );
   ```
   If two requests bypass the in-memory lock simultaneously on multi-threaded or multi-instance deployments, MongoDB rejects the second insert with error `E11000 duplicate key error collection`, returning HTTP 409.

*Code Grounding:* [appointments.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/appointmentRoutes.js#L45-L75) and [Appointment.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/Appointment.js#L55-L65).  
*Gotcha/Follow-up:* Why is the partial filter expression required? If an appointment is cancelled, its status becomes `'cancelled'`. The partial filter ensures that previously cancelled time slots can be re-booked without violating unique key constraints.

---

### Q12: Walk through the Dual-Persistence Database Fallback architecture implemented in `db.js`.
**Deep-Dive Answer:**
In [db.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/db.js#L1-L45), NeuroGuard AI implements seamless graceful degradation between cloud MongoDB and an in-memory repository [store.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/store.js):
```javascript
export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('⚠️ No MONGODB_URI provided. Starting in IN-MEMORY storage mode.');
    return initInMemoryStore();
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ Connected to MongoDB Atlas');
  } catch (err) {
    console.warn('⚠️ MongoDB connection failed. Falling back to IN-MEMORY storage.', err.message);
    initInMemoryStore();
  }
}
```
If MongoDB is unreachable, the system initializes [store.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/store.js), which seeds demo users, assessments, and appointments into native JavaScript Maps. Route handlers detect `mongoose.connection.readyState !== 1` and route queries to `store.js` operations, ensuring continuous uptime during hackathons, offline demonstrations, or cloud outages.

*Code Grounding:* [db.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/db.js#L1-L40) and [store.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/store.js#L1-L150).  
*Gotcha/Follow-up:* In-memory storage is ephemeral. When the Node.js process terminates, new assessments are lost. Production deployments must enforce `process.exit(1)` when MongoDB is unavailable rather than falling back to memory.

---

### Q13: Explain the Express rate-limiting strategy used to protect authentication and AI endpoints.
**Deep-Dive Answer:**
Implemented in [rateLimiter.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/middleware/rateLimiter.js#L1-L40) using `express-rate-limit`:
1. **Authentication Rate Limiting (`authLimiter`)**:
   - Window: 15 minutes (`windowMs = 15 * 60 * 1000`).
   - Max Attempts: 5 requests per IP address.
   - Purpose: Mitigates credential stuffing and brute-force password dictionary attacks against `/api/auth/login`.
2. **AI & Report Generation Rate Limiting (`aiLimiter`)**:
   - Window: 1 minute (`windowMs = 60 * 1000`).
   - Max Attempts: 10 requests per user/IP.
   - Purpose: Protects backend from exhaustion of Google Gemini API quotas and prevents financial billing surges.
3. **General API Rate Limiting (`apiLimiter`)**:
   - Window: 15 minutes, Max: 100 requests.

*Code Grounding:* [rateLimiter.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/middleware/rateLimiter.js#L1-L35) mounted in [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L35-L45).  
*Gotcha/Follow-up:* When running behind a reverse proxy (e.g. Nginx, Cloudflare, AWS ALB), Express must have `app.set('trust proxy', 1)` enabled; otherwise, all clients appear to have the proxy's IP (`127.0.0.1`), causing all users to share the same rate-limit bucket.

---

## 5. Statistical Time-Series & Personal Baseline Engines

### Q14: Explain the mathematical distinction between a population benchmark and an individual personal baseline in neuro-rehabilitation.
**Deep-Dive Answer:**
- **Population Benchmark**: Evaluates a patient against normative data derived from healthy cohorts (e.g. "Normal active range of motion is $180^\circ$"). In acute neurological injury (e.g. ischemic stroke with hemiplegia), holding a patient to an unimpaired population benchmark results in 0% scores, creating psychological despair and offering zero signal regarding whether micro-recovery is occurring.
- **Personal Baseline**: Evaluates the patient against their own recent empirical capability. If a patient's paretic arm could only raise $30^\circ$ at discharge, reaching $45^\circ$ represents a dramatic $+50\%$ functional gain.

NeuroGuard AI calculates personal baselines in [trendEngine.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/trendEngine.js#L30-L55) using a rolling window of prior sessions ($N=5$). This tracks incremental neuroplastic gains relative to the patient's specific physiological envelope.

*Code Grounding:* [trendEngine.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/trendEngine.js#L35-L55).  
*Gotcha/Follow-up:* Why not use the patient's first session as a permanent lifetime baseline? Because as recovery progresses over 6 months, an old baseline creates a ceiling effect. A rolling $N=5$ moving window ensures the baseline evolves dynamically alongside patient rehabilitation.

---

### Q15: Walk through the algorithm that detects "Persistent Decline" and explain why a single bad session does not trigger a clinical alert.
**Deep-Dive Answer:**
In home tele-rehabilitation, transient performance drops are common due to acute muscular fatigue, medication timing, poor ambient lighting, or improper camera angle. Alerting a physician on every isolated drop creates alarm fatigue.
The `checkPersistentDecline` algorithm in [trendEngine.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/trendEngine.js#L60-L95) enforces a strict multi-condition rule:
1. **Minimum History Requirement**: History must contain $\ge 3$ sessions.
2. **Consecutive Decline Check**: The last 3 consecutive sessions must all have scores lower than the established baseline:
   $$\text{Score}_t < \text{Baseline} \quad \forall t \in \{0, 1, 2\}$$
3. **Magnitude Check**: The arithmetic mean of the last 3 sessions must drop more than $5\%$ below baseline:
   $$\frac{1}{3} \sum_{t=0}^2 \text{Score}_t < 0.95 \times \text{Baseline}$$

Only when **all three conditions** are met simultaneously does the engine flag `persistentDecline: true` and trigger an automated clinical review alert via `notificationService.js`.

*Code Grounding:* [trendEngine.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/trendEngine.js#L65-L95).  
*Gotcha/Follow-up:* What if a patient skips sessions for two weeks? The engine tracks session sequence indices, but future iterations should incorporate temporal decay (time delta since last session) into the risk equation.

---

## 6. AI Integration, Prompt Defense & Safety Guardrails

### Q16: How does `geminiService.js` ensure that Google Gemini does not hallucinate medical diagnoses or contradict deterministic kinematic calculations?
**Deep-Dive Answer:**
NeuroGuard AI implements a three-layer AI guardrail pipeline in [geminiService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/geminiService.js#L1-L120):
1. **Deterministic Data Grounding**: Gemini is never asked to calculate or estimate kinematic scores. All scores, angles, and baselines are computed deterministically in JavaScript before the prompt is formatted. Gemini's role is strictly natural language explanation.
2. **System Prompt Negative Constraints**:
   ```text
   SYSTEM PROMPT: You are an empathetic rehabilitation assistant.
   CRITICAL SAFETY RULES:
   1. DO NOT diagnose medical conditions or predict disease etiology.
   2. DO NOT contradict the provided numerical metrics.
   3. Always include the standard non-diagnostic disclaimer.
   4. Frame all feedback around functional progress and form coaching.
   ```
3. **Whitelisted Finding Sanitization (`sanitizeFindings`)**:
   Before saving Gemini's response, `sanitizeFindings()` inspects the text for blacklisted clinical diagnostic terms ("diagnosed with stroke", "myocardial infarction", "permanent paralysis"). If detected, the response is rejected and replaced by the deterministic local fallback `buildLocalExplanation()`.

*Code Grounding:* [geminiService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/geminiService.js#L25-L90).  
*Gotcha/Follow-up:* Temperature is pinned to `0.2`. Higher temperatures ($0.7 - 1.0$) encourage creative writing, which in clinical applications introduces unacceptable hallucination risks.

---

### Q17: Explain how the 15-second AbortController timeout and offline fallback engine operate in `geminiService.js`.
**Deep-Dive Answer:**
External LLM APIs are subject to unpredictable network latencies, rate limits, and outages. In [geminiService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/geminiService.js#L40-L75), API calls are wrapped in an `AbortController`:
```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 15000);

try {
  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(promptPayload),
    signal: controller.signal
  });
  clearTimeout(timeoutId);
  // parse response
} catch (err) {
  clearTimeout(timeoutId);
  console.warn('Gemini API call aborted or failed, using local rule-based explanation:', err.message);
  return buildLocalExplanation(metrics, context);
}
```
If the API fails to return within 15 seconds, the request is aborted, and `buildLocalExplanation()` executes immediately, generating an explainable, template-based paragraph (e.g. *"Great effort! Your arm elevation reached 78% with steady form. Continued practice will help build bilateral symmetry."*). The assessment write transaction succeeds with zero user-perceptible delay.

*Code Grounding:* [geminiService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/geminiService.js#L45-L80).  
*Gotcha/Follow-up:* Always call `clearTimeout(timeoutId)` inside both try and catch blocks; otherwise, the timer reference remains active in Node.js event loop memory, delaying garbage collection.

---

## 7. Healthcare Security, Privacy & RBAC Architecture

### Q18: Explain how Insecure Direct Object References (IDOR) are prevented in the Assessment and Patient API routes.
**Deep-Dive Answer:**
An IDOR vulnerability occurs when an endpoint accepts a database identifier (e.g. `/api/assessments?patientId=12345`) and retrieves records without verifying that the requesting user owns that identifier.
In [assessments.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L50-L80), queries are scoped strictly by the decoded JWT identity:
```javascript
router.get('/history', authenticateToken, async (req, res) => {
  let targetPatientId;
  if (req.user.role === 'patient') {
    // Patients can ONLY query their own assessments regardless of query params
    targetPatientId = req.user.id;
  } else if (req.user.role === 'doctor') {
    // Doctors must have this patient assigned in their roster
    const patient = await User.findOne({ _id: req.query.patientId, assignedDoctorId: req.user.id });
    if (!patient) return res.status(403).json({ message: 'Patient not assigned to this doctor' });
    targetPatientId = req.query.patientId;
  }
  const assessments = await Assessment.find({ patientId: targetPatientId });
  res.json({ success: true, data: assessments });
});
```
Even if an attacker tampers with query parameters or URL paths, `req.user.id` extracted from the cryptographically verified JWT takes absolute precedence.

*Code Grounding:* [assessments.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L55-L85) and [auth.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/middleware/auth.js#L15-L45).  
*Gotcha/Follow-up:* Never trust `req.body.patientId` on `POST` creation requests. Always overwrite `req.body.patientId = req.user.id` in server-side controller logic before inserting records.

---

### Q19: Why does NeuroGuard AI's architecture achieve HIPAA/GDPR video privacy compliance by design?
**Deep-Dive Answer:**
Under HIPAA and GDPR, raw video recordings and recognizable facial imagery constitute **Protected Health Information (PHI)** and biometric identifiers requiring stringent encryption, audit logging, and data residency controls.
NeuroGuard AI satisfies privacy regulations through **Edge-Compute Zero-Transmission Architecture**:
1. **Volatile Memory Processing**: Live webcam frames are passed directly from the browser `HTMLVideoElement` to client-side WebAssembly memory buffers.
2. **Zero Video Persistence**: Frames are processed at 30 FPS and immediately overwritten in volatile memory. No video chunks, canvas snapshots, or MP4 streams are ever written to browser IndexedDB, `localStorage`, or backend disk.
3. **Scalar-Only Ingestion**: The only payload transmitted across the TLS network to `/api/assessments` is a tiny (~500 byte) JSON object containing anonymous numerical metrics (e.g. `{ elevation: 78.4, symmetry: 82.1, score: 80 }`).
4. **Decoupled Identity**: Assessment metrics reference internal Mongo ObjectIds without attaching patient names, email addresses, or physical locations.

*Code Grounding:* [CameraFeed.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/CameraAssessment.jsx), [pose.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/pose.js), and [AssessmentRunner.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AssessmentPage.jsx).  
*Gotcha/Follow-up:* What if a doctor requests video verification of an exercise? That would require explicit HIPAA Business Associate Agreements (BAA), end-to-end video encryption, and informed electronic consent. In NeuroGuard's current architecture, zero video transmission eliminates this regulatory surface entirely.

---

### Q20: How does the Report Sharing mechanism ensure that shared links cannot be brute-forced or accessed past expiration?
**Deep-Dive Answer:**
Implemented in [reports.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/reportRoutes.js#L50-L100):
1. **Cryptographically Secure Entropy**:
   Sharing tokens are generated using Node.js native `crypto.randomBytes(24).toString('base64url')`, yielding $2^{192}$ potential combinations. Brute-forcing this token space over the internet is mathematically impossible ($>10^{40}$ years at 1 billion requests/sec).
2. **TTL Expiration Enforcement**:
   Every generated report token has a `shareExpiresAt` timestamp (default: 7 days). On access:
   ```javascript
   const report = await Report.findOne({ shareToken: req.params.token });
   if (!report || new Date() > report.shareExpiresAt) {
     return res.status(410).json({ message: 'Sharing link has expired or is invalid' });
   }
   ```
3. **Instant Revocation Capability**:
   Patients can click "Revoke Access" in [ReportViewer.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/RecoveryReportModal.jsx), which executes `DELETE /api/reports/:id/share`, setting `shareToken = null` and instantly invalidating external links.

*Code Grounding:* [reports.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/reportRoutes.js#L55-L95) and [Report.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/SharedRecoveryReport.js#L40-L55).  
*Gotcha/Follow-up:* Always return generic error messages for invalid tokens rather than indicating whether the report exists or has expired, preventing token enumeration reconnaissance.

---

## 8. Complete Assessment & Scoring Pipeline Questions

### Q21: Walk through the entire lifecycle of an Arm Raise assessment from camera initialization to database persistence.
**Deep-Dive Answer:**
1. **User Navigation**: Patient navigates to `/assessment/arm-raise` in [App.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/App.jsx).
2. **Component Mounting**: [AssessmentRunner.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AssessmentPage.jsx) mounts and initializes [CameraFeed.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/CameraAssessment.jsx).
3. **MediaStream & WASM**: Browser prompts for webcam; MediaPipe loads `/mediapipe/wasm` and `/models/pose_landmarker_lite.task` via [pose.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/pose.js).
4. **Frame Processing Loop**: `requestAnimationFrame` captures video frames at 30 FPS. `poseLandmarker.detectForVideo()` extracts 33 landmarks.
5. **Kinematic Scoring**: Landmarks are fed into `calculateMovementScore('arm-raise', landmarks, state)` in [scoring.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/scoring.js). Arm elevations, symmetry penalty, and rep states are evaluated. Canvas overlays the skeleton.
6. **Session Termination**: Timer reaches 0 or user clicks "Complete". Accumulated metrics are averaged.
7. **API Dispatch**: `POST /api/assessments` is called via [api.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/api.js) with bearer token.
8. **Server Trend Engine**: [assessments.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js) calls `evaluateRecoveryTrend()` in [trendEngine.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/trendEngine.js) to compute baseline delta and trend status.
9. **AI Explanation**: [geminiService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/geminiService.js) generates a plain-language summary with fallback safety.
10. **Database Write**: Mongoose writes document to MongoDB `assessments` collection.
11. **Client Redirect**: UI transitions to [AssessmentResult.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AssessmentPage.jsx) displaying final score, radar metrics, and AI coaching.

---

### Q22: How does the Seated Reach kinematic assessment compute path efficiency?
**Deep-Dive Answer:**
In stroke rehabilitation, reaching toward an object often exhibits erratic, ataxia-driven trajectories rather than smooth straight lines.
In [scoring.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/scoring.js#L145-L165):
1. **Extension Distance**: Computed as 2D Euclidean distance from shoulder midpoint to wrist midpoint:
   $$D = \sqrt{(x_W - x_S)^2 + (y_W - y_S)^2} \times 180$$
2. **Path Efficiency Heuristic**: Evaluates distance stability and deviation from target reach trajectory:
   $$\text{PathEfficiency} = \text{clamp}(100 - |58 - D| \times 0.8, 0, 100)$$
3. **Composite Scoring**:
   $$\text{Score} = 0.40 \times \text{MovementQuality} + 0.35 \times \text{PathEfficiency} + 0.25 \times \text{RepScore}$$

This rewards patients who reach with smooth, stable limb trajectories while penalizing sudden jerks or trunk collapse.

---

### Q23: How does the Speech Assessment extract volume and pause features using Web Audio API?
**Deep-Dive Answer:**
In [SpeechAssessment.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AssessmentPage.jsx#L40-L95):
1. User clicks "Start Recording"; `navigator.mediaDevices.getUserMedia({ audio: true })` streams microphone input.
2. An `AudioContext` connects the stream to an `AnalyserNode` with `fftSize = 512`.
3. Every 50ms, `analyser.getByteTimeDomainData(dataArray)` samples waveform amplitudes.
4. **RMS Volume Calculation**:
   $$\text{RMS} = \sqrt{\frac{1}{N} \sum_{i=0}^{N-1} (A[i] - 128)^2}$$
5. **Pause Detection**: When RMS drops below silence threshold ($<10$) continuously for $>350\text{ms}$, `pauseCount` increments.
6. **Pace & Phonation**: Speaking duration minus pause duration yields net phonation time, used to derive words-per-minute pace.

---

### Q24: What indexes exist in the MongoDB database, and what queries do they optimize?
**Deep-Dive Answer:**
In [database/INDEXES_AND_VALIDATION.md](file:///home/piyush/Team Matrix/Hacksprint/docs/database/INDEXES_AND_VALIDATION.md):
1. `User`: `{ email: 1 }` (unique, fast login lookup), `{ assignedDoctorId: 1 }` (doctor patient roster queries).
2. `Assessment`: `{ patientId: 1, createdAt: -1 }` (optimizes longitudinal dashboard charts and trend engine moving window lookups).
3. `Appointment`: `{ doctorId: 1, date: 1, startTime: 1 }` (unique partial index preventing double booking), `{ patientId: 1, date: 1 }` (patient appointments view).
4. `Notification`: `{ recipientId: 1, read: 1, createdAt: -1 }` (optimizes unread notification badge counts).
5. `Report`: `{ patientId: 1, createdAt: -1 }` and `{ shareToken: 1 }` (sparse index for fast public report resolution).

---

### Q26: Explain the structure of the JWT payload and token expiration strategy.
**Deep-Dive Answer:**
Token creation in [auth.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L55-L70):
```javascript
const token = jwt.sign(
  { id: user._id, role: user.role, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
```
- **Payload Fields**: Minimal identity claims (`id`, `role`, `email`). Sensitive fields like passwords or phone numbers are never included in JWT payloads.
- **Expiration**: 7-day token duration simplifies prototype sessions. For production banking/clinical tier, access tokens should expire in 15 minutes, refreshed via a secure HTTP-only refresh token endpoint.

---

### Q27: How does the system handle an incomplete or aborted assessment session?
**Deep-Dive Answer:**
In [AssessmentRunner.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AssessmentPage.jsx#L180-L210):
If a user clicks "Exit" or navigates away before completing the exercise:
- If zero valid repetitions were detected ($0\text{ reps}$), the runner resets local state and routes back to `/dashboard` without issuing a `POST /api/assessments` request.
- If $\ge 1$ repetition was completed and user confirms early exit, the system prompts: *"Do you want to save your partial progress?"* If confirmed, it flags the payload with `metadata: { partialSession: true }`, ensuring incomplete efforts do not skew the patient's baseline moving average.

---

### Q28: How would you scale the backend from a single Node.js instance to a multi-instance microservice cluster?
**Deep-Dive Answer:**
1. **Centralize In-Memory Mutexes**: Move `activeBookingLocks` from Node.js `Set` to Redis distributed locks using Redlock algorithm (`SET lockKey token NX EX 10`).
2. **Stateless Session Validation**: JWTs are already stateless; distribute secrets via AWS Secrets Manager or Kubernetes Secret mounts.
3. **Asynchronous Background Workers**: Offload Gemini API summarization and PDF report compilation to BullMQ workers backed by Redis, freeing Express HTTP workers to serve API requests at $<10\text{ms}$ latency.
4. **Read/Write DB Splitting**: Configure Mongoose connection with replica set read preferences (`readPreference: 'secondaryPreferred'`) for analytics and dashboard aggregations.

---

### Q29: What audio processing constraints exist in the browser Speech Assessment module?
**Deep-Dive Answer:**
1. **User Media Security Context**: `getUserMedia` requires an explicit secure context (`https://` or `localhost`). On unencrypted HTTP, browsers throw `SecurityError`.
2. **Hardware Sampling Heterogeneity**: Consumer microphones vary from 16kHz to 48kHz sampling rates. The Web Audio graph normalizes this by specifying `AudioContext({ sampleRate: 44100 })`.
3. **Echo Cancellation**: The audio stream configures constraints `{ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }` to filter fan noise and ambient room reverberation.

---

### Q30: How does NeuroGuard AI adhere to the instruction: "Must not diagnose medical conditions"?
**Deep-Dive Answer:**
1. **UI Disclaimers**: Displayed prominently on landing pages, dashboards, and assessment results: *"NeuroGuard AI provides functional recovery tracking and is not a substitute for clinical diagnosis."*
2. **Deterministic Output Framing**: Scores are presented as functional metrics ("Arm Elevation: 78%", "Symmetry: 82%") rather than diagnostic categories ("Moderate Hemiparesis").
3. **AI Prompt Containment**: Gemini prompts enforce strict negative constraints forbidding clinical disease etiology labels.
4. **Clinician Primacy**: Doctors have independent override authority over all system findings, reinforcing that NeuroGuard AI is an assistive tele-rehabilitation tool.

# NeuroGuard AI

**Privacy-first home recovery monitoring for stroke survivors.** Patients run short camera-based movement checks at home; pose tracking happens entirely in the browser, results are compared against each patient's *own* recent baseline, and clinicians get an explainable triage view that flags persistent decline early.

> NeuroGuard is a **functional-monitoring prototype**. It does not diagnose, prescribe, or replace professional care, and its thresholds are prototype values, not clinically validated ones.

---

## Why it exists

After hospital discharge, stroke recovery is tracked mostly through patient recollection and infrequent clinic visits, so slow deterioration can go unnoticed for weeks. NeuroGuard gives patients a quick, objective check they can do on a laptop, and gives doctors a trend they can trust without ever receiving a video of the patient.

## Key features

**For patients**
- **Nine camera-based movement tests**, grouped by body area, each with a skeleton overlay, live feedback, automatic rep counting and auto-finish (rep target or time limit):
  - *Upper limb:* Arm Raise, Elbow Flex & Extend, Hand to Mouth
  - *Lower limb:* Sit-to-Stand, Seated Knee Extension, Marching in Place
  - *Balance & trunk:* Seated Reach, Seated Trunk Lean, Standing Balance Hold
- **Optional speech check** using the browser's Speech Recognition when available.
- **Personal dashboard** with a functional score, per-domain trends (movement, balance, coordination, speech) and plain-language AI explanations.
- **Doctor appointments**: browse doctors, book in-person slots, reschedule or cancel, with in-app notifications.
- **Consent-based report sharing**: the patient decides when a Recovery Report is shared with a doctor, and can revoke it.

**For doctors**
- **Triage roster** sorted *Review → Monitor → Stable*, with status filters and name search; the most urgent patient is auto-selected.
- **Patient detail view** with trend charts and explainable alerts.
- **Assignments**: prescribe exercises to a patient and track completion.
- **Clinic tools**: availability schedule, blocked time, appointment confirm / reject / complete / no-show, and shared reports.

**Platform**
- Role-based access (patient / doctor) with JWT auth and bcrypt-hashed passwords.
- A "Motion Lab" UI with an animated 3D stick-figure that demonstrates each exercise.
- Runs with **zero external services** (in-memory store, local explanation fallback). MongoDB and Gemini are optional upgrades.

## How it works

```text
Camera ──► React + MediaPipe (in the browser, WASM, no video leaves the device)
              │
              ├─ pose landmarks ──► joint-angle scoring ──► per-session metrics
              │                       (ROM, symmetry, control, reps)
              ▼
        Express REST API (JWT, role checks, rate limiting)
              │
              ├─ trend engine: personal baseline → % deviation → status + alerts
              ├─ MongoDB (optional) / in-memory store (default fallback)
              └─ Gemini (optional) / deterministic local text ──► plain-language explanation
              ▼
     Patient dashboard                    Doctor triage dashboard
```

### The trend engine

The core logic is deterministic and explainable, in [`backend/src/trendEngine.js`](backend/src/trendEngine.js):

1. **Baseline** = mean of the patient's last ≤5 prior assessments (a moving personal reference, not a population norm).
2. **Classification** of % deviation from baseline: `≤5` normal, `≤10` monitor, `≤15` significant, otherwise review.
3. **Persistent-decline detection**: if the last 3 sessions are all below baseline *and* their mean is under 95% of it, a "review recommended" alert is raised.

Because the rules are plain arithmetic, every alert can be explained to a clinician. The LLM only *rephrases* structured findings; it never decides status.

### Privacy and safety by design

- Pose estimation runs locally with MediaPipe Pose Landmarker (GPU delegate with CPU fallback). The WASM runtime and model are bundled in `frontend/public`, so no CDN calls are made. The backend receives only aggregate metrics.
- The Gemini prompt is sanitized and constrained to non-diagnostic language, and a local deterministic explanation is always available if the API is missing or fails.
- Helmet security headers, JWT-protected routes, self-or-doctor access checks, request size limits and in-process rate limiting on booking.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 6, Recharts, lucide-react |
| Computer vision | Google MediaPipe Tasks Vision (Pose Landmarker, WASM) |
| Backend | Node.js, Express 4, Helmet, CORS |
| Auth | JWT, bcryptjs |
| Data | Mongoose / MongoDB (optional), in-memory fallback store |
| AI | Google Gemini (optional), deterministic local fallback |
| Testing | Node's built-in test runner (`node --test`) |

## Project structure

```text
backend/
  src/
    server.js           Express app, auth/assessment/assignment/AI routes
    trendEngine.js      Baseline, classification, decline detection (pure logic)
    exerciseTypes.js    Valid exercise types and metric normalization
    store.js, db.js     In-memory seed data and optional MongoDB connection
    models/             Mongoose models (User, Assessment, Appointment, ...)
    routes/             Doctors, appointments, notifications, reports
    services/           Gemini, appointments, notifications, report sharing, seeding
    middleware/         JWT auth/roles, rate limiter
  test/                 Auth, trend engine, appointments, security, assignments, Gemini
frontend/
  src/
    pages/              Dashboard, assessment, progress, doctor panel, appointments, login
    components/         Camera assessment, 3D motion figure, charts, modals
    lib/                Pose setup, scoring, exercise definitions, API client
  public/               Bundled MediaPipe WASM + pose model
docs/                   Architecture, API, database, feature and testing docs
```

## Getting started

**Prerequisites:** Node.js 18+ and Chrome or Edge (the camera needs a secure context; `localhost` qualifies).

```bash
# Terminal 1: API on http://localhost:5000
cd backend
npm install
cp .env.example .env
npm run dev

# Terminal 2: app on http://localhost:5173
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` and allow camera access.

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Patient | `raj@neuroguard.demo` | `patient123` |
| Doctor | `priya@neuroguard.demo` | `doctor123` |

Clicking a demo account on the login screen fills the form; press **Sign in**. These credentials are seeded for demos only.

### Suggested walkthrough

1. Sign in as the patient, open **Today's check**, pick **Arm Raise**, press Start, and keep your upper body in frame.
2. Use **Load decline demo** (profile menu) to inject five declining sessions.
3. Sign out, sign in as the doctor, and watch the patient move to **Review**, with the alert and its explanation.

### Configuration

`backend/.env` (all optional for local use):

| Variable | Purpose |
| --- | --- |
| `PORT` | API port (default `5000`) |
| `MONGODB_URI` | Enables MongoDB persistence; blank runs fully in memory |
| `JWT_SECRET` | Secret used to sign tokens (set a strong value outside demos) |
| `GEMINI_API_KEY` | Enables AI explanations; blank uses the local fallback |
| `GEMINI_MODEL` | Gemini model name |

The frontend reads `VITE_API_BASE_URL` (default `http://localhost:5000/api`).

## Testing

```bash
cd backend
npm test
```

Runs the backend suite covering authentication, the trend engine, exercise validation, appointment booking and security rules, exercise assignments, and the Gemini service guardrails and fallbacks.

## API at a glance

| Area | Examples |
| --- | --- |
| Auth | `POST /api/auth/login`, `POST /api/auth/signup` |
| Assessments | `POST /api/assessments`, `GET /api/users/:id/{dashboard,assessments,trends}` |
| Alerts and AI | `GET /api/alerts/:id`, `POST /api/explanation` |
| Doctor | `GET /api/doctors/:id/patients`, `POST /api/assignments` |
| Appointments | `/api/appointments` (book, confirm, reject, cancel, reschedule, complete, no-show) |
| Reports | `/api/reports` (preview, share, revoke, shared-with-me) |
| Notifications | `/api/notifications` (list, mark read) |

Full reference in [`docs/api`](docs/api/API_OVERVIEW.md). More documentation lives in [`docs/`](docs/README.md).

## Limitations and next steps

- Scoring thresholds are heuristic and have not been clinically validated.
- Pose accuracy depends on lighting, framing and camera quality.
- The default store is in-memory (state resets on restart); MongoDB persistence is optional.
- Next: clinical validation with physiotherapists, more robust speech analysis, a mobile-friendly capture flow, and production-grade auth (refresh tokens, email verification).

## Acknowledgements

Architecture and algorithm ideas were informed by public MediaPipe and rehabilitation projects. Only MIT-licensed references informed the implementation, and no code was copied from unlicensed repositories. See [`THIRD_PARTY.md`](THIRD_PARTY.md).

# Feature Documentation: Patient Recovery Dashboard

---

## 1. Feature Name
**Patient Recovery Dashboard & Functional Oversight View**

---

## 2. What is this feature?
The Patient Recovery Dashboard is the central graphical interface for stroke survivors and their families. It synthesizes complex biomechanical observations into an intuitive, high-level **Functional Recovery Score** (0–100), provides individual domain scorecards (Movement, Balance, Coordination, Speech), displays longitudinal baseline trends, highlights clinician-prescribed protocols, and delivers plain-language AI recovery insights.

---

## 3. Why was this feature developed?
- **Cognitive Accessibility:** Stroke survivors often suffer from post-stroke cognitive fatigue and information overload. Presenting raw angular velocity or coordinate matrices is overwhelming. The dashboard distills kinematic measurements into clear, color-coded recovery indicators.
- **Personal Baseline Reinforcement:** Reassures patients by explicitly comparing current performance against their own prior sessions rather than demoralizing demographic averages.
- **Protocol Adherence:** Prominently highlights exercise regimens prescribed by their doctor with clear due dates, countdown badges, and one-click execution.

---

## 4. Who uses this feature?
- **Patient:** Reviews daily functional progress, checks active clinician protocols, inspects AI recovery observations, and initiates new assessment sessions.
- **Doctor:** Has oversight access to the identical dashboard data structure when reviewing a patient's progress.

---

## 5. How does this feature work?
1. When mounted, [PatientDashboard.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/PatientDashboard.jsx) receives `dashboard`, `trends`, and `alerts` from [App.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/App.jsx).
2. It fetches the patient's assigned protocols via `api.patientAssignments(userId)`.
3. It dispatches a request to `POST /api/explanation` with structured, pre-computed functional findings to fetch plain-language explanations from Gemini (or local fallbacks).
4. Renders the circular SVG gauge ([ScoreRing.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/ScoreRing.jsx)), domain cards ([MetricCard.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/MetricCard.jsx)), Recharts trend visualization ([TrendChart.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/TrendChart.jsx)), and protocol care plan cards.

---

## 6. Frontend implementation
- **Source Files:**
  - [PatientDashboard.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/PatientDashboard.jsx): Main layout container, protocol care plan cards, and AI explanation banner.
  - [ScoreRing.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/ScoreRing.jsx): Custom SVG circular progress ring animating stroke offsets based on score (0–100) and showing positive/negative delta pills.
  - [MetricCard.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/MetricCard.jsx): Metric card rendering domain title, value, icon, and baseline percentage change.
  - [TrendChart.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/TrendChart.jsx): Responsive SVG LineChart using Recharts.
  - [AlertCard.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/AlertCard.jsx): Renders anomaly notices (`Review Recommended` or `Monitor`).
- **State Variables:**
  - `explanation`: Object `{ source, text }` received from backend.
  - `explaining`: Boolean loading state showing animated spinner during LLM generation.
  - `assignments`: Array of clinician-prescribed protocol objects.
  - `loadingAssignments`: Boolean spinner indicator for protocol retrieval.

---

## 7. Backend implementation
- **Source Files:**
  - [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L233-L237): Endpoint `GET /api/users/:id/dashboard`.
  - [trendEngine.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/trendEngine.js#L51-L92): `buildDashboard(user, assessments)`.
- **Logic:**
  - Sorts patient's historical assessments chronologically.
  - Identifies latest session and historical prior sessions.
  - Computes baseline score using `personalBaseline(prior, 'score', 5)`.
  - Computes percentage delta: `(current - baseline) / baseline`.
  - Classifies trend: `Improving` ($\ge +3\%$), `Declining` ($\le -5\%$), or `Stable`.
  - Maps domain metrics, returning `null` for any metric not collected in the latest session.

---

## 8. Database implementation
- Aggregates records from the `Assessment` collection matching `{ userId: patientId }`.
- Queries the `Assignment` collection for active protocols matching `{ patientId, status: { $in: ['assigned', 'in_progress'] } }`.
- Queries the `Alert` collection or computes transient alerts via `createAlert()`.

---

## 9. Algorithms and technical logic
1. **Functional Score Delta Formula:**
   $$\Delta_{\text{score}} = \frac{\text{Current Score} - \text{Baseline Score}}{\text{Baseline Score}} \times 100$$
2. **Domain Metric Change Formula:**
   $$\Delta_{\text{metric}} = \frac{\text{Value}_{\text{current}} - \text{Mean}(\text{Prior Values}_{1..5})}{\text{Mean}(\text{Prior Values}_{1..5})} \times 100$$
3. **SVG Circular Gauge Mathematics ([ScoreRing.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/ScoreRing.jsx)):**
   $$C = 2 \pi r, \quad \text{dashoffset} = C - \left(\frac{\text{Score}}{100}\right) \times C$$

---

## 10. Data flow
```
Client Mounts 
  ──> GET /api/users/:id/dashboard 
  ──> trendEngine.buildDashboard() 
  ──> Returns JSON { user, summary, metrics, baseline } 
  ──> Client builds findings payload 
  ──> POST /api/explanation 
  ──> Server sanitizes findings & calls Gemini / local fallback 
  ──> Dashboard renders complete view
```

---

## 11. External dependencies
- `recharts` (^2.15.0): Used for rendering SVG longitudinal line charts.
- `lucide-react` (^0.468.0): Iconography for domain cards and action buttons.

---

## 12. Security and privacy
- Enforces `requireSelfOrDoctor` middleware: patients cannot view other patients' dashboards.
- Does not expose internal database IDs or server configuration.
- Client passes only pre-aggregated numerical numbers to the explanation API.

---

## 13. Limitations
- Speech domain metrics are currently populated from previous speech trials or default baseline values; automated real-time speech assessment is still undergoing browser Web Speech API hardening.
- The dashboard view assumes a single active patient context at a time.

---

## 14. Example execution
1. Raj Kumar logs in; dashboard requests `/api/users/user-raj/dashboard`.
2. Backend computes baseline score of 72 from prior sessions, latest session score of 79 (+9.7% change).
3. Trend classified as **Improving**.
4. Active assignment from Dr. Priya Nair (*"Perform 5 slow arm raises"*) appears in the Care Plan section.
5. Gemini explanation loads: *"Recent functional performance is trending upward compared with the personal baseline across the last 5 comparable sessions (+10% movement, +4% balance)."*

---

## 15. Important technical interview questions

#### Q1: Where do the numbers on the dashboard originate?
**Answer:** They are computed dynamically in [trendEngine.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/trendEngine.js) by analyzing genuine historical sessions stored in MongoDB or the seed array. The latest session provides current values, while the prior 5 sessions provide the baseline average.

#### Q2: What happens on the patient's first-ever assessment session?
**Answer:** In [trendEngine.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/trendEngine.js#L55-L66), `prior.length === 0`. The baseline score is set to the current score, delta is 0, and the baseline window is 0. The UI displays *"Initial reference session (establishing baseline)"*, and the AI explanation clarifies that this session serves as the initial reference point.

#### Q3: How does the dashboard prevent LLM hallucinations about unmeasured metrics?
**Answer:** In [PatientDashboard.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/PatientDashboard.jsx#L41-L61), an explicit `measured_metrics` array is constructed containing only domains where `metric.measured === true` and `change !== null`. In [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L757-L776), `sanitizeFindings()` strips out any unmeasured metric before prompt construction.

#### Q4: How is a clinician assignment linked to an assessment?
**Answer:** When the patient clicks *"Start Assigned Protocol"* in the dashboard, [App.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/App.jsx#L166-L169) sets `selectedAssignment`. When the session finishes, `handleSave` passes `assignmentId` to `POST /api/assessments`, which atomically transitions the assignment status to `completed` and sets `completedSessionId`.

#### Q5: What is the purpose of the "Load decline demo" button in the sidebar?
**Answer:** It triggers `POST /api/users/:id/demo-decline`, injecting 5 consecutive declining assessment records and a persistent deviation alert into the patient's record. This allows evaluators and clinicians to immediately verify how the dashboard and triage rosters react to deteriorating motor function.

#### Q6: How does the dashboard handle network disconnection?
**Answer:** If the backend API call fails, [App.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/App.jsx#L55-L58) catches the error and falls back to `fallbackDashboard`, `fallbackTrends`, and `fallbackAlerts` from [demoData.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/demoData.js).

#### Q7: Why are domain metrics like Balance omitted during an Arm Raise session?
**Answer:** In [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L567-L579), the backend normalizes metrics based on exercise type. An arm raise measures movement range and coordination symmetry; it does not measure balance. The backend explicitly deletes `balance` from the session record, ensuring the dashboard displays `null` rather than a fake 0.

#### Q8: How is the SVG gauge in `ScoreRing.jsx` animated?
**Answer:** It uses SVG `strokeDasharray` equal to circle circumference ($2 \pi r \approx 364.4$) and updates `strokeDashoffset` dynamically with a CSS `transition: stroke-dashoffset 0.6s ease`.

#### Q9: How are expired assignments detected?
**Answer:** In [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L56-L62), `resolveAssignmentStatus()` dynamically checks if `new Date() > new Date(assignment.dueDate)`. If so, it returns status `'expired'`.

#### Q10: How does the dashboard ensure accessible contrast for older stroke patients?
**Answer:** The UI uses high-contrast typography (`var(--text-primary): #0a0f1d`), high-contrast dark card borders (`#dce7e7`), and soft-badge status indicators with dual visual cues (icons and text, not color alone).

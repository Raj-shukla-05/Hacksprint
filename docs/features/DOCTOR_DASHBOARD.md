# Feature Documentation: Doctor Dashboard, Clinical Triage & Protocol Management

---

## 1. Feature Name
**Doctor Clinical Triage Dashboard, Patient Roster & Protocol Prescription Management**

---

## 2. What is this feature?
The Doctor Dashboard is a clinical oversight interface ([DoctorPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/DoctorPage.jsx) and [DoctorProgressPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/DoctorProgressPage.jsx)) designed for attending neurologists, physiatrists, and physical therapists. It provides an automated triage patient roster sorted by clinical priority, detailed patient kinematic histories, a protocol prescription engine for assigning structured home exercises, and a clinical review module for attaching feedback notes to completed sessions.

---

## 3. Why was this feature developed?
- **High Outpatient Patient Volume:** Clinicians often manage dozens of recovering stroke patients concurrently. An automated triage system that prioritizes patients exhibiting persistent functional decline ensures urgent cases receive prompt attention.
- **Protocol Adherence & Oversight:** Enables clinicians to prescribe tailored exercise parameters (e.g. 5 reps of Arm Raise due in 7 days) and review whether the patient completed the session with proper form.
- **Objective Clinical Documentation:** Replaces patient recollection with quantitative graphs for in-person consultations.

---

## 4. Who uses this feature?
- **Doctor:** Manages authorized patient roster, prescribes exercises, inspects kinematic trends, and records clinical feedback notes.
- **Patients:** Cannot access this portal; protected by `requireRole('doctor')` middleware.

---

## 5. How does this feature work?
1. The doctor signs in and is routed to the `'doctor'` view in [App.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/App.jsx#L18).
2. [DoctorPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/DoctorPage.jsx) calls `GET /api/doctors/:id/patients`.
3. The server filters patients assigned to this doctor and calculates active assignments and total sessions.
4. The client sorts patients using `STATUS_ORDER`: `Review recommended` $\rightarrow$ `Monitor` $\rightarrow$ `Stable`.
5. The doctor clicks *"View"* on a patient, opening the `PatientDetail` view.
6. The doctor can click *"Prescribe Functional Protocol"*, opening a form to select the exercise type (`arm_raise`, `sit_to_stand`, `seated_reach`), enter custom instructions, set target repetitions (1–30), and pick a due date.
7. When submitted, the backend creates an `Assignment` record.
8. When a patient completes the exercise, it transitions to `'completed'`. The doctor can review the recorded score, write feedback notes, and transition it to `'reviewed'`.

---

## 6. Frontend implementation
- **Source Files:**
  - [DoctorPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/DoctorPage.jsx): Main triage roster, search filter toolbar, summary KPI tiles, patient detail view, protocol creation form, and review form.
  - [DoctorProgressPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/DoctorProgressPage.jsx): Longitudinal multi-domain review page with patient selector dropdown, Recharts 4-domain line chart, and historical session table.
- **State Management:**
  - `patients`: Array of patient roster objects.
  - `selectedId`: ID of currently selected patient in detail view.
  - `filter`: Active status filter (`'all'`, `'review'`, `'monitor'`, `'stable'`).
  - `query`: Real-time text search query for patient names.
  - `showAssignForm`: Toggle for protocol creation drawer.

---

## 7. Backend implementation
- **Source Files:**
  - [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L264-L520):
    - `GET /api/doctors/:id/patients`: Returns authorized patient roster.
    - `POST /api/assignments`: Creates an exercise protocol for a patient.
    - `GET /api/patients/:patientId/assignments`: Retrieves assignments.
    - `PATCH /api/assignments/:id/status`: Transitions assignment lifecycle (`in_progress`, `reviewed`, `cancelled`).
    - `GET /api/doctors/:id/assignments`: Lists all assignments created by the doctor.

---

## 8. Database implementation
- Uses [Assignment.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/Assignment.js), [User.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/User.js), and [Assessment.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/Assessment.js).
- When an assignment is created:
  ```javascript
  const assignment = {
    id: `asgn-${Date.now()}-${hash}`,
    doctorId, patientId, exerciseType, instructions, targetReps,
    startDate, dueDate, status: 'assigned', doctorNotes: ''
  };
  ```

---

## 9. Algorithms and technical logic
1. **Automated Triage Sorting:**
   $$\text{Rank}(p) = \text{STATUS\_ORDER}[p.\text{status}] \times 1000 + p.\text{name.localeCompare}()$$
   *Where `review = 0`, `monitor = 1`, `stable = 2`.*
2. **Assignment Status Dynamic Expiration ([server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L56-L62)):**
   $$\text{Status}(A) = \begin{cases} \text{'expired'} & \text{if } A.\text{status} \in \{\text{'assigned'}, \text{'in\_progress'}\} \land \text{Now} > A.\text{dueDate} \\ A.\text{status} & \text{otherwise} \end{cases}$$

---

## 10. Data flow
```
Doctor signs in 
  ──> GET /api/doctors/:id/patients (Bearer JWT) 
  ──> Server checks doctor authorization 
  ──> Patients sorted by priority (Review -> Monitor -> Stable) 
  ──> Doctor creates protocol ──> POST /api/assignments 
  ──> Patient executes assessment ──> Assignment status = 'completed' 
  ──> Doctor inspects session & submits review notes 
  ──> PATCH /api/assignments/:id/status { status: 'reviewed', doctorNotes } 
  ──> Reflected on Patient Dashboard
```

---

## 11. External dependencies
- `recharts` for multi-domain progress graphs.
- `lucide-react` for status indicators.

---

## 12. Security and privacy
- Enforces `requireRole('doctor')` on all clinical endpoints.
- Verifies that doctors can only view their own patient roster: `if (req.user.userId !== req.params.id) return res.status(403);`.
- Doctors cannot prescribe assignments to patients assigned to another doctor.

---

## 13. Limitations
- Does not yet support multi-clinician collaborative notes (e.g., physical therapist and neurologist commenting on the same session).
- Does not export directly to hospital electronic health record (EHR) systems via HL7/FHIR (planned for Phase 3).

---

## 14. Example execution
1. Dr. Priya Nair logs in and sees Mohan Singh flagged as **Review recommended** (-13% drop).
2. She clicks *"View"* on Mohan, reviews his declining Arm Raise trend, and prescribes a modified exercise:
   - Exercise: `seated_reach`
   - Instructions: *"Perform 5 seated reaches with back supported. Stop if shoulder discomfort occurs."*
   - Due Date: 7 days from today.
3. Assignment is created with status `'assigned'`.
4. Mohan sees the new protocol on his dashboard.

---

## 15. Important technical interview questions

#### Q1: What prevents Doctor A from viewing Doctor B's patient roster?
**Answer:** In [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L265-L267), the endpoint verifies `if (req.user.userId !== req.params.id) return res.status(403).json({ message: "Forbidden: you cannot view another doctor's patient roster" });`.

#### Q2: Can a patient arbitrarily mark an assignment as "completed"?
**Answer:** No. In [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L477-L480), `PATCH /api/assignments/:id/status` explicitly rejects any direct status patch to `'completed'`: *"Assignments are completed through recording a valid assessment session"*. Only `POST /api/assessments` with valid tracking frames can mark an assignment complete.

#### Q3: What state transitions are permitted for an assignment?
**Answer:**
- `assigned` $\rightarrow$ `in_progress` (by patient or doctor)
- `assigned` / `in_progress` $\rightarrow$ `cancelled` (only by the assigning doctor)
- `assigned` / `in_progress` $\rightarrow$ `completed` (via `POST /api/assessments`)
- `completed` $\rightarrow$ `reviewed` (only by the assigning doctor with notes)
- Any other transition is rejected with HTTP 400 Bad Request.

#### Q4: What happens if an assignment passes its due date without completion?
**Answer:** In [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L56-L62), `resolveAssignmentStatus()` dynamically checks `new Date() > new Date(assignment.dueDate)`. If past due and still in `assigned` or `in_progress`, it is resolved and returned as `'expired'`.

#### Q5: Can a doctor review an assignment created by another doctor?
**Answer:** No. In [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L467-L469), the backend checks `if (req.user.role !== 'doctor' || assignment.doctorId !== req.user.userId) return res.status(403);`.

#### Q6: How are repetition targets validated during protocol creation?
**Answer:** Target repetitions must be an integer between 1 and 30: `if (isNaN(reps) || reps < 1 || reps > 30) return res.status(400);`.

#### Q7: How does `DoctorProgressPage.jsx` render domain breakdown curves?
**Answer:** It uses Recharts `LineChart` with 4 `<Line>` components mapped to `movement` (`#0f766e`), `balance` (`#2563eb`), `coordination` (`#d97706`), and `speech` (`#7c3aed`), allowing the doctor to isolate which functional domain is lagging behind.

#### Q8: What information is passed to the doctor during completed session review?
**Answer:** The completed assignment object includes `completedSession`, containing the exact functional score, duration, tracking quality ratio, and joint metrics (`rangeOfMotion`, `symmetry`, `movementQuality`) recorded by MediaPipe.

#### Q9: How are new patients assigned to doctors in the prototype?
**Answer:** When patients sign up or in the demo seed data, patients default to `doctorId: 'doctor-priya'`. When another doctor creates an assignment for an unassigned patient, [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L329-L334) links that patient to the prescribing doctor.

#### Q10: How does the doctor dashboard distinguish between real assessments and demo decliners?
**Answer:** Each assessment record includes a `source` tag: `'live'` for real webcam sessions, `'demo'` for simulation injected sessions, and `'seed'` for initial baseline sessions.

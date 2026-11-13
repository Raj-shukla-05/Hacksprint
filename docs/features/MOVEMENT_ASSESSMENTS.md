# Feature Documentation: Movement Assessments (nine camera-based tests)

---

## 1. Feature Name
**Objective Kinematic Movement Assessment Protocols (nine tests across upper limb, lower limb, and balance & trunk)**

---

## 2. What is this feature?
NeuroGuard AI implements nine clinically inspired functional movement tests tailored for stroke survivors. Thresholds are prototype values and are not clinically validated.

| Area | Test | What it measures |
| :--- | :--- | :--- |
| Upper limb | **Arm Raise** | Bilateral shoulder range of motion and symmetry |
| Upper limb | **Elbow Flex & Extend** | Elbow range of motion and smoothness |
| Upper limb | **Hand to Mouth** | Eating/drinking movement: reach accuracy, range, smoothness |
| Lower limb | **Sit-to-Stand** | Leg strength and postural stability |
| Lower limb | **Seated Knee Extension** | Isolated knee range and control (sit side-on to the camera) |
| Lower limb | **Marching in Place** | Step height, left/right alternation and rhythm |
| Balance & trunk | **Seated Reach** | Forward reach and path efficiency |
| Balance & trunk | **Seated Trunk Lean** | Side-to-side trunk control, lean range and symmetry |
| Balance & trunk | **Standing Balance Hold** | Sway while standing still for 30 seconds (hold test, not reps) |

All tests are described in one registry, `frontend/src/lib/exercises.js` (title, instructions, framing, scoring function, rep counter, live metrics). Scoring maths for the six newer tests is in `frontend/src/lib/movementTests.js`. The backend list and the mapping into the shared Movement / Balance / Coordination metrics is in `backend/src/exerciseTypes.js`.

Each assessment runs in the browser, tracking key anatomical landmarks, evaluating joint mechanics, counting repetitions via finite-state machines, and calculating composite functional recovery scores (0–100).

---

## 3. Why was this feature developed?
- **Stroke Impairment Mapping:** Stroke frequently results in unilateral hemiparesis (arm weakness), impaired trunk control, and gait instability. These three exercises map directly to fundamental activities of daily living (reaching for objects, standing up from a chair, grooming).
- **Objective Quantification:** Replaces subjective visual estimation with precise joint angles, symmetry percentages, and completion rates.
- **Safety in Home Settings:** Designed so exercises can be performed seated or using a sturdy chair for support, minimizing fall risk during unsupervised home recovery.

---

## 4. Who uses this feature?
- **Patient:** Performs the exercises as self-directed recovery checks or in response to clinician prescriptions.
- **Doctor:** Prescribes specific protocols with custom instructions and repetition targets, then reviews the recorded session metrics and kinematic graphs.

---

## 5. How does this feature work?
1. The patient selects an exercise on [AssessmentPage.jsx](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/pages/AssessmentPage.jsx) (or it auto-selects from an assigned clinician protocol).
2. [CameraAssessment.jsx](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/components/CameraAssessment.jsx) initializes the camera and MediaPipe tracking loop.
3. For each video frame, landmark coordinates are evaluated by the specific frame calculator: the test's frame function (for example `armRaiseFrame()` or `balanceFrame()`).
4. Valid frames are pushed to a sliding window buffer (`framesRef.current`).
5. Real-time feedback displays current repetition counts and movement levels.
6. The test ends on its own: after a 3-second get-ready countdown, it finishes when the rep target is reached or the time limit passes (hold tests end on time only). The registry's `build` function for that test processes the buffered frame history, computes composite scores and metrics, and returns the final assessment object.
7. The client posts the results to `POST /api/assessments` for persistent baseline tracking.

---

## 6. Frontend implementation
- **Source Files:**
  - [scoring.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/lib/scoring.js): Contains frame processors (`armRaiseFrame`, `sitToStandFrame`, `seatedReachFrame`) and session aggregators (`buildArmRaiseSession`, `buildSitToStandSession`, `buildSeatedReachSession`).
  - [CameraAssessment.jsx](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/components/CameraAssessment.jsx): Renders live exercise target cards, repetition counters, and phase indicators.
  - [AssessmentPage.jsx](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/pages/AssessmentPage.jsx): Wraps the assessment in clinician prescription context and performs client-side quality validation before saving.

---

## 7. Backend implementation
- **Source Files:**
  - [server.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/server.js#L524-L646): `POST /api/assessments`.
- **Backend Metric Normalization:**
  - When saving an `arm_raise` session, the server extracts `movement` (range of motion) and `coordination` (symmetry). Balance is deleted because an arm raise does not measure balance.
  - When saving `sit_to_stand`, the server extracts `movement` (movement quality) and `balance` (stability), and removes speech and coordination.
  - When saving `seated_reach`, the server extracts `movement` and `coordination` (path efficiency), and deletes balance and speech.
- **Assignment Completion:** If `assignmentId` is provided, the backend links the session, updates assignment status to `'completed'`, and records `completedSessionId`.

---

## 8. Database implementation
- Stored in the `Assessment` collection in MongoDB ([Assessment.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/models/Assessment.js)) with fields: `userId`, `assignmentId`, `exerciseType`, `score`, `duration`, `metrics`, and `trackingQuality`.

---

## 9. Algorithms and Mathematical Formulas

### Protocol 1: Arm Raise
- **Landmarks Tracked:** Left/Right Shoulder (11, 12), Left/Right Elbow (13, 14), Left/Right Wrist (15, 16).
- **Per-Frame Metrics:**
  - Left Elevation: $\text{Elev}_L = \text{clamp}((\text{Shoulder}_y - \text{Wrist}_y) \times 120 + 50, 0, 100)$
  - Right Elevation: $\text{Elev}_R = \text{clamp}((\text{Shoulder}_y - \text{Wrist}_y) \times 120 + 50, 0, 100)$
  - Average Elevation: $\text{Elev}_{\text{avg}} = \frac{\text{Elev}_L + \text{Elev}_R}{2}$
  - Symmetry: $\text{Sym} = \text{clamp}(100 - |\text{Elev}_L - \text{Elev}_R| \times 1.2, 0, 100)$
  - Extension: $\text{Ext} = \text{clamp}\left(100 - \left|180 - \frac{\text{Angle}_L + \text{Angle}_R}{2}\right| \times 1.15, 0, 100\right)$
- **Repetition State Machine:**
  - State starts in `'down'`.
  - Transitions to `'up'` when $\text{Elev}_{\text{avg}} \ge 78\%$ and elapsed time since last peak $> 700\text{ms}$.
  - Transitions to `'down'` when $\text{Elev}_{\text{avg}} \le 55\%$, incrementing repetition count ($R = R + 1$).
- **Final Composite Scoring Formula:**
  $$\text{ROM} = \frac{(\max(L) - \min(L)) + (\max(R) - \min(R))}{2}$$
  $$\text{RangeScore} = \text{clamp}\left(\frac{\text{ROM}}{65} \times 100, 0, 100\right), \quad \text{RepScore} = \text{clamp}\left(\frac{R}{5} \times 100, 0, 100\right)$$
  $$\mathbf{Score}_{\text{ArmRaise}} = 0.38 \times \text{RangeScore} + 0.27 \times \text{Mean}(\text{Sym}) + 0.20 \times \text{Mean}(\text{Ext}) + 0.15 \times \text{RepScore}$$

---

### Protocol 2: Sit-to-Stand
- **Landmarks Tracked:** Left/Right Hip (23, 24), Left/Right Knee (25, 26), Left/Right Ankle (27, 28).
- **Per-Frame Metrics:**
  - Knee Angle: $\theta_{\text{knee}} = \frac{\text{angle}(\text{Hip}_L, \text{Knee}_L, \text{Ankle}_L) + \text{angle}(\text{Hip}_R, \text{Knee}_R, \text{Ankle}_R)}{2}$
  - Trunk Height: $H_{\text{trunk}} = 1 - \text{midpoint}(\text{Hip}_L, \text{Hip}_R).y$
- **Repetition State Machine:**
  - State starts in `'standing'`.
  - Transitions to `'sit'` when $\theta_{\text{knee}} < 105^\circ$.
  - Transitions to `'standing'` when $\theta_{\text{knee}} > 155^\circ$ and frame cooldown is 0, incrementing reps and setting cooldown to 20 frames.
- **Final Composite Scoring Formula:**
  $$\text{Range} = \max(\theta_{\text{knee}}) - \min(\theta_{\text{knee}})$$
  $$\text{Stability} = \text{clamp}(100 - (\text{Range} - 80) \times 0.35, 0, 100)$$
  $$\text{RangeScore} = \text{clamp}\left(\frac{\text{Range}}{70} \times 100, 0, 100\right), \quad \text{RepScore} = \text{clamp}\left(\frac{R}{5} \times 100, 0, 100\right)$$
  $$\mathbf{Score}_{\text{SitToStand}} = 0.45 \times \text{RepScore} + 0.35 \times \text{RangeScore} + 0.20 \times \text{Stability}$$

---

### Protocol 3: Seated Reach
- **Landmarks Tracked:** Left/Right Shoulder (11, 12), Left/Right Wrist (15, 16).
- **Per-Frame Metrics:**
  - Midpoint Shoulder: $S_{\text{mid}} = \text{midpoint}(\text{Shoulder}_L, \text{Shoulder}_R)$
  - Midpoint Wrist: $W_{\text{mid}} = \text{midpoint}(\text{Wrist}_L, \text{Wrist}_R)$
  - Reach Euclidean Magnitude: $\text{Reach} = \text{clamp}(\|W_{\text{mid}} - S_{\text{mid}}\| \times 180, 0, 100)$
- **Repetition State Machine:**
  - State starts in `'start'`.
  - Transitions to `'reach'` when $\text{Reach} > 42$.
  - Transitions to `'start'` when $\text{Reach} < 25$, incrementing repetition count ($R = R + 1$).
- **Final Composite Scoring Formula:**
  $$\text{MovementQuality} = \text{clamp}(\text{Mean}(\text{Reach}) \times 1.15, 0, 100)$$
  $$\text{RepScore} = \text{clamp}\left(\frac{R}{5} \times 100, 0, 100\right)$$
  $$\text{PathEfficiency} = \text{clamp}(100 - |58 - \text{Mean}(\text{Reach})| \times 0.8, 0, 100)$$
  $$\mathbf{Score}_{\text{SeatedReach}} = 0.40 \times \text{MovementQuality} + 0.35 \times \text{PathEfficiency} + 0.25 \times \text{RepScore}$$

---

## 10. Data flow
```
Webcam Frame 
  ──> MediaPipe Landmarker 
  ──> 33 Pose Landmarks 
  ──> Exercise Frame Logic (armRaise / sitToStand / seatedReach) 
  ──> Buffer framesRef.current 
  ──> On Finish: Session Aggregator 
  ──> Build Score & Derived Metrics 
  ──> Client-side Validation (score > 0, duration >= 3s) 
  ──> POST /api/assessments 
  ──> Backend Normalization 
  ──> Store in MongoDB Assessment collection
```

---

## 11. External dependencies
- `@mediapipe/tasks-vision` (^0.10.22) for landmark generation.

---

## 12. Security and privacy
- Only scalar numerical outputs (scores, repetitions, angles) leave the client.
- Video frames are processed in-memory and discarded every animation frame.

---

## 13. Limitations
- Single 2D monocular webcams lack true depth sensing; the $z$-coordinate is inferred by MediaPipe's internal neural network and can have jitter in extreme positions.
- Rapid or erratic jerky movements can cause missed repetition counts if state thresholds are skipped between frames.

---

## 14. Example execution
**Arm Raise Session Execution:**
1. Patient stands in front of webcam and raises both arms 5 times over 32 seconds.
2. MediaPipe tracks 420 frames with an average elevation of 84%, symmetry of 89%, and extension of 91%.
3. Aggregator calculates composite score:
   $$\text{Score} = 0.38(95) + 0.27(89) + 0.20(91) + 0.15(100) = 36.1 + 24.03 + 18.2 + 15 = 93.33 \approx 93$$
4. Result saved with `metrics: { movement: 93, coordination: 89, rangeOfMotion: 95, symmetry: 89, repetitions: 5 }`.

---

## 15. Important technical interview questions

#### Q1: Why does the Arm Raise elevation formula use `(shoulder.y - wrist.y) * 120 + 50`?
**Answer:** In browser screen coordinates, $(0,0)$ is at the top. When the wrist is raised above the shoulder, $\text{wrist.y} < \text{shoulder.y}$, making the difference positive. Multiplying by 120 and adding 50 scales the neutral arm-at-side position (~50%) to full overhead vertical extension (~100%).

#### Q2: Why is a cooldown period needed in the Sit-to-Stand state machine?
**Answer:** Without a cooldown period, small oscillations near the $155^\circ$ threshold (such as postural tremor during standing) could cause false multiple repetition counts. A 20-frame cooldown prevents re-triggering until the patient begins descending.

#### Q3: How does the system measure bilateral symmetry in stroke hemiplegia?
**Answer:** By calculating the difference between left and right arm elevations: $\text{clamp}(100 - |\text{Elev}_L - \text{Elev}_R| \times 1.2, 0, 100)$. If both arms raise equally, symmetry is 100%. If one hemiparetic arm lags behind, symmetry drops proportionally.

#### Q4: How is movement path efficiency measured in Seated Reach?
**Answer:** It compares the average reach magnitude against an optimal physiological reach extension value (58% of camera field) via $\text{clamp}(100 - |58 - \text{Reach}| \times 0.8, 0, 100)$, penalizing both under-reaching and excessive compensatory leaning.

#### Q5: What happens if a patient only completes 3 of the 5 prescribed repetitions?
**Answer:** The `RepScore` factor is proportional: $\text{clamp}((3 / 5) \times 100, 0, 100) = 60\%$. The composite score reflects partial completion without failing the session entirely.

#### Q6: Why does the backend remove balance metrics from Arm Raise records?
**Answer:** In [server.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/server.js#L567-L579), the backend explicitly normalizes metrics per exercise type. An arm raise measures movement range and coordination symmetry. Storing a dummy balance value would contaminate longitudinal baseline trends with unmeasured data.

#### Q7: How does the frontend validate session quality before saving?
**Answer:** In [AssessmentPage.jsx](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/pages/AssessmentPage.jsx#L26-L37), `isValidSession` requires `result.score > 0` and `result.duration >= 3`. If false, a warning banner is shown, and the backend rejects the submission if valid tracking frames are insufficient.

#### Q8: What coordinate math is used to calculate the knee angle in Sit-to-Stand?
**Answer:** The system calculates the vector from knee to hip and from knee to ankle, computes their dot product, divides by the product of vector magnitudes, and takes the arc-cosine to obtain the interior angle in degrees.

#### Q9: Can patients perform these assessments while seated?
**Answer:** Yes. Seated Reach is explicitly designed for seated execution, and Arm Raise can be performed seated or standing. Sit-to-Stand requires a stable chair to measure the transition from sitting to standing.

#### Q10: How are tracking quality warnings displayed to the patient?
**Answer:** If tracking quality fails (`isValid: false`), [AssessmentPage.jsx](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/pages/AssessmentPage.jsx#L117-L133) renders an alert banner: *"Inconsistent body tracking detected. Please ensure your entire upper body is in view and lighting is adequate."*

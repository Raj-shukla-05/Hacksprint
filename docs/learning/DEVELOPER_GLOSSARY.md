# Developer & Clinical Terminology Glossary

This glossary provides comprehensive, developer-oriented definitions of technical, mathematical, biomechanical, clinical, and regulatory terminology used throughout the **NeuroGuard AI** platform.

---

## Table of Contents

1. [Biomechanical, Kinematic & Clinical Terms](#1-biomechanical-kinematic--clinical-terms)
2. [Computer Vision & Edge Machine Learning Terms](#2-computer-vision--edge-machine-learning-terms)
3. [Statistical Modeling & Baseline Terms](#3-statistical-modeling--baseline-terms)
4. [Healthcare Compliance, Security & Privacy Terms](#4-healthcare-compliance-security--privacy-terms)
5. [Software Architecture & Engineering Terms](#5-software-architecture--engineering-terms)

---

## 1. Biomechanical, Kinematic & Clinical Terms

### Abduction & Adduction
- **Definition:** Anatomical movements of limbs relative to the body's sagittal midline. *Abduction* moves a limb away from the midline (e.g., raising arms sideways); *adduction* brings a limb toward or across the midline.
- **Context in NeuroGuard:** Measured during the Arm Raise assessment to evaluate shoulder girdle mobility and active range of motion.

### Ataxia
- **Definition:** A neurological sign consisting of lack of voluntary coordination of muscle movements, often manifesting as erratic, jerky limb trajectories.
- **Context in NeuroGuard:** Detected in the Seated Reach assessment via the *Path Efficiency* metric; erratic trajectories deviate from smooth straight-line reach envelopes.

### Bilateral Symmetry
- **Definition:** The mathematical equivalence in range of motion, velocity, and elevation between corresponding left and right limbs.
- **Formula:** $\text{Symmetry} = \text{clamp}(100 - |\text{Elev}_L - \text{Elev}_R| \times 1.2, 0, 100)$.
- **Clinical Significance:** In hemiparetic stroke recovery, unilateral weakness causes significant asymmetry. Symmetrical bilateral movement indicates balanced motor unit recruitment and neuroplastic recovery.

### Dysarthria
- **Definition:** A motor speech disorder caused by neurological injury of the motor component of the motor-speech system, characterized by poor articulation, slurred speech, and irregular cadence.
- **Context in NeuroGuard:** Monitored in the Speech Assessment module via Web Audio API analysis of speech cadence, pause frequencies, and sustained phonation stability.

### Extension & Flexion
- **Definition:** Movements that increase (*extension*) or decrease (*flexion*) the angle between two body segments at a joint.
- **Context in NeuroGuard:** Measured during the Sit-to-Stand test (knee extension up to $180^\circ$) and Arm Raise (elbow joint extension).

### Fugl-Meyer Assessment (FMA)
- **Definition:** A gold-standard clinical stroke-specific impairment scale evaluating motor functioning, sensation, balance, joint range of motion, and joint pain.
- **Context in NeuroGuard:** Serves as the clinical reference model for our upper-extremity movement assessments (Arm Raise and Seated Reach).

### Hemiparesis
- **Definition:** Weakness or partial paralysis affecting one side of the body, common after ischemic or hemorrhagic stroke.
- **Context in NeuroGuard:** Assessed through bilateral symmetry scoring, highlighting differences between the paretic and non-paretic extremities.

### Kinematics
- **Definition:** The branch of classical mechanics that describes the motion of points, bodies, and systems of bodies without consideration of the forces that cause them (focusing on position, angle, velocity, and acceleration).
- **Context in NeuroGuard:** Calculated in `scoring.js` using 3D vector coordinates to determine joint angles and trajectory smoothness.

### Range of Motion (ROM)
- **Definition:** The measurement of movement around a specific joint or body part, typically measured in degrees or normalized percentage of full active extension.
- **Context in NeuroGuard:** Calculated for shoulder elevation ($0^\circ - 180^\circ$) and knee joint flexion/extension ($90^\circ - 180^\circ$).

### Spasticity
- **Definition:** An abnormal increase in muscle tone or stiffness caused by disrupted neurological signals from the brain or spinal cord (upper motor neuron lesion).
- **Context in NeuroGuard:** Can cause resistance to full limb extension; flagged when patients consistently plateau at abnormal joint angle thresholds.

### Sustained Phonation
- **Definition:** The ability to produce continuous voiced sound (such as saying "ahhh") without interruption or excessive amplitude modulation.
- **Context in NeuroGuard:** Evaluated during speech assessments as an acoustic biomarker of respiratory and laryngeal motor control.

---

## 2. Computer Vision & Edge Machine Learning Terms

### Edge AI / Edge Inference
- **Definition:** Executing machine learning model inference directly on the end-user's local device (browser, phone, or laptop) rather than sending data to a centralized cloud server.
- **Context in NeuroGuard:** Google MediaPipe Tasks Vision executes in WebAssembly on the client device, keeping video frames local and private.

### Hysteresis (State Machine)
- **Definition:** The dependence of the state of a system on its history; using two distinct threshold values (one high, one low) to prevent rapid, erratic state oscillation.
- **Context in NeuroGuard:** Used in the Sit-to-Stand repetition counter: state transitions to `standing` when knee angle $> 155^\circ$, but only returns to `sitting` when knee angle drops $< 105^\circ$, preventing tremor-induced false counts.

### Keypoint / Landmark
- **Definition:** A distinct 2D or 3D spatial coordinate representing an anatomical joint or feature (e.g., nose, left wrist, right knee) extracted from an image or video frame.
- **Context in NeuroGuard:** MediaPipe Pose Landmarker extracts 33 discrete anatomical landmarks per frame.

### MediaPipe Tasks Vision
- **Definition:** Google's cross-platform framework for delivering modular on-device machine learning solutions for computer vision tasks (pose, hand, and face landmarking).
- **Context in NeuroGuard:** Serves as the core computer vision engine loaded via WebAssembly (`@mediapipe/tasks-vision`).

### Monocular Depth Estimation
- **Definition:** Predicting 3D spatial coordinates and depth ($z$-axis) from a single 2D camera feed without physical stereoscopic or LIDAR hardware.
- **Context in NeuroGuard:** Handled by MediaPipe's deep neural network (`pose_landmarker_lite.task`), which infers metric depth relative to the pelvic midpoint.

### Normalized Coordinates
- **Definition:** Spatial coordinate values scaled between $0.0$ and $1.0$ relative to image dimensions ($x / \text{width}$, $y / \text{height}$), independent of camera resolution.
- **Context in NeuroGuard:** Returned in MediaPipe's `landmarks` array, utilized primarily for 2D HTML5 canvas skeleton rendering.

### Occlusion
- **Definition:** The blocking or hiding of an anatomical landmark from the camera's view (e.g., an arm hidden behind the torso, or a leg obscured by a table).
- **Context in NeuroGuard:** Handled by MediaPipe's landmark visibility confidence score (`landmark.visibility`). Points with visibility $<0.5$ are omitted from kinematic calculations.

### SIMD (Single Instruction, Multiple Data)
- **Definition:** A hardware capability that allows a processor to execute the same operation on multiple data points simultaneously.
- **Context in NeuroGuard:** Leveraged by the compiled WebAssembly binary (`pose_landmarker.wasm`) to achieve 30–60 FPS inference speeds in the browser.

### WebAssembly (WASM)
- **Definition:** A low-level, high-performance binary code format that runs in modern web browsers at near-native execution speed.
- **Context in NeuroGuard:** Executes the pre-compiled MediaPipe neural network runtime inside the client browser sandbox.

### World Landmarks
- **Definition:** 3D coordinates expressed in real-world metric meters, with the coordinate origin $(0, 0, 0)$ centered at the geometric midpoint of the patient's hips.
- **Context in NeuroGuard:** Output by MediaPipe and used in `scoring.js` for true perspective-invariant 3D joint angle dot product calculations.

---

## 3. Statistical Modeling & Baseline Terms

### Alarm Fatigue
- **Definition:** The clinical phenomenon where healthcare providers become desensitized to safety alerts due to a high volume of false-positive notifications.
- **Context in NeuroGuard:** Prevented by requiring **three consecutive sessions** of confirmed decline before generating a physician alert.

### Anomaly Detection
- **Definition:** Identification of rare items, events, or observations that raise suspicions by differing significantly from the majority of the historical data.
- **Context in NeuroGuard:** Implemented in `trendEngine.js` to identify acute functional regression relative to historical baselines.

### Cohort Risk Stratification
- **Definition:** The process of categorizing a patient population into distinct risk groups based on health metrics, enabling targeted resource allocation.
- **Context in NeuroGuard:** Implemented in `DoctorDashboard.jsx` to sort patients into `improving`, `stable`, or `review_needed` (high alert) panels.

### Moving Average (Rolling Window)
- **Definition:** A calculation used to analyze data points by creating a series of averages of different subsets of the full data set over a fixed window size $N$.
- **Formula:** $\text{Baseline} = \frac{1}{\min(N, K)} \sum_{i=1}^{\min(N, K)} \text{Score}_i$, where $N=5$.
- **Context in NeuroGuard:** Computes the patient's moving personal baseline in `trendEngine.js`.

### Personal Baseline
- **Definition:** An individualized normative benchmark derived exclusively from a specific patient's historical capabilities, replacing generic population averages.
- **Context in NeuroGuard:** Ensures stroke survivors are evaluated against their own recent progress envelope rather than unimpaired population standards.

### Persistent Decline
- **Definition:** A statistically confirmed downward trend where a patient's scores fall below their personal baseline for three or more consecutive sessions with a mean drop $>5\%$.
- **Context in NeuroGuard:** Triggers an automated notification to the patient's assigned doctor to schedule a clinical consultation.

### Relative Percentage Deviation ($\Delta\%$)
- **Definition:** The percentage change between the current session score and the established historical baseline.
- **Formula:** $\Delta\% = \left(\frac{\text{Current} - \text{Baseline}}{\text{Baseline}}\right) \times 100$.
- **Thresholds in NeuroGuard:** $\Delta\% \ge +5\%$ is classified as `improving`; $-5\% \le \Delta\% < +5\%$ is `stable`; $\Delta\% < -5\%$ is `declining`.

---

## 4. Healthcare Compliance, Security & Privacy Terms

### Business Associate Agreement (BAA)
- **Definition:** A legally binding contract under HIPAA between a HIPAA-covered entity and a business associate that governs the safeguarding of PHI.
- **Context in NeuroGuard:** Required for enterprise cloud hosting of clinical patient records.

### General Data Protection Regulation (GDPR)
- **Definition:** European Union regulation governing data protection, privacy, and the right to erasure (Article 17) for individuals within the EU.
- **Context in NeuroGuard:** Supported by edge-compute video isolation, user data export tools, and cryptographic token expiration.

### Health Insurance Portability and Accountability Act (HIPAA)
- **Definition:** US federal law establishing standards to protect sensitive patient health information from being disclosed without patient consent or knowledge.
- **Context in NeuroGuard:** Satisfied by edge-compute processing (zero raw video storage), TLS encryption, bcrypt hashing, and role-based access control.

### Insecure Direct Object Reference (IDOR)
- **Definition:** A web security vulnerability where an application uses user-supplied input to access objects directly without proper authorization checks.
- **Context in NeuroGuard:** Prevented in `assessments.js` and `patients.js` by scoping all database queries strictly to the verified `req.user.id` from the decoded JWT.

### Protected Health Information (PHI)
- **Definition:** Any individually identifiable health information created, received, or stored by a healthcare entity, including medical records, video, and biometric markers.
- **Context in NeuroGuard:** Handled by stripping identifying metadata from AI prompts and discarding raw video frames in memory.

### Role-Based Access Control (RBAC)
- **Definition:** A security mechanism that restricts system access to authorized users based on their assigned organizational role (`patient`, `doctor`, `caregiver`, `admin`).
- **Context in NeuroGuard:** Enforced in backend middleware (`requireRole`) and frontend conditional route guards.

### Software as a Medical Device (SaMD)
- **Definition:** Software intended to be used for one or more medical purposes (diagnosis, prevention, monitoring, treatment) without being part of a hardware medical device.
- **Context in NeuroGuard:** NeuroGuard AI is deliberately architected as an **assistive monitoring tool**, not a diagnostic device, keeping it outside Class IIb/III SaMD clearance requirements.

---

## 5. Software Architecture & Engineering Terms

### AbortController
- **Definition:** A standard Web/Node.js API that allows aborting DOM requests or asynchronous fetch operations on demand.
- **Context in NeuroGuard:** Used in `geminiService.js` with a 15-second timeout to prevent API hangs when external AI services experience latency spikes.

### ACID (Atomicity, Consistency, Isolation, Durability)
- **Definition:** A set of properties that guarantee database transactions are processed reliably, even during crashes or power failures.
- **Context in NeuroGuard:** Guaranteed in MongoDB appointment reservations via compound unique partial indexes.

### Compound Partial Unique Index
- **Definition:** A database index spanning multiple fields that enforces uniqueness only on a subset of documents that satisfy a specified filter expression.
- **Definition in NeuroGuard:** `{ doctorId: 1, date: 1, startTime: 1 }` with `{ status: { $in: ['pending', 'confirmed'] } }`, allowing cancelled appointments to be re-booked while preventing double-booking of active slots.

### Graceful Degradation
- **Definition:** The ability of a software system to maintain limited functionality when certain components or dependencies fail.
- **Context in NeuroGuard:** The backend falls back to an in-memory store if MongoDB is down; the Gemini service falls back to local template explanations; the frontend loads mock datasets if the backend is unreachable.

### JSON Web Token (JWT)
- **Definition:** An open standard (RFC 7519) that defines a compact, URL-safe means for securely transmitting information between parties as a JSON object signed with HMAC-SHA256.
- **Context in NeuroGuard:** Transmitted via HTTP `Authorization: Bearer <token>` headers to maintain stateless authentication across API requests.

### Mutex (Mutual Exclusion)
- **Definition:** A concurrency control synchronization mechanism used to prevent multiple processes or threads from accessing a shared resource simultaneously.
- **Context in NeuroGuard:** Implemented in `appointments.js` via an in-memory `Set` (`activeBookingLocks`) to prevent race conditions during simultaneous appointment reservation attempts.

### Recharts
- **Definition:** A composable charting library built on React components and Scalable Vector Graphics (SVG).
- **Context in NeuroGuard:** Renders longitudinal recovery curves, trend comparisons, and radar charts in `TrendChart.jsx`.

### Vite
- **Definition:** A modern frontend build tool that leverages native ES modules in the browser and esbuild to deliver near-instantaneous development server startup and optimized production builds.
- **Context in NeuroGuard:** Powers the frontend development and production build pipeline for React 19.

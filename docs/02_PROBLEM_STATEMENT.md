# 02 — Problem Statement

## 1. The Post-Stroke Recovery Landscape

Stroke is a leading cause of long-term adult disability worldwide, affecting over 15 million people annually. In countries like India, the burden of post-stroke disability is compounded by geographic barriers, acute shortages of specialized neurorehabilitation clinicians, and high out-of-pocket healthcare costs.

Following initial acute stabilization and hospital discharge, stroke survivors enter a critical recovery window—typically spanning the first 3 to 6 months—characterized by heightened neuroplasticity. During this phase, repetitive, task-specific functional movements are crucial to re-establishing neural pathways and restoring motor function.

```
+-----------------------------------------------------------------------------------+
|                            THE POST-STROKE CARE GAP                               |
+-----------------------------------------------------------------------------------+
|  Hospital Discharge    ======>  [ 3 - 6 WEEKS BLACK BOX ] ======>  Follow-Up Visit|
|  • High Clinician Touch         • Zero Objective Tracking           • "How have   |
|  • Structured Regimen           • Subjective Recall Fatigue           you felt?"  |
|  • Monitored Vitals             • Undetected Functional Drop        • Late Inter- |
|                                 • High Attrition Rate                 vention     |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Clinical Challenges Identified

### Problem 1: The "Black Box" of Home Rehabilitation
Once a patient is discharged, attending neurologists and physical therapists lose visibility into patient compliance, movement kinematics, and functional trajectory. Clinicians must rely on self-reported patient memory during intermittent follow-ups (often spaced 4 to 8 weeks apart), which is notoriously unreliable due to cognitive fatigue, post-stroke aphasia, and emotional recall bias.

### Problem 2: Late Detection of Silent Functional Deterioration
Secondary complications—such as muscle spasticity, compensatory asymmetric movement patterns, joint subluxation, and motor deterioration—develop gradually. By the time a patient realizes their range of motion has decreased or their gait stability has deteriorated, compensatory movement habits have become ingrained, requiring months of corrective rehabilitation.

### Problem 3: The Pitfall of Population-Wide Averages
Traditional fitness applications and digital health tools benchmark users against idealized demographic averages. For a 58-year-old stroke survivor with left-sided hemiplegia, comparing their arm elevation against a healthy adult population is demotivating and clinically meaningless. Clinical progress must be measured relative to the patient's individual post-injury baseline.

### Problem 4: Privacy Concerns with Remote Video Monitoring
While telemedicine platforms often suggest recording video workouts for clinician review, patients and families are hesitant to record and transmit video footage from their private living spaces. Patients fear data leaks, loss of dignity, and violations of data privacy laws.

### Problem 5: Lack of Closed-Loop Healthcare Integration
Many wellness apps exist as isolated silos: their scores cannot be reviewed by a patient's real-world physician, nor do they connect to the physical clinic where in-person interventions (such as botulinum toxin injections for spasticity or manual physical therapy adjustments) take place.

---

## 3. How NeuroGuard AI Solves These Challenges

| Clinical Problem | Traditional Reality | NeuroGuard AI Solution |
| :--- | :--- | :--- |
| **Visibility** | Complete black box between appointments; reliance on paper journals. | Objective daily checks measuring elevation angles, symmetry, stability, and completion. |
| **Trend Detection** | Decline noticed only after severe motor loss. | Deterministic trend engine detects persistent deviations across 3+ sessions and flags review alerts. |
| **Benchmarking** | Demoralizing comparisons to healthy population norms. | Personal baseline tracking using a 5-session moving average of the patient's own past performance. |
| **Data Privacy** | Sensitive home videos uploaded to cloud servers. | Zero video retention: WebAssembly computer vision processes frames locally on-device. |
| **Clinical Bridge** | Unconnected mobile app scores ignored by doctors. | Clinician portal with prescribed protocols, review notes, verified in-person booking, and audited report sharing. |

---

## 4. Target User Personas and Needs

### Persona 1: The Stroke Survivor (Patient)
- **Profile:** 50–70 years old, recovering from ischemic or hemorrhagic stroke, experiencing unilateral hemiparesis or coordination deficits.
- **Needs:** Clear, low-stress movement instructions; positive reinforcement of micro-improvements; minimal technology friction; no risk of private video leaks.
- **Pain Point:** Anxiety regarding whether they are improving, stabilizing, or deteriorating between doctor visits.

### Persona 2: The Attending Neurologist / Physiatrist (Doctor)
- **Profile:** Highly busy outpatient clinician managing dozens of stroke and neurorehab patients.
- **Needs:** Quick-glance triage list highlighting patients who are deteriorating; ability to prescribe structured functional exercises; objective longitudinal progress charts for physical OPD visits.
- **Pain Point:** Lack of objective data to titrate therapies or detect subacute functional decline early.

### Persona 3: The Family Caregiver (Caregiver)
- **Profile:** Adult child or spouse assisting the patient with daily care and medical navigation.
- **Needs:** Ability to book in-person appointments on behalf of the patient; access to progress summaries; assurance that the patient is completing prescribed exercises safely.
- **Pain Point:** Burden of coordinating schedules and lack of visibility into therapy compliance.

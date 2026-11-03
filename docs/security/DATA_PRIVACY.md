# Data Privacy & Patient Confidentiality Architecture

## 1. Zero-Video Data Minimization Principle

The foundation of NeuroGuard AI's privacy architecture is **strict data minimization**. Traditional tele-rehabilitation platforms require patients to record and upload video files to cloud storage buckets (e.g. AWS S3 or Google Cloud Storage) for physician review. This creates severe privacy risks:
- Vulnerability to cloud data breaches.
- Inadvertent exposure of patient living spaces, family members, or private medical appliances.
- High bandwidth costs and slow upload times for stroke survivors in low-connectivity areas.

```
TRADITIONAL TELEHEALTH:
Patient Webcam ===> [ High-Def Video MP4 ] ===> Transmit over Internet ===> Persisted in Cloud S3

NEUROGUARD AI (EDGE PRIVACY):
Patient Webcam ===> RAM Texture ===> WebAssembly Pose Model ===> 33 Scalar Coordinates ===> Video DISCARDED
                                                                         |
                                                                         v
                                                       Only Numerical Metrics Sent (JSON)
```

NeuroGuard processes 100% of raw video streams inside the browser's volatile graphics memory via `@mediapipe/tasks-vision`. Once the 33 anatomical landmark coordinates are extracted for a video frame, the frame is immediately purged. **No video file is ever encoded, saved to disk, or transmitted over any network interface.**

---

## 2. Protected Health Information (PHI) Handling

| Data Domain | What is Collected | Where it is Stored | Who Can Access |
| :--- | :--- | :--- | :--- |
| **Video Streams** | Temporary RAM video frames (1280x720) | Client-side memory only (Discarded instantly) | Nobody (Never leaves device RAM) |
| **Kinematic Metrics** | Joint elevation, symmetry, repetition counts, durations | MongoDB `Assessment` collection / store.js | Authenticated Patient, Authorized Doctor |
| **Patient Profile** | Name, Email, Age, Preferred Language | MongoDB `User` collection / store.js | Authenticated Patient, Assigned Doctor |
| **Doctor Profile** | Name, Specialization, Clinic Address, Fee, Rating | MongoDB `Doctor` collection / store.js | Publicly searchable in clinic directory |
| **Shared Reports** | Historical assessment snapshot, trends, breakdown | MongoDB `SharedRecoveryReport` collection | Recipient Doctor (while consent is active) |
| **Audit Logs** | Doctor ID, Action, Timestamp, IP Address, User-Agent | Embedded in `SharedRecoveryReport` | Owning Patient, Viewing Doctor |

---

## 3. Explicit Consent & Patient Data Sovereignty

### 1. Assessment Consent
The camera stream is never initiated automatically. The patient must explicitly click *"Start camera check"* on the assessment page, triggering the browser's native permission dialog (`navigator.mediaDevices.getUserMedia`).

### 2. Clinical Report Sharing Consent
A patient’s historical recovery data is never shared with a doctor by default. In [ShareReportModal.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/ShareReportModal.jsx), the patient must review a preview snapshot and check a legally framed authorization checkbox:
> *"I explicitly authorize Dr. Priya Nair to view my NeuroGuard assessment history, movement scores, and baseline trends for in-person clinical review. I can revoke access at any time."*

### 3. Immediate Revocation Capability
Patients retain absolute sovereignty over their data. By navigating to the *"Shared Reports"* tab on [AppointmentsPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AppointmentsPage.jsx), the patient can click *"Revoke Access"* at any moment. The backend updates the record status to `'revoked'` and immediately cuts off doctor access.

---

## 4. Immutable Access Audit Trail

Every interaction with a shared recovery report generates an immutable audit record in `accessAuditLog`:
- **`shared`:** Recorded when the patient authorizes sharing, logging the patient ID, doctor ID, timestamp, and IP address.
- **`viewed`:** Recorded each time the doctor opens or inspects the recovery report, logging the doctor ID, exact timestamp, IP address, and browser User-Agent.
- **`revoked`:** Recorded when the patient revokes authorization.

Patients can inspect this audit trail directly within their report viewer to verify exactly when and from where their records were reviewed.

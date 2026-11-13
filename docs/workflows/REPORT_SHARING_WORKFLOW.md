# End-to-End Workflow: Clinical Recovery Report Sharing, Consent & Revocation

This document traces the complete workflow for compiling an objective patient recovery report, obtaining explicit informed consent, securely sharing the report with an attending clinician, logging audit events, and handling immediate access revocation.

---

## 1. Complete Report Sharing & Revocation Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    participant UI as ShareReportModal.jsx
    participant Routes as reportRoutes.js
    participant Service as reportSharingService.js
    participant DB as MongoDB SharedRecoveryReport
    actor Doctor
    participant DocUI as DoctorAppointmentsPage.jsx
    participant Notif as notificationService.js

    Patient->>UI: Clicks "Share Report" for Appointment with Dr. Priya
    UI->>Routes: GET /api/reports/preview?patientId=:id
    Routes->>Service: compilePatientRecoveryReport(patientId)
    Service->>Service: Aggregate genuine sessions, compute baseline delta & breakdown
    Service-->>UI: Return Report Preview JSON
    UI->>Patient: Render Snapshot Preview & Mandatory Consent Checkbox
    
    Patient->>UI: Checks Authorization Box & Clicks "Authorize & Share Report"
    UI->>Routes: POST /api/reports/share { doctorId, appointmentId }
    Routes->>Service: shareRecoveryReport()
    Service->>DB: Insert SharedRecoveryReport (status: 'active', audit: ['shared'])
    Service->>Service: Update Appointment with sharedReportId
    Service->>Notif: Create Notification for Doctor ("Patient Shared Recovery Report")
    Routes-->>UI: HTTP 201 Created (Share Record)
    UI->>Patient: Toast: "Recovery report authorized and shared with doctor."

    Doctor->>DocUI: Opens "Recovery Reports" in Clinic Schedule
    DocUI->>Routes: GET /api/reports/shared-with-me
    Routes-->>DocUI: List Active Shared Reports
    
    Doctor->>DocUI: Clicks "View Full Report"
    DocUI->>Routes: GET /api/reports/shared/:shareId
    Routes->>Service: getSharedReport(shareId, req.user)
    Service->>Service: Verify req.user is recipient doctor AND status !== 'revoked'
    Service->>DB: Append Audit Log Entry: { action: 'viewed', ip, userAgent, timestamp }
    Routes-->>DocUI: Return Full Report Data & Access Audit Trail
    DocUI->>Doctor: Render Recovery Profile & Audit History

    Note over Patient,Doctor: Patient decides to revoke doctor's access to the report

    Patient->>UI: Opens "Shared Reports" Tab on AppointmentsPage
    Patient->>UI: Clicks "Revoke Access"
    UI->>Routes: DELETE /api/reports/shares/:shareId
    Routes->>Service: revokeReportAccess(shareId, req.user)
    Service->>DB: Update status to 'revoked', set revokedAt, append audit ['revoked']
    Service->>Notif: Create Notification for Doctor ("Report Access Revoked")
    Routes-->>UI: Return HTTP 200 OK (Revocation Confirmed)
    UI->>Patient: Toast: "Report access revoked."

    Doctor->>DocUI: Attempts to open report again
    DocUI->>Routes: GET /api/reports/shared/:shareId
    Routes->>Service: getSharedReport()
    Service->>Service: Checks record.status === 'revoked'
    Service-->>DocUI: HTTP 403 Forbidden ("Access has been revoked by the patient")
    DocUI->>Doctor: Display Access Denied Banner
```

---

## 2. Step-by-Step Technical Execution

### Step 1: Report Preview Compilation
- **Frontend Action:** Patient clicks *"Share Report"* on an appointment card in [AppointmentsPage.jsx](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/pages/AppointmentsPage.jsx).
- **API Request:** `GET /api/reports/preview?patientId=:id`.
- **Backend Function:** In [reportSharingService.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/services/reportSharingService.js#L14-L95), `compilePatientRecoveryReport()`:
  - Gathers real assessment records for the patient from MongoDB and the active session store.
  - Sorts sessions descending by timestamp (`recentSessions = patientAssessments.slice(0, 10)`).
  - Computes personal baseline score: `personalBaseline(scores)`.
  - Calculates longitudinal trend data via `buildTrend()`.
  - Groups assessments by protocol: `arm_raise`, `sit_to_stand`, and `seated_reach`.
  - Attaches the clinical non-diagnostic disclaimer.

### Step 2: Informed Patient Consent Verification
- **Frontend Interface:** [ShareReportModal.jsx](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/components/ShareReportModal.jsx#L98-L115).
- **Mandatory Consent Checkbox:** The submit button remains disabled until the patient checks the authorization checkbox:
  ```html
  <input type="checkbox" id="report-consent" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} required />
  ```
- **Consent Text:** *"I explicitly authorize Dr. Priya Nair to view my NeuroGuard assessment history, movement scores, and baseline trends for in-person clinical review. I can revoke access at any time."*

### Step 3: Authorization Persistence & Linkage
- **API Request:** `POST /api/reports/share` with `{ doctorId, appointmentId, patientId }`.
- **Backend Processing:** In [reportSharingService.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/services/reportSharingService.js#L142-L211):
  - Captures `clientIp` and `userAgent` from request headers.
  - Creates document in `SharedRecoveryReport` collection with `status: 'active'`.
  - Initializes `accessAuditLog` with action `'shared'`.
  - If `appointmentId` was provided, updates the `Appointment` document with `sharedReportId = shareId`.
  - Calls `createNotification()` to alert the doctor.

### Step 4: Doctor Access & Audit Logging
- **Doctor Action:** Doctor clicks *"View Full Report"* in [DoctorAppointmentsPage.jsx](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/pages/DoctorAppointmentsPage.jsx).
- **API Request:** `GET /api/reports/shared/:shareId`.
- **Authorization Check:** In [reportSharingService.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/services/reportSharingService.js#L241-L250), verifies caller is the designated doctor recipient.
- **Revocation Check:** Verifies `record.status !== 'revoked'`.
- **Audit Logging:** Appends a new entry to `accessAuditLog`:
  ```javascript
  {
    doctorId: record.doctorId,
    doctorUserId: actingUser.userId,
    action: 'viewed',
    accessedAt: new Date().toISOString(),
    ip: clientIp,
    userAgent
  }
  ```
- **Modal Display:** [RecoveryReportModal.jsx](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/components/RecoveryReportModal.jsx) renders the full profile and displays the audit log history.

### Step 5: Patient Access Revocation
- **Patient Action:** In the *"Shared Reports"* tab, patient clicks *"Revoke Access"*.
- **Confirmation:** Browser displays confirmation prompt: *"Are you sure you want to revoke this doctor’s access to your recovery report?"*
- **API Request:** `DELETE /api/reports/shares/:shareId`.
- **Backend Processing:** In [reportSharingService.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/services/reportSharingService.js#L315-L355):
  - Sets `record.status = 'revoked'`.
  - Sets `record.revokedAt = new Date().toISOString()`.
  - Appends audit entry: `{ action: 'revoked', ip, userAgent }`.
  - Dispatches notification to doctor: *"Raj Kumar has revoked access to their previously shared recovery report."*

### Step 6: Enforcement on Subsequent Attempts
- If the doctor attempts to open the report after revocation, `getSharedReport()` catches `record.status === 'revoked'` and immediately throws an HTTP 403 Forbidden error:
  ```json
  { "message": "Forbidden: Access to this recovery report has been revoked by the patient." }
  ```

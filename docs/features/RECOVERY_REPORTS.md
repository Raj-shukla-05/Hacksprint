# Feature Documentation: Recovery Report Generation, Sharing Consent & Access Auditing

---

## 1. Feature Name
**Clinical Recovery Report Generation, Patient-Authorized Sharing & Access Audit Trail**

---

## 2. What is this feature?
This feature enables the automated compilation of a patient’s longitudinal assessment history into a standardized **Clinical Recovery Report** ([reportSharingService.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/services/reportSharingService.js)). Patients can preview the compiled data and explicitly authorize sharing with a specific attending doctor for in-person consultation review. Access is revocable at any time and protected by an immutable access audit trail.

---

## 3. Why was this feature developed?
- **Preparation for In-Person Clinical Visits:** Provides attending clinicians with an objective, quantitative summary of the patient's home recovery prior to or during their physical consultation.
- **Patient Sovereignty & Informed Consent:** Patients must maintain complete ownership over their medical records. Reports are never shared automatically; explicit opt-in consent is required.
- **Access Transparency (HIPAA / GDPR Alignment):** The access audit trail records every view event (timestamp, doctor ID, IP address, and user agent), allowing patients to verify who inspected their health metrics.

---

## 4. Who uses this feature?
- **Patient:** Previews their compiled recovery documentation, grants sharing authorization, views active shares, and revokes access.
- **Doctor:** Inspects shared recovery reports to review movement scores, baseline deltas, and protocol compliance.

---

## 5. How does this feature work?
1. The patient opens their appointment list on [AppointmentsPage.jsx](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/frontend/src/pages/AppointmentsPage.jsx) and clicks *"Share Report"*.
2. [ShareReportModal.jsx](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/frontend/src/components/ShareReportModal.jsx) calls `GET /api/reports/preview?patientId=:id`.
3. The backend compiles the report directly from recorded sessions, computing baseline scores, longitudinal trends, exercise breakdowns, and active alerts.
4. The patient reviews the preview, checks the mandatory consent box (*"I explicitly authorize Dr. Priya Nair to view my recovery metrics..."*), and submits.
5. `POST /api/reports/share` persists the record with `status: 'active'`, attaches the initial `'shared'` audit entry, links the share ID to the appointment, and sends a notification to the doctor.
6. The doctor views the report in [RecoveryReportModal.jsx](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/frontend/src/components/RecoveryReportModal.jsx). The backend appends a `'viewed'` entry to the `accessAuditLog`.
7. If the patient clicks *"Revoke Access"*, the backend updates status to `'revoked'`, logs `'revoked'` in the audit trail, notifies the doctor, and blocks all future viewing attempts.

---

## 6. Frontend implementation
- **Source Files:**
  - [ShareReportModal.jsx](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/frontend/src/components/ShareReportModal.jsx): Interactive sharing modal displaying report preview snapshot, doctor recipient header, mandatory consent checkbox, and authorization submit button.
  - [RecoveryReportModal.jsx](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/frontend/src/components/RecoveryReportModal.jsx): Modal viewing interface displaying the clinical disclaimer, summary KPI strip, protocol distribution tags, genuine assessment session table, and access audit log list.
  - [AppointmentsPage.jsx](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/frontend/src/pages/AppointmentsPage.jsx#L127-L149): Manages the *"Shared Reports"* tab, showing active shares with *"Revoke Access"* and *"View Report"* actions.

---

## 7. Backend implementation
- **Source Files:**
  - [services/reportSharingService.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/services/reportSharingService.js):
    - `compilePatientRecoveryReport()`: Aggregates genuine data from MongoDB/store.js.
    - `shareRecoveryReport()`: Persists share record and registers initial audit entry.
    - `getSharedReport()`: Verifies authorization, blocks revoked access, and logs `'viewed'` audit entries.
    - `revokeReportAccess()`: Sets `status: 'revoked'` and logs audit entry.
    - `getReportsSharedWithDoctor()` & `getReportsSharedByPatient()`.
  - [routes/reportRoutes.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/routes/reportRoutes.js): REST route handlers mounting endpoints.

---

## 8. Database implementation
- Uses [SharedRecoveryReport.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/models/SharedRecoveryReport.js):
  ```javascript
  const AccessAuditSchema = new mongoose.Schema({
    doctorId: { type: String, required: true },
    doctorUserId: { type: String },
    action: { type: String, enum: ['shared', 'viewed', 'revoked'], required: true },
    accessedAt: { type: Date, default: Date.now },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  });

  const SharedRecoveryReportSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    patientId: { type: String, required: true, index: true },
    patientName: { type: String, required: true },
    doctorId: { type: String, required: true, index: true },
    doctorName: { type: String, required: true },
    appointmentId: { type: String, index: true, default: null },
    status: { type: String, enum: ['active', 'revoked'], default: 'active', index: true },
    reportData: { type: mongoose.Schema.Types.Mixed, required: true },
    sharedAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
    accessAuditLog: [AccessAuditSchema],
  });
  ```

---

## 9. Algorithms and technical logic
1. **Dynamic Report Assembly Algorithm:**
   $$\text{Report} = \{ \text{PatientProfile}, \text{DashboardSummary}, \text{BaselineScore}, \text{Trends}_{1..N}, \text{Breakdown}, \text{Sessions}_{1..10}, \text{Disclaimer} \}$$
2. **Access Control Verification Logic ([reportSharingService.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/services/reportSharingService.js#L235-L257)):**
   $$\text{Allowed} \iff (\text{IsPatientOwner}) \lor (\text{IsRecipientDoctor} \land \text{Status} \ne \text{'revoked'})$$

---

## 10. Data flow
```
Patient Clicks "Share Report" 
  ──> GET /api/reports/preview 
  ──> compilePatientRecoveryReport() 
  ──> Client previews report snapshot 
  ──> Patient checks consent box 
  ──> POST /api/reports/share { doctorId, appointmentId } 
  ──> Save SharedRecoveryReport (audit: 'shared') 
  ──> Notification sent to Doctor 
  ──> Doctor opens report 
  ──> GET /api/reports/shared/:id 
  ──> Audit appended ('viewed') 
  ──> Patient clicks "Revoke" ──> DELETE /api/reports/shares/:id 
  ──> Status set to 'revoked' (audit: 'revoked') 
  ──> Doctor blocked on future attempts (HTTP 403)
```

---

## 11. External dependencies
- No third-party reporting or PDF generation engines required; structured as clean, native JSON payloads rendered directly in the DOM.

---

## 12. Security and privacy
- **Explicit Consent Mandate:** The frontend disables the share button until the patient checks the authorization checkbox.
- **Revocation Enforcement:** When revoked, any subsequent doctor view attempt is rejected with HTTP 403 Forbidden: *"Forbidden: Access to this recovery report has been revoked by the patient."*
- **IDOR Protection:** Doctor B cannot access a report shared with Doctor A.

---

## 13. Limitations
- PDF/print styling is currently handled by standard browser print stylesheets; server-side headless Chrome PDF rendering is planned for enterprise integration.
- The report snapshot captures data at the time of compilation; future assessments require a new share or refresh.

---

## 14. Example execution
1. Raj Kumar shares his recovery report with Dr. Priya Nair for his appointment on Monday.
2. The initial share is logged: `ACTION: SHARED by Doctor ID doc-priya on 11/3/2026, 11:15 AM (IP: 192.168.1.10)`.
3. Dr. Priya opens the report on her portal: `ACTION: VIEWED by Doctor ID doc-priya on 11/3/2026, 11:20 AM`.
4. Raj decides to revoke access. He clicks *"Revoke Access"*.
5. The record updates to `status: 'revoked'`.
6. Dr. Priya receives a notification: *"Raj Kumar has revoked access to their previously shared recovery report."*

---

## 15. Important technical interview questions

#### Q1: What happens if Doctor B attempts to view a report shared with Doctor A?
**Answer:** In [reportSharingService.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/services/reportSharingService.js#L241-L249), the service verifies that `actingUser.userId` matches `record.doctorId` or `record.doctorUserId`. For Doctor B, this evaluates to `false`, and the request returns HTTP 403 Forbidden: *"Forbidden: You do not have permission to view this recovery report."*

#### Q2: What happens when a doctor attempts to view a report whose access was revoked?
**Answer:** In [reportSharingService.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/services/reportSharingService.js#L252-L257), the service checks `if (record.status === 'revoked')`. It immediately throws an HTTP 403 error: *"Forbidden: Access to this recovery report has been revoked by the patient."*

#### Q3: Does revoking a report delete the historical audit trail?
**Answer:** No. The `accessAuditLog` array is preserved. Revoking appends an additional entry with `action: 'revoked'` and records `revokedAt`, ensuring an immutable historical log of all sharing and revocation events.

#### Q4: What data is contained within the compiled recovery report?
**Answer:** In [reportSharingService.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/services/reportSharingService.js#L64-L95), it includes patient demographic summaries, clinical disclaimers, overall recovery score, moving-window baseline score, baseline delta percentage, total completed sessions, protocol breakdown counts, longitudinal trend arrays, recent alerts, and the 10 most recent assessment sessions with tracking quality indicators.

#### Q6: How is the client IP and User-Agent captured for the audit trail?
**Answer:** In [reportRoutes.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/routes/reportRoutes.js#L51-L52), the route handler extracts `req.ip || req.headers['x-forwarded-for']` and `req.headers['user-agent']` and passes them to `shareRecoveryReport()` and `getSharedReport()`.

#### Q7: Does cancelling an appointment automatically revoke the shared report?
**Answer:** No. Report authorization is an independent consent relationship. A patient may want the doctor to retain access to review historical trends even if an appointment date was rescheduled or cancelled. The patient can manually revoke access at any time via the *"Shared Reports"* tab.

#### Q8: Where is the clinical disclaimer displayed in the report?
**Answer:** It is prominently rendered at the top of [RecoveryReportModal.jsx](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/frontend/src/components/RecoveryReportModal.jsx#L30-L36) in an amber notice banner: *"Non-Diagnostic Rehabilitation Documentation. NeuroGuard AI functional monitoring report provided for clinical oversight. Does not replace professional clinical diagnosis."*

#### Q9: How are assessment sessions ordered in the report?
**Answer:** Descending by timestamp (`new Date(b.timestamp) - new Date(a.timestamp)`), so the clinician sees the most recent recovery sessions at the top of the table.

#### Q10: How does the report preview endpoint prevent stale data?
**Answer:** `GET /api/reports/preview` compiles fresh data on the fly from MongoDB and the active session store each time it is queried, guaranteeing the preview accurately reflects the patient's latest assessments.

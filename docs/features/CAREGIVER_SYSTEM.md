# Feature Documentation: Caregiver Proxy Management & Patient Authorization

---

## 1. Feature Name
**Caregiver Authorization, Patient Proxy Management & Isolation System**

---

## 2. What is this feature?
The Caregiver System allows designated family members or home-health aides to register with a dedicated `caregiver` role, link securely to authorized stroke patients, view patient recovery progress, book in-person clinic appointments on behalf of the patient, and share recovery reports under explicit patient authorization. The system enforces strict caregiver isolation to prevent unauthorized proxy access.

---

## 3. Why was this feature developed?
- **Realities of Stroke Care:** Stroke survivors frequently experience cognitive impairments, motor hemiplegia, or fatigue, making self-service digital navigation difficult. Family caregivers handle the majority of logistical and clinical coordination.
- **Dignity and Patient Autonomy:** Caregiver access must be explicit and revocable, ensuring patients retain sovereignty over their own medical records.
- **Preventing Unauthorized Interception:** Prevents non-family members or unverified caregivers from viewing private functional data.

---

## 4. Who uses this feature?
- **Caregiver:** Manages appointments and reviews trends for authorized family members.
- **Patient:** Explicitly grants or revokes caregiver authorization.
- **Doctor:** Sees who booked an appointment (`bookedBy.role: 'caregiver'`).

---

## 5. How does this feature work?
1. The caregiver registers on [LoginPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/LoginPage.jsx) selecting the `Caregiver` role.
2. In the patient's record, the caregiver's user ID is added to `patient.authorizedCaregivers`. In the caregiver's record, the patient's ID is added to `caregiver.caregiverPatients`.
3. The caregiver logs in and accesses the `'caregiver'` view in [Sidebar.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/Sidebar.jsx#L20-L24).
4. The caregiver queries `GET /api/caregivers/:id/patients` to view authorized patients.
5. When booking an appointment, the caregiver selects the target patient. `POST /api/appointments` passes `patientId: requestedPatientId`.
6. [appointmentRoutes.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/appointmentRoutes.js#L34-L41) calls `isCaregiverAuthorized(req.user.userId, requestedPatientId)`:
   - If authorized, the visit is booked for the patient, with `bookedBy` recording the caregiver's identity.
   - If unauthorized, it returns HTTP 403 Forbidden.

---

## 6. Frontend implementation
- **Source Files:**
  - [Sidebar.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/Sidebar.jsx#L20-L24): Caregiver navigation (`Patient Overview`, `Recovery Progress`, `Doctor Appointments`).
  - [AppointmentsPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/AppointmentsPage.jsx): Displays appointments for the caregiver's authorized patients.
  - [LoginPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/LoginPage.jsx): Role selector button for Caregiver.
  - [api.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/api.js#L125): `api.caregiverPatients(caregiverId)`.

---

## 7. Backend implementation
- **Source Files:**
  - [routes/caregiverRoutes.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/caregiverRoutes.js): `GET /api/caregivers/:id/patients`.
  - [middleware/auth.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/middleware/auth.js#L42-L57): `isCaregiverAuthorized()`.
  - [routes/appointmentRoutes.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/appointmentRoutes.js#L34-L41): Caregiver proxy verification logic.
  - [routes/reportRoutes.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/reportRoutes.js#L18-L24): Caregiver report preview and sharing verification.

---

## 8. Database implementation
- Uses [User.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/User.js):
  - `authorizedCaregivers`: `[{ type: String }]` on the patient's User document.
  - `caregiverPatients`: `[{ type: String }]` on the caregiver's User document.
- Seed data in [store.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/store.js#L34-L52) links Anita Sharma (`caregiver-anita`) to Raj Kumar (`user-raj`).

---

## 9. Algorithms and technical logic
1. **Bidirectional Caregiver Authorization Algorithm ([auth.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/middleware/auth.js#L44-L57)):**
   ```javascript
   function isCaregiverAuthorized(caregiverUserId, patientId) {
     if (!caregiverUserId || !patientId) return false;
     const { users } = require('../store');
     const patient = users[patientId];
     const caregiver = users[caregiverUserId];

     if (patient?.authorizedCaregivers && patient.authorizedCaregivers.includes(caregiverUserId)) {
       return true;
     }
     if (caregiver?.caregiverPatients && caregiver.caregiverPatients.includes(patientId)) {
       return true;
     }
     return false;
   }
   ```

---

## 10. Data flow
```
Caregiver Books Appointment 
  ──> POST /api/appointments { doctorId, date, startTime, patientId: 'user-raj' } 
  ──> auth.js checks isCaregiverAuthorized('caregiver-anita', 'user-raj') 
  ──> [True] ──> Proceed to bookAppointment() 
  ──> Appointment records bookedBy: { userId: 'caregiver-anita', role: 'caregiver', name: 'Anita Sharma' } 
  ──> [False] ──> HTTP 403 Forbidden ("You are not authorized to book for this patient")
```

---

## 11. External dependencies
- Built with standard Express routing and Mongoose array querying.

---

## 12. Security and privacy
- **Caregiver Isolation:** Caregivers cannot view dashboards, appointments, or reports of patients who have not explicitly authorized them.
- **Horizontal Access Defense:** Endpoint `GET /api/caregivers/:id/patients` ensures `req.user.userId === req.params.id`, preventing one caregiver from viewing another caregiver's patient roster.
- **Audit Logging:** Every report shared by a caregiver logs the caregiver's user ID and role in the access audit trail.

---

## 13. Limitations
- Self-service pairing codes (e.g., generating a 6-digit pairing code to link a caregiver) are planned for the mobile app release; pairing is currently established via the `authorizedCaregivers` array.
- Multi-caregiver role hierarchies (e.g. primary vs secondary caregiver) are not yet distinguished.

---

## 14. Example execution
1. Anita Sharma signs in as Caregiver (`anita@neuroguard.demo`).
2. Her dashboard shows Raj Kumar's recovery progress (+9.7%).
3. Anita opens Doctor Appointments and books an in-person slot with Dr. Priya Nair on Raj's behalf.
4. The appointment displays: *"Booked by Anita Sharma (Caregiver) for Raj Kumar"*.

---

## 15. Important technical interview questions

#### Q1: What happens if an unauthorized caregiver attempts to book an appointment for a patient?
**Answer:** In [appointmentRoutes.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/appointmentRoutes.js#L38-L40), `isCaregiverAuthorized()` returns `false`, and the server immediately terminates the request with HTTP 403 Forbidden: *"Forbidden: You are not authorized to book for this patient."*

#### Q2: How does the system record that an appointment was booked by proxy?
**Answer:** The `Appointment` model has a `bookedBy` subdocument storing `{ userId, role, name }`. For caregiver bookings, it records `{ userId: caregiver.id, role: 'caregiver', name: caregiver.name }` while `patientId` points to the patient.

#### Q3: Can a caregiver perform camera assessments on behalf of the patient?
**Answer:** No. In [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L534-L536), `POST /api/assessments` enforces `if (req.user.role !== 'patient') return res.status(403);`. Only patients can submit assessment sessions.

#### Q4: How is a caregiver prevented from viewing another caregiver's patient roster?
**Answer:** In [caregiverRoutes.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/caregiverRoutes.js#L11-L13), `if (req.user.role === 'caregiver' && req.user.userId !== caregiverId) return res.status(403).json({ message: 'Forbidden: You cannot view another caregiver’s patient list' });`.

#### Q5: Can a caregiver authorize report sharing with a doctor?
**Answer:** Yes, provided they are authorized for that patient. In [reportRoutes.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/reportRoutes.js#L44-L49), if `req.user.role === 'caregiver'`, the backend verifies `isCaregiverAuthorized()` before compiling and sharing the report.

#### Q6: Can a caregiver cancel or reschedule an appointment?
**Answer:** Yes. In [appointmentService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/appointmentService.js#L447-L450), `isCaregiverUser` is validated. Authorized caregivers are permitted to cancel or reschedule visits.

#### Q7: Can a patient revoke a caregiver's access?
**Answer:** Yes. By removing the caregiver's user ID from the patient's `authorizedCaregivers` array, all future proxy requests from that caregiver will fail with HTTP 403 Forbidden.

#### Q8: Where is the demo caregiver account configured?
**Answer:** In [store.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/store.js#L45-L52), `caregiver-anita` is linked to `user-raj` via `caregiverPatients: ['user-raj']`, with login credentials `anita@neuroguard.demo` / `caregiver123`.

#### Q9: What does the caregiver see on the appointments page?
**Answer:** In [appointmentRoutes.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/routes/appointmentRoutes.js#L73-L76), `GET /api/appointments/my` checks if the caller is a caregiver and queries appointments where `patientId` is in `caregiver.caregiverPatients`.

#### Q10: How does the UI distinguish caregiver navigation from patient navigation?
**Answer:** In [Sidebar.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/Sidebar.jsx#L20-L24), the sidebar renders `caregiverItems` with labels like *"Patient Overview"* and *"Recovery Progress"*, while omitting patient-only actions like *"Today's Check"*.

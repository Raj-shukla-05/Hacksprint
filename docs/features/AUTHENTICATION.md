# Feature Documentation: User Authentication & Role-Based Access Control

---

## 1. Feature Name
**User Authentication, Session Management & Role-Based Access Control (RBAC)**

---

## 2. What is this feature?
This feature provides secure user registration, credential validation, cryptographic session generation (JWT), password hashing (bcrypt), and role-based permissions across three healthcare user personas: **Patient**, **Doctor**, and **Caregiver**. It safeguards medical data against unauthorized access, prevents horizontal privilege escalation (IDOR), and auto-provisions profile metadata upon onboarding.

---

## 3. Why was this feature developed?
- **Protection of Sensitive Health Data:** Health metrics and rehabilitation records are protected personal data. A secure access boundary is legally and ethically required.
- **Role Differentiation:** Patients, caregivers, and doctors have completely different operational requirements (e.g., patients perform camera checks, doctors assign protocols, caregivers book visits).
- **Prevention of Tampering:** Ensures patients cannot alter clinical assignments or doctor notes, doctors cannot access unassigned patients, and caregivers only access authorized family members.
- **Frictionless Demo Onboarding:** Enables quick evaluation during hackathons and testing via seeded accounts (`raj@neuroguard.demo`, `anita@neuroguard.demo`, `priya@neuroguard.demo`).

---

## 4. Who uses this feature?
- **Patient:** Registers account, logs in to perform daily checks, views personal recovery trends, books appointments, and consents to share reports.
- **Doctor:** Registers with clinical credentials (specialty, clinic, fee, experience), logs in to manage their patient roster, assigns exercise protocols, and reviews appointments.
- **Caregiver:** Registers to assist specific authorized stroke patients, monitors functional trends, and books clinic appointments as an authorized proxy.
- **Administrator:** Role is architecturally supported via the `role` enum in the database schema, but administrative portal screens are planned for future enterprise builds.

---

## 5. How does this feature work?
1. The user visits the application. If `sessionStorage` lacks valid credentials, [App.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/App.jsx#L174) renders [LoginPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/LoginPage.jsx).
2. The user toggles between **Sign In** and **Create Account**. During registration, they select their role (`Patient`, `Caregiver`, or `Doctor`).
3. For doctors, registration exposes clinical input fields: specialization, clinic name, city, consultation fee, and years of experience.
4. On submission, the client calls `POST /api/auth/signup` or `POST /api/auth/login`.
5. The backend validates email syntax, enforces minimum 8-character passwords, hashes new passwords using bcrypt (10 rounds), and issues a signed JSON Web Token with a 7-day expiration.
6. For newly registered doctors, the server automatically provisions their `Doctor` profile and default `DoctorAvailability` schedule.
7. The client stores the JWT in `sessionStorage.setItem('neuroguard.token', token)` and user metadata in `neuroguard.user`.
8. Future requests include the token in the `Authorization: Bearer <TOKEN>` header.

---

## 6. Frontend implementation
- **Source Files:**
  - [LoginPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/LoginPage.jsx): Sign-in/Sign-up forms, role toggle radio group, demo account autofill buttons (`fillDemo`).
  - [api.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/api.js): `api.login()`, `api.signup()`, `setAuthToken()`, `getAuthToken()`, `clearAuthToken()`.
  - [App.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/App.jsx): Session restoration hook `loadSession()`, `handleLogin()`, `handleLogout()`, and `neuroguard:unauthorized` event listener.
- **State Management:**
  - `mode`: `'signin'` vs `'signup'`.
  - `role`: `'patient'`, `'caregiver'`, or `'doctor'`.
  - `busy`: Disables submit buttons and renders spinner during network calls.
  - `error`: User-facing validation or server error messages.
- **Error States:** Handles offline backend (`TypeError`), HTTP 401 invalid credentials, HTTP 409 duplicate email, and HTTP 400 password length violations.

---

## 7. Backend implementation
- **Source Files:**
  - [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L66-L230): Route handlers for `POST /api/auth/login` and `POST /api/auth/signup`.
  - [auth.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/middleware/auth.js):
    - `generateToken(payload)`: Signs JWT using `JWT_SECRET`.
    - `verifyToken(token)`: Verifies signature and expiration.
    - `authenticateToken(req, res, next)`: Express middleware extracting Bearer token.
    - `requireRole(...allowedRoles)`: Middleware checking `req.user.role`.
    - `requireSelfOrDoctor(req, res, next)`: Middleware enforcing IDOR boundaries.
    - `isCaregiverAuthorized(caregiverUserId, patientId)`: Helper validating caregiver-patient links.
- **Password Verification:**
  ```javascript
  let isPasswordValid = false;
  if (match.passwordHash) {
    isPasswordValid = await bcrypt.compare(password, match.passwordHash);
  } else if (match.password) {
    isPasswordValid = match.password === password;
  }
  ```

---

## 8. Database implementation
- **Models Used:** [User.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/User.js), [Doctor.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/Doctor.js), [DoctorAvailability.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/DoctorAvailability.js).
- **User Schema Fields:**
  - `id` (String, unique, indexed): `user-<id>` or `doctor-<id>`.
  - `email` (String, unique, lowercase, indexed).
  - `passwordHash` (String, required).
  - `role` (String, enum: `['patient', 'doctor', 'caregiver']`).
  - `authorizedCaregivers` ([String]): Array of permitted caregiver IDs.
  - `caregiverPatients` ([String]): Array of managed patient IDs.
- **In-Memory Store:** `credentials` array in [store.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/store.js#L118-L125) holds pre-hashed bcrypt credentials for offline operation.

---

## 9. Algorithms and technical logic
1. **Password Hashing:**
   $$\text{Hash} = \text{bcrypt.hash}(\text{password}, 10)$$
2. **JWT Signing:**
   $$\text{Token} = \text{jwt.sign}(\{ \text{userId}, \text{role}, \text{name}, \text{email} \}, \text{JWT\_SECRET}, \{ \text{expiresIn}: \text{'7d'} \})$$
3. **Caregiver Authorization Logic:**
   $$\text{Authorized} \iff (\text{caregiverId} \in \text{patient.authorizedCaregivers}) \lor (\text{patientId} \in \text{caregiver.caregiverPatients})$$

---

## 10. Data flow
```
User Enters Credentials 
  ──> api.login() 
  ──> POST /api/auth/login 
  ──> Match credentials array / Mongo User 
  ──> bcrypt.compare() 
  ──> jwt.sign() 
  ──> JSON { user, token } 
  ──> sessionStorage.setItem('neuroguard.token') 
  ──> App.jsx sets authUser & view
```

---

## 11. External dependencies
- `bcryptjs` (^3.0.3): Native JavaScript implementation of the Blowfish-based bcrypt password-hashing function.
- `jsonwebtoken` (^9.0.3): Implementation of RFC 7519 JSON Web Tokens for identity assertion.

---

## 12. Security and privacy
- Passwords are never stored in plaintext in MongoDB.
- Tokens expire automatically after 7 days.
- User email addresses are normalized to lowercase and trimmed to prevent spoofing.
- The `sessionStorage` mechanism ensures tokens do not persist on shared hospital or clinic computers once the browser tab is closed.

---

## 13. Limitations
- Refresh token rotation is not yet implemented; tokens are valid until the 7-day expiration.
- Password reset via email verification link is currently stubbed (requires an external SMTP provider like SendGrid).
- Multi-factor authentication (TOTP/SMS) is not yet integrated.

---

## 14. Example execution
**Patient Login:**
1. Raj Kumar opens NeuroGuard and clicks the demo button *"Patient — Raj Kumar"*.
2. Form fills with `raj@neuroguard.demo` and `patient123`.
3. POST request sent to `/api/auth/login`.
4. Server validates hash and responds with JWT and `{ id: 'user-raj', role: 'patient', name: 'Raj Kumar' }`.
5. Frontend sets active view to `'dashboard'`.

---

## 15. Important technical interview questions

#### Q1: Why was `bcryptjs` selected over native `bcrypt`?
**Answer:** `bcryptjs` is written entirely in pure JavaScript with zero native C++ compilation dependencies (`node-gyp`). This guarantees cross-platform compatibility across various operating systems, CI/CD runners, and developer environments without compilation failures.

#### Q2: Where is the JWT stored on the client and what are the security trade-offs?
**Answer:** It is stored in `window.sessionStorage`. The trade-off: `sessionStorage` is isolated per browser tab and automatically clears when the tab closes, which is safer on shared medical devices than `localStorage`. However, like `localStorage`, it is accessible to JavaScript running in the same origin, meaning protection against Cross-Site Scripting (XSS) is paramount.

#### Q3: How does NeuroGuard prevent Insecure Direct Object References (IDOR)?
**Answer:** Via the `requireSelfOrDoctor` middleware in [auth.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/middleware/auth.js#L63-L97). It inspects `req.user.userId` from the verified JWT and compares it to `req.params.id`. If a patient attempts to query another patient's ID, the request is rejected with HTTP 403 Forbidden.

#### Q4: What happens if a doctor attempts to query a patient who is assigned to a different doctor?
**Answer:** In [auth.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/middleware/auth.js#L87-L94), the middleware checks `patient.doctorId !== req.user.userId`. If the patient is assigned to another clinician, the server returns HTTP 403 Forbidden: *"patient is assigned to another clinician"*.

#### Q5: How is a caregiver authorized to view a patient's data?
**Answer:** Through `isCaregiverAuthorized()`. It verifies bidirectional relationships: either the patient's record lists the caregiver's ID in `authorizedCaregivers`, or the caregiver's profile lists the patient in `caregiverPatients`. If neither matches, access is denied.

#### Q6: How does the application handle expired authentication tokens?
**Answer:** When any API request fails with HTTP 401, [api.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/api.js#L42-L45) dispatches a `neuroguard:unauthorized` custom DOM event. [App.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/App.jsx#L67-L74) catches this event, executes `handleLogout()`, clears `sessionStorage`, and notifies the user with a session expiration toast.

#### Q7: Why are doctors automatically provisioned a clinic profile upon signup?
**Answer:** In [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L151-L201), when a user signs up with `role: 'doctor'`, the backend immediately creates their associated `Doctor` and `DoctorAvailability` records. This ensures new clinicians immediately appear in patient discovery searches with active booking slots.

#### Q8: Can a user arbitrarily escalate their privileges to doctor during signup?
**Answer:** The signup route validates `role` against `['patient', 'doctor', 'caregiver']`. In the current prototype, doctor signup is open for testing. In an enterprise release, doctor accounts would require medical license number verification (e.g., MCI/NMC registration) and clinical admin approval before activation.

#### Q9: What happens to credentials during the in-memory fallback mode?
**Answer:** The backend uses the `credentials` array in [store.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/store.js), where all default passwords (`patient123`, `doctor123`, `caregiver123`) are pre-hashed using `bcrypt.hashSync()`. New registrations push into this array in memory.

#### Q10: How are JWT secrets managed across development and production?
**Answer:** The backend checks `process.env.JWT_SECRET`. If undefined in development, it falls back to a development string with a warning in [auth.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/middleware/auth.js#L3). In production, an environment variable must be provided.

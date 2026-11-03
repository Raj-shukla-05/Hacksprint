# Security Architecture & Threat Defense

## 1. Defense-in-Depth Model

NeuroGuard AI implements a multi-layered security architecture designed to safeguard protected health information (PHI) and clinical operations across the client, network, application, and persistence tiers:

```
+-----------------------------------------------------------------------------------+
|                        NEUROGUARD SECURITY TIERS                                  |
+-----------------------------------------------------------------------------------+
|  1. CLIENT EDGE:      On-Device WASM • Zero-Video RAM Discard • sessionStorage     |
|  2. NETWORK GATEWAY:  CORS Origin Filter • Helmet Headers • Payload Limits (256KB)|
|  3. AUTHENTICATION:   Bcrypt (10 Salt Rounds) • 7-Day Signed JWTs                 |
|  4. ACCESS CONTROL:   Role-Based Authorization • IDOR Prevention • Caregiver Auth |
|  5. THREAT MITIGATION:Sliding-Window Rate Limiting • Mutex Slot Locks             |
|  6. DATA AUDIT:       Explicit Report Consent • Immutable Access Audit Trail      |
+-----------------------------------------------------------------------------------+
```

---

## 2. Threat Vector Analysis & Implemented Controls

| Threat Vector | OWASP Top 10 Reference | Potential Impact | NeuroGuard Implemented Defense |
| :--- | :--- | :--- | :--- |
| **Insecure Direct Object References (IDOR)** | A01:2021 — Broken Access Control | Patient viewing another patient’s clinical records or doctor modifying another doctor’s schedule. | `requireSelfOrDoctor` middleware enforces `req.user.userId === req.params.id`. Doctor access is restricted strictly to assigned patients via `patient.doctorId === req.user.userId`. |
| **Unauthorized Privilege Escalation** | A01:2021 — Broken Access Control | Patient confirming appointments, assigning protocols, or accessing doctor availability configuration. | `requireRole('doctor')` and `requireRole('patient', 'caregiver')` middleware strictly validate the decoded JWT role claim. |
| **Double-Booking Race Condition** | A04:2021 — Insecure Design | Concurrent patient requests simultaneously reserving the same consultation slot. | Two-tier atomic defense: (1) In-memory mutex `activeBookingLocks = new Set()` rejects collisions with HTTP 409; (2) MongoDB partial unique compound index on `{ doctorId: 1, date: 1, startTime: 1 }`. |
| **Sensitive Video Data Exposure** | A02:2021 — Cryptographic Failures | Interception or exposure of raw webcam footage from patient homes. | Absolute data minimization: 100% of computer vision occurs locally in WebAssembly. Raw video frames are rendered to an HTML5 canvas and immediately discarded; zero video bytes are uploaded. |
| **Denial of Service (DoS) via Payload Flooding** | A05:2021 — Security Misconfiguration | Server memory exhaustion caused by oversized JSON payloads. | `express.json({ limit: '256kb' })` rejects oversized request bodies with HTTP 413. |
| **Brute-Force Slot Hoarding** | A04:2021 — Insecure Design | Automated bots repeatedly booking up a specialist's calendar slots. | Sliding-window `bookingRateLimiter` restricts bookings to 15 requests per minute per IP/user. |
| **Prompt Injection Attacks** | A03:2021 — Injection | Malicious input manipulating Gemini into generating clinical diagnoses or harmful medical advice. | Server-side `sanitizeFindings()` truncates user details to 500 characters, isolates the input from system prompts, and sets `temperature: 0.2`. |
| **Unauthorized Caregiver Access** | A01:2021 — Broken Access Control | Caregiver booking visits or viewing records of unrelated patients. | Bidirectional `isCaregiverAuthorized()` verifies that the caregiver's ID is explicitly present in the patient's `authorizedCaregivers` array. |
| **Report Access Snooping** | A01:2021 — Broken Access Control | Attending clinician viewing a report after patient has revoked permission. | `getSharedReport()` explicitly verifies `record.status !== 'revoked'` and appends every view event to an immutable `accessAuditLog`. |

---

## 3. Cryptographic Implementation Details

### Password Hashing
- **Algorithm:** Blowfish-based bcrypt with a work factor of 10 rounds (`bcrypt.hash(password, 10)`).
- **Salt Generation:** Unique 128-bit cryptographically secure pseudorandom salt generated per user.
- **Verification:** Asynchronous `bcrypt.compare(password, hash)` protects against timing attacks.

### Token Architecture
- **Format:** Signed RFC 7519 JSON Web Tokens using HMAC-SHA256 (`HS256`).
- **Secret Management:** Loaded from `process.env.JWT_SECRET`.
- **Payload Claims:**
  ```json
  {
    "userId": "user-raj",
    "role": "patient",
    "name": "Raj Kumar",
    "email": "raj@neuroguard.demo",
    "iat": 1730611200,
    "exp": 1731216000
  }
  ```
- **Lifespan:** Fixed at 7 days (`expiresIn: '7d'`).
- **Client Storage:** Kept in `sessionStorage` (`window.sessionStorage.getItem('neuroguard.token')`) to ensure automatic clearance upon tab or window closure.

---

## 4. Input Sanitization & Data Integrity

1. **Email Normalization:** All emails are converted to lowercase and whitespace-trimmed (`email.trim().toLowerCase()`).
2. **Numeric Boundary Clamping:** Functional assessment scores are strictly constrained between 0 and 100 via `Math.max(0, Math.min(100, Number(score)))`.
3. **Tracking Quality Validation:** The backend rejects any assessment session submission with `validFrames < 5` or `isValid === false`, preventing data pollution from malfunctioning cameras.
4. **State Machine Validation:** Direct status patching to `'completed'` on assignments is blocked by the router; completion requires an assessment session submission.

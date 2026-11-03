# Testing & Verification Guide

## 1. Overview of the Test Suite

The NeuroGuard AI backend features a comprehensive automated test suite consisting of **96 unit, integration, and security tests across 11 test suites**.

The test suite uses Node.js’s **native test runner** (`node:test`) and native assertion library (`node:assert/strict`), eliminating heavy third-party testing dependencies like Jest or Mocha.

```
Total Test Suites:  11
Total Tests:        96
Passed:             95
Skipped:            1 (Live Gemini API test, skipped when GEMINI_API_KEY is not set)
Failed:             0
Execution Duration: ~6.2 seconds
```

---

## 2. Test Suite Catalog

| Test File | Test Suite Name | Test Count | Key Scenarios Covered |
| :--- | :--- | :---: | :--- |
| [appointmentSecurity.test.js](file:///home/piyush/Team Matrix/Hacksprint/backend/test/appointmentSecurity.test.js) | Doctor Appointment Security & Defense | 10 | Unauthenticated 401s, tampered JWTs, vertical privilege escalation, IDOR between patients, caregiver isolation, doctor isolation, status tampering, malformed date rejection, non-existent doctor validation, report sharing IDOR. |
| [appointments.test.js](file:///home/piyush/Team Matrix/Hacksprint/backend/test/appointments.test.js) | Doctor Appointment & Recovery System | 20 | Doctor discovery & search, discrete slot generation, lunch break exclusion, atomic booking, double-booking 409 conflict, caregiver booking, state transitions (confirm, reject, cancel, complete), atomic rescheduling, recovery report preview & sharing, patient consent, report revocation, in-app notifications, schedule blocking, and concurrent booking race-condition simulations. |
| [assignments.test.js](file:///home/piyush/Team Matrix/Hacksprint/backend/test/assignments.test.js) | Doctor-Patient Assignment Workflows | 15 | Protocol creation, instruction validation, unassigned doctor isolation, patient assignment retrieval, transition to in_progress, invalid camera tracking rejection, completed session linkage, doctor review with notes, doctor assignment isolation, non-patient assessment rejection, and persistence mode verification. |
| [auth.test.js](file:///home/piyush/Team Matrix/Hacksprint/backend/test/auth.test.js) | Authentication & Authorization | 10 | Login for seeded patient and doctor, invalid password rejection, email/password validation on signup, duplicate email 409, doctor profile auto-provisioning, caregiver-patient relationship linking, requireRole middleware, and IDOR protection. |
| [geminiService.test.js](file:///home/piyush/Team Matrix/Hacksprint/backend/test/geminiService.test.js) | Gemini Service & Prompt Sanitization | 34 | `buildLocalExplanation` accuracy, single-prior-session framing, persistent decline metric specificity, error diagnostic formatting (400, 401, 403, 404, 429, 5xx), mocked API responses, prompt sanitization (`measured_metrics` whitelist, 500-char detail truncation), and live provider verification. |
| [trendEngine.test.js](file:///home/piyush/Team Matrix/Hacksprint/backend/test/trendEngine.test.js) | Trend Engine Unit Tests | 6 | `mean()` accuracy, `deviation()` percentage deltas, `classify()` monitoring tiers, `personalBaseline()` moving-window logic, `detectPersistentDecline()` 3-session detection, and `buildTrend()` longitudinal formatting. |

---

## 3. Running Tests

### Execute Entire Test Suite
```bash
cd backend
npm test
```

### Run with Detailed Spec Reporter
```bash
cd backend
node --test --test-reporter=spec test/**/*.test.js
```

### Run Focused Security Defense Tests
```bash
cd backend
node --test test/appointmentSecurity.test.js
```

---

## 4. Key Security & Concurrency Verification Test Cases

### 1. Concurrency Simulation Test (Test #20 in `appointments.test.js`)
Simulates two simultaneous HTTP booking requests targeting the identical doctor, date, and 30-minute time slot:
```javascript
const [res1, res2] = await Promise.all([
  request(app).post('/api/appointments').set('Authorization', `Bearer ${patientToken}`).send(payload),
  request(app).post('/api/appointments').set('Authorization', `Bearer ${caregiverToken}`).send(payload),
]);

// Exactly one request must succeed (201) and the other must be rejected (409 Conflict)
const statuses = [res1.status, res2.status].sort();
assert.deepStrictEqual(statuses, [201, 409]);
```

### 2. IDOR Report Security Test (Test #16 in `appointments.test.js`)
Verifies that Doctor B (Dr. Vikram Rao) is blocked with HTTP 403 Forbidden when attempting to view a recovery report authorized specifically for Doctor A (Dr. Priya Nair):
```javascript
const res = await request(app)
  .get(`/api/reports/shared/${shareId}`)
  .set('Authorization', `Bearer ${unrelatedDoctorToken}`);

assert.strictEqual(res.status, 403);
assert.match(res.body.message, /Forbidden.*permission/i);
```

### 3. Tracking Quality Rejection Test (Test in `assignments.test.js`)
Verifies that an assessment session with insufficient body tracking frames (`validFrames < 5` or `isValid: false`) is rejected with HTTP 400 Bad Request, preventing bad camera data from corrupting patient baselines:
```javascript
const res = await request(app)
  .post('/api/assessments')
  .set('Authorization', `Bearer ${patientToken}`)
  .send({
    userId: 'user-raj',
    exerciseType: 'arm_raise',
    score: 85,
    trackingQuality: { isValid: false, validFrames: 2, totalFrames: 100 }
  });

assert.strictEqual(res.status, 400);
assert.match(res.body.message, /insufficient valid body tracking frames/i);
```

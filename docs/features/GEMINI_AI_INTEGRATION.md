# Feature Documentation: Google Gemini AI Integration & Prompt Guardrails

---

## 1. Feature Name
**Google Gemini AI Natural-Language Recovery Explanation Service**

---

## 2. What is this feature?
This feature integrates Google's **Gemini API** (`gemini-3.5-flash-lite`) via backend service [geminiService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/geminiService.js). It takes pre-computed, deterministic functional observations and baseline deltas and translates them into 2–3 concise, empathetic, plain-language sentences for patients and caregivers. The integration enforces strict guardrails, prompt sanitization, timeout management, and a deterministic local fallback engine.

---

## 3. Why was this feature developed?
- **Bridging the Clinical Literacy Gap:** Stroke patients often struggle to understand percentage deltas, standard deviation bands, and joint angles. Gemini translates these quantitative metrics into actionable, understandable English.
- **Empathetic Engagement:** Provides encouraging, non-judgmental reinforcement of micro-improvements, motivating patients to maintain daily rehabilitation adherence.
- **Strict Non-Diagnostic Safety:** LLMs must never be permitted to diagnose conditions or invent unmeasured findings. The integration acts as a constrained natural-language generator, not a diagnostic engine.

---

## 4. Who uses this feature?
- **Patient:** Reads plain-language insights on their recovery dashboard.
- **Doctor:** Inspects the generated explanation in the patient detail view alongside raw kinematic metrics.

---

## 5. How does this feature work?
1. The client sends pre-computed dashboard findings to `POST /api/explanation`.
2. [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L736-L799) executes `sanitizeFindings()`:
   - Validates the `trend` string.
   - Filters metrics using the `measured_metrics` whitelist (stripping uncollected domains).
   - Truncates user details to 500 characters to prevent prompt injection.
3. [geminiService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/geminiService.js) checks `process.env.GEMINI_API_KEY`:
   - If missing, it immediately executes `buildLocalExplanation()` and returns `{ source: 'local', text }`.
4. If configured, it formats a prompt with strict system instructions (low temperature: 0.2) and queries the Gemini endpoint.
5. An `AbortController` enforces a 15-second timeout (`GEMINI_TIMEOUT_MS`).
6. If the request succeeds, it returns `{ source: 'gemini', text }`. If it fails (rate limit 429, auth 401, timeout, or network error), it logs a sanitized diagnostic message and returns `{ source: 'local-fallback', text: buildLocalExplanation(findings) }`.

---

## 6. Frontend implementation
- **Source Files:**
  - [PatientDashboard.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/PatientDashboard.jsx#L35-L78): `useEffect` calling `api.explanation()`, with loading spinner and source badge (`Gemini AI`, `Local Fallback`, `Personal Baseline Engine`, or `Unavailable`).
  - [DoctorPage.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/DoctorPage.jsx#L137-L165): Fetches and displays explanations in the patient detail drawer.

---

## 7. Backend implementation
- **Source Files:**
  - [geminiService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/geminiService.js): `generateExplanation()`, `buildLocalExplanation()`, and `formatDiagnosticMessage()`.
  - [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L727-L806): `sanitizeFindings()` and `POST /api/explanation`.
- **System Instructions Enforced in Prompt:**
  ```text
  You are an assistive explanation system for NeuroGuard AI, a non-diagnostic functional rehabilitation monitoring platform.
  Explain the structured recovery monitoring observations in 2-3 concise, empathetic, plain-language sentences.
  STRICT RULES:
  1. Only describe metrics that are explicitly listed in "Measured Deviations" below. Do NOT mention movement, balance, speech, or any other metric that is absent from that list.
  2. Never provide a medical diagnosis, medication advice, or determine clinical emergencies.
  3. Never invent measurements or metrics not present in the input.
  4. baseline_sessions is the number of comparable prior sessions used to establish the baseline. If 0 or absent, state clearly that this session is an initial reference baseline and no historical comparison is possible yet.
  5. If baseline_sessions is 1, state that comparison is based on only a single prior session. Never claim confirmed clinical improvement or recovery.
  6. Clearly frame findings as functional rehabilitation observations relative to the personal baseline.
  7. Suggest discussing persistent changes with a doctor or rehabilitation specialist where appropriate.
  ```

---

## 8. Database implementation
- Stateless service: AI prompts and responses are generated on demand and are not stored as standalone collections in MongoDB.

---

## 9. Algorithms and technical logic
1. **Model Endpoint Configuration:**
   $$M = \text{process.env.GEMINI\_MODEL} \text{ (default: 'gemini-3.5-flash-lite')}$$
   $$\text{URL} = \text{https://generativelanguage.googleapis.com/v1beta/models/} + M + \text{:generateContent}$$
2. **Deterministic Local Fallback Engine ([geminiService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/geminiService.js#L15-L64)):**
   - **Initial Reference Session ($N=0$):**
     > *"This session has been recorded as your initial reference point. NeuroGuard will begin tracking meaningful changes once more comparable sessions are available."*
   - **Single Prior Session ($N=1$):**
     > *"Functional check shows preliminary upward change compared with your single prior session (+10% movement). Multiple sessions are required to establish a confirmed trend."*
   - **Persistent Decline:**
     > *"Recent movement (13%) is below the recent personal baseline across the last 5 comparable sessions. Consider reviewing this change with your healthcare professional."*

---

## 10. Data flow
```
Dashboard Metrics 
  ──> sanitizeFindings() 
  ──> Validate Keys & Truncate Details (500 chars) 
  ──> geminiService.generateExplanation() 
  ──> [Check GEMINI_API_KEY]
         ├── Missing ──> buildLocalExplanation() (source: 'local')
         └── Present ──> HTTPS POST with AbortController (15s)
                            ├── Success 200 ──> parse candidate text (source: 'gemini')
                            └── Failure/Timeout ──> buildLocalExplanation() (source: 'local-fallback')
  ──> JSON { source, text } returned to Client
```

---

## 11. External dependencies
- Native Node.js `fetch` (v20+) and `AbortController`.
- Google Gemini REST API v1beta.

---

## 12. Security and privacy
- **Zero API Key Leakage:** The Gemini API key is stored exclusively in `backend/.env` and injected into the backend's server-to-server request via `x-goog-api-key`. It is **never sent to or exposed in the frontend**.
- **Sanitized Logging:** `formatDiagnosticMessage()` logs HTTP status codes and provider errors while explicitly masking credentials, tokens, and patient names.
- **Prompt Injection Defense:** Input strings in `details` are strictly truncated to 500 characters, and raw user prompt inputs are isolated from the system prompt block.

---

## 13. Limitations
- If internet connectivity drops or Gemini API quotas are exceeded, explanations revert to the local rule-based template.
- The model does not retain conversational memory; each explanation request is independent and stateless.

---

## 14. Example execution
**Input Payload:**
```json
{
  "trend": "improving",
  "movement_change": 10,
  "balance_change": 4,
  "baseline_sessions": 5,
  "exercise_type": "arm_raise",
  "measured_metrics": ["movement", "balance"]
}
```
**Gemini API Output:**
```json
{
  "source": "gemini",
  "text": "Your movement is showing positive progress, trending 10% above your recent 5-session baseline with stable balance (+4%). Keep up the consistent check-ins to support your steady rehabilitation progress."
}
```

---

## 15. Important technical interview questions

#### Q1: Which Gemini model is configured and why?
**Answer:** `gemini-3.5-flash-lite` (or `gemini-1.5-flash` via `.env`). The "Flash-Lite" family is optimized for low latency (< 1 second) and high token efficiency, making it ideal for concise text synthesis without high inference costs.

#### Q2: How does the backend prevent the Gemini API key from leaking?
**Answer:** The API key is stored strictly on the server in `process.env.GEMINI_API_KEY`. The frontend communicates only with the backend endpoint `POST /api/explanation`. The browser never interacts with Google's servers directly.

#### Q3: What happens if the Gemini API key is missing or invalid?
**Answer:** In [geminiService.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/services/geminiService.js#L123-L125), if `!apiKey`, the service immediately calls `buildLocalExplanation()` and returns `{ source: 'local', text }`. If an invalid key returns HTTP 401, it logs a sanitized diagnostic and returns `{ source: 'local-fallback', text }`.

#### Q4: How are prompt injection attacks mitigated?
**Answer:** In [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L794-L796), `sanitizeFindings()` truncates any caller-supplied `details` string to 500 characters. Numerical fields are cast using `Number()`, and the system instructions explicitly forbid the model from following external instructions.

#### Q5: Why is `AbortController` used with a 15-second timeout?
**Answer:** If the Gemini API experiences network hanging or slow responses, a 15-second abort prevents Node.js HTTP worker threads from remaining blocked. When aborted, the catch block catches the `AbortError` and immediately returns the local fallback.

#### Q6: How does the system prevent Gemini from making medical diagnoses?
**Answer:** Through strict system instructions: *"Never provide a medical diagnosis, medication advice, or determine clinical emergencies. Suggest discussing persistent changes with a doctor or rehabilitation specialist."* In addition, the temperature is set to a low `0.2` to minimize creative hallucinations.

#### Q7: What is the purpose of `dns.setDefaultResultOrder('ipv4first')`?
**Answer:** In Node.js environments (v18–v22), dual-stack IPv4/IPv6 DNS resolution can cause intermittent 5-second connection delays when resolving `generativelanguage.googleapis.com`. Forcing IPv4-first eliminates these lookup timeouts.

#### Q8: What does the client UI display if the source is `local-fallback`?
**Answer:** The UI badge in [PatientDashboard.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/pages/PatientDashboard.jsx#L240-L247) displays *"Local Fallback"*, ensuring total transparency about whether the explanation came from Gemini or the local rule engine.

#### Q9: Why does `sanitizeFindings()` filter by `measured_metrics`?
**Answer:** If an Arm Raise was performed, balance and speech were not collected. If the client accidentally sent stale balance metrics, `sanitizeFindings()` deletes them, ensuring Gemini only discusses metrics that were actually measured in that session.

#### Q10: Does Gemini calculate the scores or percentages?
**Answer:** **No.** All mathematical scores, deviations, and baseline windows are calculated beforehand by [trendEngine.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/trendEngine.js). Gemini only acts as a plain-language translator of pre-computed numbers.

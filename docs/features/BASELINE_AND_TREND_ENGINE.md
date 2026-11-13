# Feature Documentation: Personal Baseline & Longitudinal Recovery Trend Engine

---

## 1. Feature Name
**Personal Baseline, Longitudinal Moving-Window Analytics & Anomaly Alert Engine**

---

## 2. What is this feature?
The Personal Baseline and Trend Engine is the core statistical intelligence module of NeuroGuard AI ([trendEngine.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/trendEngine.js)). Instead of comparing stroke survivors against generic population averages, it builds a dynamic, personalized baseline for each patient using a 5-session moving window, computes relative percentage deltas, classifies recovery into clinical monitoring tiers, and automatically detects persistent functional decline across consecutive sessions.

---

## 3. Why was this feature developed?
- **The Fallacy of Population Norms:** Post-stroke functional capacity depends on lesion location, stroke severity, pre-existing comorbidities, and baseline fitness. Comparing a hemiparetic patient's range of motion against healthy 20-year-olds is demotivating and clinically invalid.
- **Early Warning for Secondary Complications:** Gradual motor decline (due to spasticity, non-use learned suppression, or medication side effects) is often imperceptible day-to-day. A statistical trend engine flags deviations before severe functional loss occurs.
- **Noise Reduction:** Single-day fluctuations (due to fatigue, poor sleep, or room temperature) are common in stroke recovery. A moving-window baseline smooths daily noise to reveal true recovery trajectories.

---

## 4. Who uses this feature?
- **Patient:** Views their longitudinal progress chart (Day 1 $\rightarrow$ Day 21) and receives explainable alert cards.
- **Doctor:** Relies on the triage engine to order their patient roster so that patients with persistent decline appear first for clinical intervention.

---

## 5. How does this feature work?
1. The backend retrieves the patient's assessment history and sorts it chronologically.
2. `personalBaseline()` isolates the previous $N$ sessions (default $N=5$) and calculates their arithmetic mean.
3. `deviation()` calculates the relative fractional difference between the current session and the baseline.
4. `detectPersistentDecline()` inspects the last 3 consecutive sessions. If all three are below baseline and their average is below 95% of baseline, a **Persistent Deviation** alert is triggered.
5. If persistent decline is absent, `classify()` categorizes the delta into monitoring tiers:
   - Normal: $|\Delta| \le 5\%$
   - Monitor: $5\% < |\Delta| \le 10\%$
   - Significant: $10\% < |\Delta| \le 15\%$
   - Review: $|\Delta| > 15\%$
6. The engine constructs the dashboard summary object and active alerts.

---

## 6. Frontend implementation
- **Source Files:**
  - [TrendChart.jsx](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/frontend/src/components/TrendChart.jsx): Visualizes longitudinal progress using Recharts SVG LineChart with reference bands and tooltip formatting.
  - [ProgressPage.jsx](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/frontend/src/pages/ProgressPage.jsx): Displays overall progress since Day 1, current score, baseline window size, and historical cards.
  - [AlertCard.jsx](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/frontend/src/components/AlertCard.jsx): Renders color-coded alert notifications (`Review recommended` with red badge or `Monitor` with amber badge).

---

## 7. Backend implementation
- **Source Files:**
  - [trendEngine.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/trendEngine.js): Core calculation algorithms.
  - [server.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/server.js#L247-L260): `GET /api/users/:id/trends` and `GET /api/alerts/:id`.
- **Exported Functions in `trendEngine.js`:**
  - `mean(values)`
  - `deviation(current, baseline)`
  - `classify(delta)`
  - `buildTrend(assessments)`
  - `personalBaseline(assessments, field, windowSize)`
  - `detectPersistentDecline(assessments, field)`
  - `buildDashboard(user, assessments)`
  - `createAlert(userId, assessments)`

---

## 8. Database implementation
- Aggregates records from the `Assessment` collection.
- Persists alerts in the `Alert` collection ([Alert.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/models/Alert.js)) or stores them in the `alerts` Map in [store.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/store.js).

---

## 9. Algorithms and Mathematical Formulas

### 1. Moving-Window Personal Baseline
For an assessment series $A = [a_1, a_2, \dots, a_n]$, the baseline for the current session $a_n$ is computed over the previous window $W$ (where $W = \min(n-1, 5)$):
$$\text{Baseline}(a_n) = \frac{1}{|W|} \sum_{i=n-W}^{n-1} \text{score}(a_i)$$

### 2. Relative Deviation Delta
$$\delta = \frac{\text{score}(a_n) - \text{Baseline}}{\text{Baseline}}$$
$$\text{Percentage Delta} = \delta \times 100\%$$

### 3. Persistent Decline Detection Algorithm
A patient is flagged for persistent decline if and only if:
1. Total sessions $n \ge 3$.
2. Every one of the last 3 sessions is strictly below the baseline established by prior sessions:
   $$\forall i \in \{n-2, n-1, n\}, \quad \text{score}(a_i) < \text{Baseline}$$
3. The average of the last 3 sessions is more than 5% below baseline:
   $$\frac{\text{score}(a_{n-2}) + \text{score}(a_{n-1}) + \text{score}(a_n)}{3} < 0.95 \times \text{Baseline}$$

---

## 10. Data flow
```
MongoDB Assessments / store.js 
  ──> Chronological Sort 
  ──> Split: Prior Sessions vs Latest Session 
  ──> personalBaseline(prior, 5) 
  ──> detectPersistentDecline(all) 
  ──> classify(delta) 
  ──> buildDashboard() & createAlert() 
  ──> JSON Response to Client 
  ──> Renders TrendChart & AlertCard
```

---

## 11. External dependencies
- No third-party mathematical libraries required; implemented entirely using native JavaScript array methods and Math functions.

---

## 12. Security and privacy
- Baseline metrics contain zero identifiable demographic variables (such as gender, race, or socio-economic markers).
- Calculations are protected behind `requireSelfOrDoctor` authorization middleware.

---

## 13. Limitations
- Baseline calculations require at least 1 prior session to compute a meaningful delta; on the very first session, delta is 0.
- If a patient has a prolonged gap (e.g., 3 months of hospital readmission), the window still uses the last 5 sessions unless manually reset by a clinician.

---

## 14. Example execution
**Worked Mathematical Example:**
- Historical 5 sessions: `[70, 72, 71, 76, 77]`.
- Baseline Score:
  $$\text{Baseline} = \frac{70 + 72 + 71 + 76 + 77}{5} = \frac{366}{5} = 73.2$$
- Patient records new session: `Score = 79`.
- Deviation Delta:
  $$\delta = \frac{79 - 73.2}{73.2} = \frac{5.8}{73.2} = +0.0792 \implies +7.9\%$$
- Classification: $|\delta| = 7.9\% \implies$ Band is **Monitor** ($\le 10\%$).
- Overall Trend: $\delta \ge +0.03 \implies$ **Improving**.

---

## 15. Important technical interview questions

#### Q1: Why does NeuroGuard use a window size of 5 for personal baselines?
**Answer:** A 5-session window balances sensitivity and stability. A smaller window (e.g., 2 sessions) overreacts to transient daily fatigue, while a larger window (e.g., 20 sessions) adapts too slowly to real functional changes.

#### Q2: What exact conditions trigger a "Persistent deviation" alert?
**Answer:** In [trendEngine.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/trendEngine.js#L42-L49), three conditions must be met: (1) at least 3 historical sessions exist, (2) all 3 recent sessions are lower than the baseline of previous sessions, and (3) the average of those 3 sessions is strictly less than 95% of baseline ($< 0.95 \times \text{baseline}$).

#### Q3: What happens if a patient's baseline is zero?
**Answer:** In [trendEngine.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/trendEngine.js#L6-L9), `deviation(current, baseline)` checks `if (!baseline) return 0;`. This avoids `DivideByZero` errors returning `Infinity` or `NaN`.

#### Q4: How does the trend engine distinguish between improving, declining, and stable trends?
**Answer:** In [trendEngine.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/trendEngine.js#L76), trend classification uses:
- $\text{change} \ge 0.03$ (+3%): **Improving**
- $\text{change} \le -0.05$ (-5%): **Declining**
- Between -5% and +3%: **Stable**

#### Q5: How does the triage roster in `DoctorPage.jsx` use the trend engine?
**Answer:** The roster sorts patients by clinical severity using `STATUS_ORDER`: `review` (0) $\rightarrow$ `monitor` (1) $\rightarrow$ `stable` (2). Patients flagged with persistent decline appear at the top of the clinician's list.

#### Q6: How does the engine handle missing metrics in a session?
**Answer:** In [trendEngine.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/trendEngine.js#L61-L69), `metric(name)` checks `if (raw === undefined || raw === null) return null;`. It returns `null` for uncollected metrics rather than defaulting to zero, preventing false drops in baseline calculations.

#### Q7: Does the trend engine use any non-deterministic machine learning?
**Answer:** No. The trend engine is **100% deterministic mathematical code**. Given the identical array of assessment records, it always produces the identical baseline, delta, and alert classifications.

#### Q8: How is the trend chart in Recharts formatted?
**Answer:** [trendEngine.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/trendEngine.js#L19-L32) formats assessment records into `{ day: 'D1', date: 'Sep 01', score: 70, movement: 68, balance: 64, ... }`, which Recharts renders into continuous SVG paths.

#### Q9: What happens when the "Load decline demo" button is clicked?
**Answer:** In [server.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/server.js#L650-L695), `POST /api/users/:id/demo-decline` injects 5 declining sessions (`[81, 79, 75, 71, 68]`) and sets the patient's alert to `severity: 'review'`, demonstrating real-time alert triggering.

#### Q10: How are rounding errors handled in percentage calculations?
**Answer:** Percentage changes are rounded to one decimal place using `Math.round(change * 1000) / 10`, ensuring clean display values like `+9.7%` without floating-point artifacts (e.g. `9.700000000000003%`).

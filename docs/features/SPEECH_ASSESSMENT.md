# Feature Documentation: Speech Assessment & Phonation Analysis

---

## 1. Feature Name
**Speech Assessment, Acoustic Rate & Phonation Analysis Subsystem**

---

## 2. What is this feature?
This feature provides automated linguistic and acoustic analysis of a patient's vocal performance. It evaluates speech rate (words per minute), pause frequency, and transcription similarity against target standardized clinical phrases (e.g., assessing post-stroke dysarthria or aphasia).

---

## 3. Why was this feature developed?
- **Post-Stroke Dysarthria & Aphasia:** Up to 30% of stroke survivors experience speech impairments (dysarthria, apraxia of speech, or expressive aphasia). Slurred speech, abnormal pauses, and slowed verbal cadence are common clinical indicators.
- **Holistic Recovery Tracking:** Physical recovery involves both gross motor coordination and neurological speech control.
- **Remote Tele-Monitoring:** Enables patients to perform a 30-second reading check at home, providing longitudinal data on speech fluency.

---

## 4. Who uses this feature?
- **Patient:** Speaks a target sentence into their device microphone during assessment check-ins.
- **Doctor / Speech-Language Pathologist:** Reviews speech rate trends, pause counts, and transcription accuracy.

---

## 5. How does this feature work?
1. The patient is presented with an optional reading prompt (e.g. *"The quick brown fox jumps over the lazy dog"*).
2. The client records audio duration and pause events.
3. The client submits the spoken transcript and expected text to `POST /api/speech/analyze`.
4. The backend computes words per minute ($\text{WPM} = \frac{\text{Words}}{\text{Duration} / 60}$) and token similarity using a Jaccard set intersection formula.
5. The backend returns quantitative acoustic and lexical features.
6. The resulting score is incorporated into the patient's longitudinal dashboard under the Speech domain.

---

## 6. Frontend implementation
- **Source Files:**
  - [PatientDashboard.jsx](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/pages/PatientDashboard.jsx#L111): Displays the Speech metric card (value: 84, change: 0%) and checklist item (*"Speech assessment · Optional · ~30 sec"*).
  - [api.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/lib/api.js#L77): Client method `api.speechAnalyze(payload)`.
- **Status:** **PARTIALLY IMPLEMENTED**. The backend analysis engine is fully operational, while browser microphone streaming via the Web Speech API is currently marked as an optional check in the patient UI.

---

## 7. Backend implementation
- **Source Files:**
  - [server.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/server.js#L699-L724): Endpoint `POST /api/speech/analyze` and helper `tokenSimilarity(a, b)`.
  ```javascript
  app.post('/api/speech/analyze', (req, res) => {
    const { transcript = '', expectedText = '', duration = 0, pauseCount = 0 } = req.body || {};
    const words = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
    const expectedWords = expectedText.trim() ? expectedText.trim().split(/\s+/).length : words;
    const normalizedA = transcript.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const normalizedB = expectedText.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const similarity = normalizedB ? Math.round((normalizedA === normalizedB ? 100 : tokenSimilarity(normalizedA, normalizedB)) * 10) / 10 : 0;
    const rate = duration > 0 ? Math.round((words / (duration / 60)) * 10) / 10 : 0;
    res.json({
      speakingDuration: Number(duration),
      pauses: Number(pauseCount),
      speechRate: rate,
      transcriptionSimilarity: similarity,
      wordCount: words,
      expectedWordCount: expectedWords,
    });
  });
  ```

---

## 8. Database implementation
- Speech analysis is currently executed statelessly.
- Derived speech scores are saved as part of the `metrics.speech` field in the `Assessment` collection.

---

## 9. Algorithms and technical logic
1. **Jaccard Token Similarity Formula ([server.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/server.js#L717-L723)):**
   $$A = \text{UniqueTokens}(\text{transcript}), \quad B = \text{UniqueTokens}(\text{expectedText})$$
   $$\text{Similarity} = \frac{|A \cap B|}{|A \cup B|} \times 100$$
2. **Speech Cadence Rate (Words Per Minute):**
   $$\text{SpeechRate} = \frac{\text{WordCount}}{\text{Duration in Seconds} / 60}$$

---

## 10. Data flow
```
Microphone Audio / Transcript 
  ──> POST /api/speech/analyze 
  ──> Regex normalization (strip punctuation) 
  ──> Token set intersection / union 
  ──> Compute WPM speech rate 
  ──> Return JSON { speakingDuration, pauses, speechRate, transcriptionSimilarity } 
  ──> Normalized into Assessment metrics.speech
```

---

## 11. External dependencies
- Built using native Node.js string operations and Set data structures, with zero heavy external C++ audio dependencies.

---

## 12. Security and privacy
- Does not retain raw audio recordings on the server.
- Operates strictly on text transcripts and scalar timing parameters (duration, pause count).

---

## 13. Limitations
- Client-side microphone recording via the Web Speech API is currently a planned module; speech metrics on the dashboard currently rely on seed and demo data.
- The Jaccard token similarity algorithm is unweighted; it treats small grammatical variations with the same weight as significant mispronunciations.

---

## 14. Example execution
**Request:**
```json
POST /api/speech/analyze
{
  "transcript": "the quick brown fox jumped over the dog",
  "expectedText": "the quick brown fox jumps over the lazy dog",
  "duration": 4.5,
  "pauseCount": 1
}
```
**Response:**
```json
{
  "speakingDuration": 4.5,
  "pauses": 1,
  "speechRate": 106.7,
  "transcriptionSimilarity": 77.8,
  "wordCount": 8,
  "expectedWordCount": 9
}
```

---

## 15. Important technical interview questions

#### Q1: Why does NeuroGuard evaluate speech alongside movement in stroke rehab?
**Answer:** Stroke frequently affects middle cerebral artery (MCA) territories that control both the motor strip (causing arm hemiplegia) and language areas (Broca's and Wernicke's areas). Monitoring both provides a more comprehensive view of neurological recovery.

#### Q2: What is the purpose of the `tokenSimilarity` function?
**Answer:** It computes the Jaccard similarity coefficient between the set of unique words in the patient's transcript and the expected clinical reading prompt, returning an accuracy score from 0% to 100%.

#### Q3: How is speech rate (WPM) calculated?
**Answer:** It divides total words spoken by duration in minutes: $\text{words} / (\text{duration} / 60)$. Normal conversational speech typically ranges from 120–150 WPM; post-stroke dysarthric speech is often significantly slower (< 80 WPM).

#### Q4: Why does the regex strip punctuation before tokenizing?
**Answer:** `transcript.toLowerCase().replace(/[^a-z0-9\s]/g, '')` ensures that punctuation marks (commas, periods) do not cause false token mismatches between "dog." and "dog".

#### Q5: Is raw audio recorded or stored on the backend?
**Answer:** No. In accordance with data minimization principles, no audio WAV or MP3 files are uploaded or stored. Only timing and transcript metrics are processed.

#### Q6: Why is speech marked as optional in the patient dashboard checklist?
**Answer:** Stroke survivors with severe motor deficits may have intact speech, while non-verbal patients with expressive aphasia may find speech tests frustrating. Making it optional prevents speech difficulty from blocking motor assessments.

#### Q7: What happens if `duration` is 0?
**Answer:** The server checks `duration > 0 ? Math.round(...) : 0` to prevent division-by-zero errors (`Infinity` or `NaN`).

#### Q8: What speech-related metrics are sent to Gemini?
**Answer:** If measured, only the relative baseline deviation (`speech_change: +2%`) is sent. If speech was not measured in that session, the key is omitted entirely to prevent hallucinations.

#### Q9: How could speech analysis be improved in future builds?
**Answer:** By incorporating acoustic feature extraction (jitter, shimmer, fundamental frequency variation) and phoneme-level alignment via Kaldi or Whisper on-device models.

#### Q10: How does the system distinguish a valid zero speech score from an unmeasured session?
**Answer:** If speech was not assessed, the `speech` key is deleted from the `metrics` object in [server.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/server.js#L575). The frontend treats `undefined` as unmeasured, whereas `0` represents an attempted session with zero score.

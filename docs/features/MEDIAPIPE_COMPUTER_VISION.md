# Feature Documentation: MediaPipe Computer Vision & Pose Pipeline

---

## 1. Feature Name
**MediaPipe Tasks Vision Edge Pose Landmarker & Coordinate Pipeline**

---

## 2. What is this feature?
This feature implements real-time, browser-side computer vision tracking using Google’s **MediaPipe Tasks Vision** library (`@mediapipe/tasks-vision`). Running directly inside the client browser via WebAssembly (WASM) and hardware-accelerated WebGL GPU delegates, it detects human body topology and extracts 33 3-dimensional Cartesian landmark coordinates at 30 to 60 frames per second without transmitting video frames over the network.

---

## 3. Why was this feature developed?
- **Absolute Privacy (Zero Video Transmission):** Medical video feeds of stroke survivors inside their homes present significant legal, ethical, and privacy vulnerabilities. Running the computer vision model on the edge ensures raw video never leaves the device's volatile memory.
- **Low Latency & High Frame Rate:** Edge WASM execution eliminates network latency, enabling instant visual feedback, live repetition state machines, and real-time skeleton overlay rendering.
- **Standard Hardware Compatibility:** Works on any commodity laptop, tablet, or smartphone webcam without requiring specialized depth cameras (e.g. Kinect) or wearable motion sensors.

---

## 4. Who uses this feature?
- **Patient:** Interacts directly with the camera during assessment sessions.

---

## 5. How does this feature work?
1. The user clicks *"Start camera check"*. [CameraAssessment.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/CameraAssessment.jsx) requests webcam access via `navigator.mediaDevices.getUserMedia()`.
2. The browser loads local MediaPipe WASM binaries from `/mediapipe/wasm` using `FilesetResolver.forVisionTasks()`.
3. `createPoseLandmarker()` in [pose.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/pose.js) initializes the `PoseLandmarker` using the local model asset `/models/pose_landmarker_lite.task`.
4. It attempts GPU delegation (`delegate: 'GPU'`); if WebGL initialization throws an error, it falls back to CPU delegation.
5. A continuous `requestAnimationFrame(processFrame)` loop feeds video frames to `landmarker.detectForVideo(video, timestamp)`.
6. MediaPipe returns 33 landmarks. [pose.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/pose.js#L106-L140) renders the skeletal connections to an HTML5 overlay canvas.
7. Kinematic assessment functions (`armRaiseFrame`, `sitToStandFrame`, `seatedReachFrame`) extract specific landmark subsets to calculate joint angles and reps.

---

## 6. Frontend implementation
- **Source Files:**
  - [pose.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/pose.js): Model initialization, landmark index mapping, trigonometry helpers (`angle`, `midpoint`, `visiblePoint`), and canvas rendering (`drawSkeleton`).
  - [CameraAssessment.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/CameraAssessment.jsx): Video stream lifecycle, frame loop, camera permissions, live metrics, and session completion.
- **Local Assets in `frontend/public/`:**
  - `mediapipe/wasm/vision_wasm_internal.wasm`
  - `mediapipe/wasm/vision_wasm_internal.js`
  - `mediapipe/wasm/vision_wasm_module_internal.wasm`
  - `mediapipe/wasm/vision_wasm_nosimd_internal.wasm`
  - `models/pose_landmarker_lite.task` (~5.5MB TensorFlow Lite model)
- **Key Methods:**
  - `createPoseLandmarker()`: Loads WASM files and builds PoseLandmarker instance.
  - `detectForVideo(videoElement, timestamp)`: Processes a single video frame.
  - `drawSkeleton(ctx, video, landmarks)`: Draws 14 anatomical connections and joint nodes on an HTML5 2D canvas.

---

## 7. Backend implementation
- The backend has **zero involvement** in video frame processing or landmark detection.
- It receives only aggregated numerical metrics and tracking quality summaries via `POST /api/assessments`.
- [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L540-L546) enforces a strict validation rule:
  ```javascript
  const quality = trackingQuality || {};
  if (quality.isValid === false || (quality.validFrames !== undefined && quality.validFrames < 5)) {
    return res.status(400).json({
      message: 'Assessment rejected: insufficient valid body tracking frames detected.',
    });
  }
  ```

---

## 8. Database implementation
- The `Assessment` schema in [Assessment.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/models/Assessment.js) stores tracking metadata:
  ```javascript
  trackingQuality: {
    validFrames: { type: Number, default: 0 },
    totalFrames: { type: Number, default: 0 },
    trackingRatio: { type: Number, default: 1 },
    qualityWarning: { type: String, default: null },
    isValid: { type: Boolean, default: true },
  }
  ```

---

## 9. Algorithms and technical logic

### 1. 3D Landmark Coordinate Representation
MediaPipe outputs coordinates normalized between $0.0$ and $1.0$:
- $x$: Horizontal position (0.0 = left edge, 1.0 = right edge).
- $y$: Vertical position (0.0 = top edge, 1.0 = bottom edge).
- $z$: Relative depth coordinate (smaller values represent points closer to camera).
- $\text{visibility}$: Confidence score ($0.0 \text{ to } 1.0$) indicating whether the landmark is in frame and not occluded.

### 2. Landmark Indices Used ([pose.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/pose.js#L57-L71))
```javascript
export const LANDMARKS = {
  nose: 0,
  leftShoulder: 11,  rightShoulder: 12,
  leftElbow: 13,     rightElbow: 14,
  leftWrist: 15,     rightWrist: 16,
  leftHip: 23,       rightHip: 24,
  leftKnee: 25,      rightKnee: 26,
  leftAnkle: 27,     rightAnkle: 28,
};
```

### 3. Joint Angle Trigonometry Formula
Given three landmark points $A, B, C$ where $B$ is the joint vertex:
$$\vec{u} = A - B = (A_x - B_x, A_y - B_y), \quad \vec{v} = C - B = (C_x - B_x, C_y - B_y)$$
$$\cos \theta = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|} = \frac{u_x v_x + u_y v_y}{\sqrt{u_x^2 + u_y^2} \sqrt{v_x^2 + v_y^2}}$$
$$\theta = \arccos\left(\text{clamp}(\cos \theta, -1, 1)\right) \times \left(\frac{180}{\pi}\right)$$

---

## 10. Data flow
```
Webcam 
  ──> video.srcObject 
  ──> requestAnimationFrame 
  ──> landmarker.detectForVideo() 
  ──> 33 Pose Landmarks 
  ──> drawSkeleton() (Canvas Render) 
  ──> scoring.js (Angle math & Rep counting) 
  ──> Live UI metric updates 
  ──> Assessment completion 
  ──> Numerical POST /api/assessments
```

---

## 11. External dependencies
- `@mediapipe/tasks-vision` (^0.10.22): Official Google MediaPipe WebAssembly vision bundle.

---

## 12. Security and privacy
- **Zero Cloud Video Ingestion:** Web camera frames are held in volatile browser textures and destroyed immediately following landmark extraction.
- **Permission Boundary:** Uses the browser's standard `navigator.mediaDevices.getUserMedia()` API, prompting the user for explicit camera consent each time.
- **Audio Disabled:** Video stream requested with `audio: false` during kinematic sessions.

---

## 13. Limitations
- Accuracy degrades in dim lighting conditions or if the patient wears loose clothing that obscures joint landmarks.
- Camera positioning requires full visibility of shoulders, elbows, and wrists for upper-limb exercises, and hips, knees, and ankles for sit-to-stand.

---

## 14. Example execution
1. Raj Kumar clicks *"Start camera check"* for Arm Raise.
2. MediaPipe loads from `/mediapipe/wasm` in ~800ms.
3. GPU pipeline initializes; camera turns on.
4. Green skeleton overlay aligns with Raj's body.
5. As Raj raises both arms, shoulder elevation updates from 50% to 92% in real time.
6. The skeleton overlay draws 14 connection lines and 12 joint circles.

---

## 15. Important technical interview questions

#### Q1: What is the difference between MediaPipe Tasks Vision and older MediaPipe Solutions?
**Answer:** `@mediapipe/tasks-vision` is the current cross-platform C++ runtime compiled to WebAssembly via Emscripten, replacing the deprecated `@mediapipe/pose` solution. It uses unified `.task` bundles that package model weights, metadata, and graph processing logic into a single binary asset.

#### Q2: Why are the WASM and model files hosted locally rather than using a CDN?
**Answer:** CDNs introduce external network dependencies, CORS issues, and unpredictable latency. Hosting files in `frontend/public/` ensures offline execution, faster load times, and guaranteed availability even in clinical environments with restricted internet access.

#### Q3: What is the difference between `GPU` and `CPU` delegates in MediaPipe?
**Answer:** The GPU delegate compiles WebAssembly shaders that execute matrix operations on the device's graphics card via WebGL 2.0, achieving 60fps with low CPU load. The CPU delegate executes compiled x86/ARM WebAssembly on the processor (optionally using SIMD instructions), which is slightly slower (25–35fps) but works reliably on machines without WebGL support.

#### Q4: How does `requestAnimationFrame` pass timestamps to `detectForVideo`?
**Answer:** MediaPipe's `detectForVideo(videoElement, timestamp)` requires a monotonically increasing integer timestamp in milliseconds. [CameraAssessment.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/CameraAssessment.jsx#L70-L80) passes the DOMHighResTimeStamp provided by `requestAnimationFrame`, ensuring accurate internal Kalman smoothing across successive frames.

#### Q5: How does the system handle poor lighting or occluded limbs?
**Answer:** Every landmark includes a `visibility` property (0.0 to 1.0). In [pose.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/pose.js#L102-L104), `visiblePoint(point, threshold = 0.5)` verifies that visibility is at least 0.5. If required landmarks drop below this threshold, the frame is marked `{ ready: false }` and excluded from scoring.

#### Q6: Does MediaPipe perform the clinical assessment scoring?
**Answer:** **No.** MediaPipe is solely an edge computer vision feature extractor that outputs 3D coordinates. All repetition state machines, range-of-motion calculations, symmetry metrics, and clinical scoring formulas are implemented independently in [scoring.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/scoring.js).

#### Q7: How does NeuroGuard prevent memory leaks during prolonged camera tracking?
**Answer:** [CameraAssessment.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/CameraAssessment.jsx#L37-L40) implements an unmount cleanup effect that cancels the active animation frame (`cancelAnimationFrame`) and stops all tracks on the active `MediaStream` (`track.stop()`). Furthermore, the frame buffer (`framesRef.current`) is capped at 450 frames via a sliding window (`frames.shift()`).

#### Q8: What coordinate system does MediaPipe use for landmarks?
**Answer:** Normalized coordinates where $(0,0)$ is the top-left corner and $(1,1)$ is the bottom-right corner. The $z$-axis represents depth relative to the midpoint of the hips, with negative values being closer to the camera.

#### Q9: What happens if camera permission is denied by the user?
**Answer:** The `navigator.mediaDevices.getUserMedia` promise rejects with a `NotAllowedError`. [CameraAssessment.jsx](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/components/CameraAssessment.jsx#L63-L67) catches this error and displays an informative banner: *"Camera permission was blocked. Allow camera access and try again."*

#### Q10: Why does the system reject assessment submissions with fewer than 5 valid frames?
**Answer:** To prevent users from gaming the system or submitting invalid sessions caused by a malfunctioning webcam. In [server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js#L540-L545), sessions with `validFrames < 5` are rejected with HTTP 400 Bad Request to protect baseline integrity.

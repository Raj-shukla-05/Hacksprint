# Mathematical Algorithms, Formulas & Biomechanical Logic

This document catalogs every mathematical formula, kinematic rule, and statistical algorithm implemented in NeuroGuard AI.

---

## 1. 2D & 3D Vector Trigonometry ([frontend/src/lib/pose.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/pose.js))

### Joint Interior Angle Formula
Calculates the interior 2D angle formed by three landmarks $A$, $B$ (vertex), and $C$:
$$\vec{u} = A - B = (A_x - B_x, A_y - B_y), \quad \vec{v} = C - B = (C_x - B_x, C_y - B_y)$$
$$\vec{u} \cdot \vec{v} = u_x v_x + u_y v_y, \quad \|\vec{u}\| = \sqrt{u_x^2 + u_y^2}, \quad \|\vec{v}\| = \sqrt{v_x^2 + v_y^2}$$
$$\cos \theta = \text{clamp}\left(\frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|}, -1, 1\right)$$
$$\theta = \arccos(\cos \theta) \times \left(\frac{180}{\pi}\right)$$

### Anatomical Midpoint Formula
$$\text{midpoint}(A, B) = \left( \frac{A_x + B_x}{2}, \frac{A_y + B_y}{2}, \frac{A_z + B_z}{2} \right)$$

---

## 2. Exercise Kinematic Formulas ([frontend/src/lib/scoring.js](file:///home/piyush/Team Matrix/Hacksprint/frontend/src/lib/scoring.js))

### A. Arm Raise Protocol
1. **Vertical Elevation Metric:**
   $$\text{Elev}_{\text{side}} = \text{clamp}\left((\text{Shoulder}_y - \text{Wrist}_y) \times 120 + 50, 0, 100\right)$$
   *Note: In screen space, $y=0$ is at the top. When the wrist rises above the shoulder, $(\text{Shoulder}_y - \text{Wrist}_y) > 0$.*
2. **Bilateral Symmetry Score:**
   $$\text{Symmetry} = \text{clamp}(100 - |\text{Elev}_{\text{left}} - \text{Elev}_{\text{right}}| \times 1.2, 0, 100)$$
3. **Elbow Extension Angle Score:**
   $$\text{Extension} = \text{clamp}\left(100 - \left|180 - \frac{\text{Angle}_{\text{leftElbow}} + \text{Angle}_{\text{rightElbow}}}{2}\right| \times 1.15, 0, 100\right)$$
4. **Range of Motion (ROM):**
   $$\text{ROM} = \frac{(\max(\text{Elev}_L) - \min(\text{Elev}_L)) + (\max(\text{Elev}_R) - \min(\text{Elev}_R))}{2}$$
   $$\text{RangeScore} = \text{clamp}\left(\frac{\text{ROM}}{65} \times 100, 0, 100\right)$$
5. **Repetition Score (Target $T=5$):**
   $$\text{RepScore} = \text{clamp}\left(\frac{\text{Reps}}{5} \times 100, 0, 100\right)$$
6. **Composite Arm Raise Score:**
   $$\mathbf{Score}_{\text{ArmRaise}} = 0.38 \times \text{RangeScore} + 0.27 \times \text{Mean}(\text{Symmetry}) + 0.20 \times \text{Mean}(\text{Extension}) + 0.15 \times \text{RepScore}$$

---

### B. Sit-to-Stand Protocol
1. **Bilateral Knee Angle:**
   $$\theta_{\text{knee}} = \frac{\text{angle}(\text{Hip}_L, \text{Knee}_L, \text{Ankle}_L) + \text{angle}(\text{Hip}_R, \text{Knee}_R, \text{Ankle}_R)}{2}$$
2. **Knee Dynamic Range:**
   $$\text{Range} = \max(\theta_{\text{knee}}) - \min(\theta_{\text{knee}})$$
   $$\text{RangeScore} = \text{clamp}\left(\frac{\text{Range}}{70} \times 100, 0, 100\right)$$
3. **Ascent/Descent Postural Stability:**
   $$\text{Stability} = \text{clamp}(100 - (\text{Range} - 80) \times 0.35, 0, 100)$$
4. **Composite Sit-to-Stand Score:**
   $$\mathbf{Score}_{\text{SitToStand}} = 0.45 \times \text{RepScore} + 0.35 \times \text{RangeScore} + 0.20 \times \text{Stability}$$

---

### C. Seated Reach Protocol
1. **Euclidean Reach Distance:**
   $$S = \text{midpoint}(\text{Shoulder}_L, \text{Shoulder}_R), \quad W = \text{midpoint}(\text{Wrist}_L, \text{Wrist}_R)$$
   $$\text{Reach} = \text{clamp}\left(\sqrt{(W_x - S_x)^2 + (W_y - S_y)^2} \times 180, 0, 100\right)$$
2. **Movement Quality Score:**
   $$\text{MovementQuality} = \text{clamp}(\text{Mean}(\text{Reach}) \times 1.15, 0, 100)$$
3. **Kinematic Path Efficiency:**
   $$\text{PathEfficiency} = \text{clamp}(100 - |58 - \text{Mean}(\text{Reach})| \times 0.8, 0, 100)$$
4. **Composite Seated Reach Score:**
   $$\mathbf{Score}_{\text{SeatedReach}} = 0.40 \times \text{MovementQuality} + 0.35 \times \text{PathEfficiency} + 0.25 \times \text{RepScore}$$

---

## 3. Longitudinal Statistical Formulas ([backend/src/trendEngine.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/trendEngine.js))

### 1. Arithmetic Moving-Window Baseline
$$\text{Baseline}(X, W=5) = \frac{1}{|X_{-W}|} \sum_{x \in X_{-W}} x$$

### 2. Fractional Deviation Delta
$$\delta = \frac{x_{\text{current}} - \text{Baseline}}{\text{Baseline}}$$
$$\text{Percentage Delta} = \delta \times 100\%$$

### 3. Monitoring Tier Classification
$$\text{Tier}(|\delta|) = \begin{cases} 
\text{Normal} & \text{if } |\delta| \le 0.05 \\
\text{Monitor} & \text{if } 0.05 < |\delta| \le 0.10 \\
\text{Significant} & \text{if } 0.10 < |\delta| \le 0.15 \\
\text{Review} & \text{if } |\delta| > 0.15 
\end{cases}$$

### 4. Trend Direction Classification
$$\text{Trend}(\delta) = \begin{cases} 
\text{Improving} & \text{if } \delta \ge +0.03 \\
\text{Declining} & \text{if } \delta \le -0.05 \\
\text{Stable} & \text{otherwise} 
\end{cases}$$

---

## 4. Acoustic & Speech Formulas ([backend/src/server.js](file:///home/piyush/Team Matrix/Hacksprint/backend/src/server.js))

### 1. Jaccard Lexical Similarity
$$A = \text{Tokens}(\text{transcript}), \quad B = \text{Tokens}(\text{expectedText})$$
$$\text{Similarity} = \frac{|A \cap B|}{|A \cup B|} \times 100$$

### 2. Speech Rate
$$\text{Rate} = \frac{\text{WordCount}}{\text{Duration in Seconds} / 60} \quad (\text{words per minute})$$

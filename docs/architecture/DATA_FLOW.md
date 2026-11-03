# Data Flow Architecture

This document maps how data moves through the NeuroGuard AI platform across four core operational flows:
1. **Camera Frame Kinematics & Scoring Flow**
2. **Longitudinal Trend & AI Insight Flow**
3. **Appointment Scheduling & Concurrency Flow**
4. **Report Sharing & Access Audit Flow**

---

## 1. Camera Frame Kinematics & Scoring Pipeline

The computer vision pipeline processes video frames on the patient's device without transmitting raw video over the network:

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    participant Browser as Browser MediaDevices API
    participant Video as HTML5 Video Element (Memory)
    participant WASM as MediaPipe WASM Landmarker
    participant Kinematics as scoring.js (Kinematic Rules)
    participant Canvas as HTML5 Canvas Overlay
    participant API as Backend POST /api/assessments
    participant DB as MongoDB / In-Memory Store

    Patient->>Browser: Grant Camera Permissions
    Browser->>Video: Stream MediaStream (1280x720 @ 30fps)
    loop Every requestAnimationFrame
        Video->>WASM: Send Video Frame + Timestamp
        WASM->>Kinematics: Extract 33 3D Pose Landmarks
        Kinematics->>Kinematics: Compute Joint Angles, Elevation & Symmetry
        Kinematics->>Canvas: drawSkeleton(ctx, video, landmarks)
        Kinematics->>Kinematics: Update Repetition State Machine
    end
    Patient->>Kinematics: Click "Finish Assessment"
    Kinematics->>Kinematics: Aggregate Session Score & Tracking Quality
    Kinematics->>API: Transmit Numerical Metrics Only (Bearer JWT)
    API->>API: Validate Tracking Quality (min 5 frames, isValid: true)
    API->>DB: Persist Session Record (MongoDB Assessment / store.js)
    API-->>Patient: Return HTTP 201 Created (Score & Baseline Delta)
```

---

## 2. Longitudinal Trend & AI Explanation Flow

How repeated sessions are aggregated into baseline comparisons and non-diagnostic explanations:

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    participant UI as PatientDashboard.jsx
    participant Server as server.js
    participant Engine as trendEngine.js
    participant Sanitizer as sanitizeFindings()
    participant Gemini as Google Gemini REST API

    Patient->>UI: Opens Dashboard
    UI->>Server: GET /api/users/:id/dashboard (Bearer JWT)
    Server->>Engine: buildDashboard(user, assessments)
    Engine->>Engine: Calculate Personal Baseline (mean of last 5 sessions)
    Engine->>Engine: Calculate Relative Delta: (Current - Baseline) / Baseline
    Engine->>Engine: Classify Trend (Stable / Improving / Declining)
    Engine-->>UI: Return Structured Dashboard JSON
    
    UI->>Server: POST /api/explanation { findings }
    Server->>Sanitizer: Filter metrics by measured_metrics whitelist
    alt Valid Gemini API Key Configured
        Sanitizer->>Gemini: POST generateContent (System Guardrails + Safe Metrics)
        Gemini-->>Server: 2-3 Empathetic Sentences
        Server-->>UI: Return { source: 'gemini', text }
    else Missing Key, Timeout (15s), or HTTP 429
        Server->>Server: Execute buildLocalExplanation(findings)
        Server-->>UI: Return { source: 'local' / 'local-fallback', text }
    end
    UI->>Patient: Render ScoreRing, MetricCards & AI Insight Banner
```

---

## 3. In-Person Appointment Scheduling & Concurrency Flow

How appointment slots are generated and protected against double-booking:

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    participant UI as BookingModal.jsx
    participant API as Backend appointmentRoutes.js
    participant Service as appointmentService.js
    participant Lock as activeBookingLocks (Set Mutex)
    participant DB as MongoDB Appointment Collection
    participant Notif as notificationService.js

    Patient->>UI: Selects Doctor & Date (YYYY-MM-DD)
    UI->>API: GET /api/doctors/:id/availability?date=YYYY-MM-DD
    API->>Service: getAvailableSlots(doctorId, date)
    Service->>Service: Filter working days, breaks & doctor blocked slots
    Service->>DB: Query active bookings for date (pending / confirmed)
    Service-->>UI: Return Discrete Slots (Available vs Reserved)
    
    Patient->>UI: Selects Slot "10:30" & Submits Booking
    UI->>API: POST /api/appointments { doctorId, date, startTime, reason }
    API->>Service: bookAppointment()
    Service->>Lock: Check lockKey ("doc-priya:2026-11-10:10:30")
    alt Lock already held (Concurrent race condition)
        Lock-->>API: Conflict!
        API-->>UI: HTTP 409 Conflict ("Slot currently being processed")
    else Lock free
        Service->>Lock: Acquire Lock
        Service->>DB: Insert with Partial Unique Index ({ doctorId, date, startTime })
        alt MongoDB Duplicate Key (E11000)
            DB-->>Service: Collision error
            Service->>Lock: Release Lock
            Service-->>UI: HTTP 409 Conflict ("Slot already booked")
        else Success
            DB-->>Service: Record Created
            Service->>Notif: Create Booking Notification for Doctor & Patient
            Service->>Lock: Release Lock
            Service-->>UI: HTTP 201 Created (Appointment Details)
        end
    end
```

---

## 4. Recovery Report Sharing & Access Audit Flow

How patient recovery documentation is compiled, authorized, and audited:

```mermaid
sequenceDiagram
    autonumber
    actor Patient
    participant UI as ShareReportModal.jsx
    participant API as reportRoutes.js
    participant Sharing as reportSharingService.js
    actor Doctor
    participant DocUI as DoctorAppointmentsPage.jsx
    participant DB as MongoDB SharedRecoveryReport

    Patient->>UI: Clicks "Share Recovery Report" for Appointment
    UI->>API: GET /api/reports/preview?patientId=:id
    API->>Sharing: compilePatientRecoveryReport(patientId)
    Sharing->>Sharing: Extract genuine scores, baseline deltas & protocol completion
    Sharing-->>UI: Display Report Preview
    
    Patient->>UI: Checks "I explicitly authorize Dr. Priya Nair..." & Submits
    UI->>API: POST /api/reports/share { doctorId, appointmentId }
    API->>Sharing: shareRecoveryReport()
    Sharing->>DB: Persist SharedRecoveryReport (status: 'active', accessAuditLog: [shared])
    Sharing-->>UI: HTTP 201 Created
    
    Doctor->>DocUI: Opens "Recovery Reports" Tab
    DocUI->>API: GET /api/reports/shared/:shareId
    API->>Sharing: getSharedReport(shareId, req.user)
    Sharing->>Sharing: Verify user is recipient doctor AND status !== 'revoked'
    Sharing->>DB: Append Audit Entry: { action: 'viewed', ip, userAgent, timestamp }
    Sharing-->>DocUI: Render Full Recovery Profile & Audit History
```

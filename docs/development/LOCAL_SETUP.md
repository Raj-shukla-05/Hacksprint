# Local Development Setup Guide

This guide provides step-by-step instructions for cloning, configuring, and running the NeuroGuard AI platform on a clean development machine.

---

## 1. System Prerequisites

Before starting, ensure your local development machine has:
- **Node.js:** Version `20.x` or higher (tested on Node v20.18+ / v22+).
- **npm:** Version `10.x` or higher.
- **Git:** Modern Git client.
- **Web Browser:** Modern Chromium-based browser (Google Chrome, Microsoft Edge, Brave) with WebGL 2.0 and WebAssembly enabled.
- **Webcam:** Functional internal or USB webcam (required for MediaPipe pose tracking).
- **MongoDB (Optional):** Local MongoDB server (`mongodb://localhost:27017`) or MongoDB Atlas URI. *If omitted, the backend runs in resilient in-memory mode.*

---

## 2. Step-by-Step Installation

### Step 1: Clone Repository
```bash
git clone <repository-url>
cd "NeuroGuard-AI"
```

### Step 2: Configure & Start Backend Service

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Configure `.env` (optional):
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=
   JWT_SECRET=neuroguard-super-secret-dev-key-2026
   GEMINI_API_KEY=
   GEMINI_MODEL=gemini-3.5-flash-lite
   ```
   *Note: If `MONGODB_URI` and `GEMINI_API_KEY` are left blank, the server automatically defaults to the in-memory database store and deterministic local explanation rules.*
5. Start the backend development server:
   ```bash
   npm run dev
   ```
   *Output:*
   ```text
   [Database] MONGODB_URI not provided. Running in resilient in-memory mode.
   NeuroGuard backend running on http://localhost:5000
   ```

---

### Step 3: Configure & Start Frontend Client

1. Open a second terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *Output:*
   ```text
     VITE v6.0.5  ready in 240 ms

     ➜  Local:   http://localhost:5173/
     ➜  Network: use --host to expose
   ```

---

## 3. Verifying the Installation

1. Open your browser and navigate to `http://localhost:5173`.
2. The NeuroGuard AI login screen should appear.
3. Click the demo button: **"Patient — Raj Kumar"** (`raj@neuroguard.demo` / `patient123`).
4. You should see the Patient Recovery Dashboard showing a Functional Performance score of `79/100`, four domain cards, an active protocol for Arm Raise, and an SVG trend chart.
5. In the top bar, inspect the live status pill:
   - If MongoDB is disconnected: `Session mode · In-memory (DB offline)`.
   - If MongoDB is connected: `System operational · MongoDB connected`.
6. Click *"Start today's check"*, select *"Arm Raise"*, and verify that your webcam activates with the green skeletal landmark overlay rendered on screen.

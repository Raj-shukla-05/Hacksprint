# Comprehensive Dependency Audit & Package Inventory

This document details every direct runtime and development dependency in NeuroGuard AI, explaining its technical purpose, version constraint, and architectural location.

---

## 1. Backend Dependencies (`backend/package.json`)

```json
{
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "helmet": "^8.3.0",
    "jsonwebtoken": "^9.0.3",
    "mongoose": "^8.9.5",
    "nodemon": "^3.1.9"
  }
}
```

| Package | Version | Architectural Role | Used In | Why This Dependency? |
| :--- | :---: | :--- | :--- | :--- |
| **`express`** | `^4.21.2` | Core Web Server Framework | [server.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/server.js) | Lightweight, battle-tested HTTP routing, middleware pipeline, and JSON body parsing. |
| **`bcryptjs`** | `^3.0.3` | Cryptographic Password Hashing | [server.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/server.js), [store.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/store.js) | Pure JavaScript implementation of bcrypt. Eliminates C++ node-gyp compilation issues across different operating systems. |
| **`jsonwebtoken`** | `^9.0.3` | Token Generation & Verification | [auth.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/middleware/auth.js) | Generates and verifies HMAC-SHA256 signed JSON Web Tokens for stateless RBAC. |
| **`mongoose`** | `^8.9.5` | MongoDB Object Data Modeling (ODM) | [db.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/db.js), [models/](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/models/) | Provides schema enforcement, type validation, connection timeouts, and partial unique compound index definitions. |
| **`helmet`** | `^8.3.0` | HTTP Header Hardening | [server.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/server.js) | Protects against well-known web vulnerabilities by setting security-focused HTTP headers (X-DNS-Prefetch-Control, X-Frame-Options, etc.). |
| **`cors`** | `^2.8.5` | Cross-Origin Resource Sharing | [server.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/server.js) | Enables the Vite development client (port 5173) to communicate with the Express backend (port 5000). |
| **`dotenv`** | `^16.4.7` | Environment Configuration | [server.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/backend/src/server.js) | Loads local `.env` variables into `process.env`. |
| **`nodemon`** | `^3.1.9` | Development Process Watcher | `npm run dev` script | Automatically monitors source changes and restarts the backend process during development. |

---

## 2. Frontend Dependencies (`frontend/package.json`)

```json
{
  "dependencies": {
    "@mediapipe/tasks-vision": "^0.10.22",
    "lucide-react": "^0.468.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "recharts": "^2.15.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.5"
  }
}
```

| Package | Version | Architectural Role | Used In | Why This Dependency? |
| :--- | :---: | :--- | :--- | :--- |
| **`react`** | `^19.0.0` | UI Component Framework | Entire frontend | Modern functional components, hooks (`useState`, `useEffect`, `useRef`, `useMemo`), and concurrent DOM reconciliation. |
| **`react-dom`** | `^19.0.0` | DOM Renderer for React | [main.jsx](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/main.jsx) | Renders the React component tree into the browser DOM (`#root`). |
| **`@mediapipe/tasks-vision`** | `^0.10.22` | Computer Vision WebAssembly Engine | [pose.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/lib/pose.js) | Official Google library providing `FilesetResolver` and `PoseLandmarker` for 33 3D body landmark extraction on edge devices. |
| **`recharts`** | `^2.15.0` | Data Visualization Library | [TrendChart.jsx](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/src/components/TrendChart.jsx) | Composable SVG line charts, reference bands, and interactive tooltips for longitudinal recovery trends. |
| **`lucide-react`** | `^0.468.0` | Iconography Suite | Across all components | Clean, lightweight SVG iconography tailored for healthcare, navigation, and status badges. |
| **`vite`** | `^6.0.5` | Next-Generation Frontend Bundler | Build & Dev pipeline | Fast Hot Module Replacement (HMR) during development and Rollup-based production tree-shaking. |
| **`@vitejs/plugin-react`** | `^4.3.4` | Vite React Plugin | [vite.config.js](https://github.com/Raj-shukla-05/NeuroGuard-AI/blob/main/frontend/vite.config.js) | Enables Fast Refresh and JSX transformation via Babel. |

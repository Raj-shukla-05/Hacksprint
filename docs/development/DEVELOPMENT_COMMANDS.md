# Development Commands & npm Scripts Reference

This document catalogs all available npm scripts, development runners, test commands, and build commands across the NeuroGuard AI repository.

---

## 1. Backend Scripts (`backend/package.json`)

Execute these commands from inside the `backend/` directory:

| Command | Script Definition | Purpose & Behavior |
| :--- | :--- | :--- |
| `npm run dev` | `nodemon src/server.js` | Starts the Express server in hot-reloading development mode. Automatically restarts on any file edit in `backend/src/`. |
| `npm start` | `node src/server.js` | Starts the production Node.js server without file watching. |
| `npm test` | `node --test test/**/*.test.js` | Executes the complete backend automated test suite (96 tests across 11 test suites) using Node.js's native high-performance test runner. |

---

## 2. Frontend Scripts (`frontend/package.json`)

Execute these commands from inside the `frontend/` directory:

| Command | Script Definition | Purpose & Behavior |
| :--- | :--- | :--- |
| `npm run dev` | `vite` | Starts the Vite development server with Hot Module Replacement (HMR) at `http://localhost:5173`. |
| `npm run build` | `vite build` | Compiles the React 19 application into optimized, minified production assets in `frontend/dist/`. |
| `npm run preview` | `vite preview` | Serves the production build locally from `frontend/dist/` for pre-deployment inspection. |

---

## 3. Useful Development & Troubleshooting One-Liners

### Run Backend Tests with Verbose Output
```bash
cd backend && node --test --test-reporter=spec test/**/*.test.js
```

### Run a Single Backend Test Suite
```bash
cd backend && node --test test/appointments.test.js
cd backend && node --test test/geminiService.test.js
cd backend && node --test test/trendEngine.test.js
```

### Check Process Ports in Linux/macOS
```bash
# Check if port 5000 is already in use
lsof -i :5000
# Kill process holding port 5000
kill -9 $(lsof -t -i:5000)
```

### Verify Production Bundle Size
```bash
cd frontend && npm run build
ls -lh dist/assets/
```

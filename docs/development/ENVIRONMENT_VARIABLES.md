# Environment Variables Reference

This document provides a comprehensive reference for all configuration variables across the NeuroGuard AI platform.

---

## 1. Backend Environment Variables (`backend/.env`)

| Variable | Type | Required | Default | Description |
| :--- | :---: | :---: | :--- | :--- |
| `PORT` | Number | No | `5000` | The network port the Express server listens on. |
| `NODE_ENV` | String | No | `'development'` | Environment mode (`'development'`, `'test'`, `'production'`). |
| `MONGODB_URI` | String | No | `""` (Empty string) | MongoDB connection string (e.g., `mongodb://localhost:27017/neuroguard` or MongoDB Atlas URI). If omitted or unreachable, backend seamlessly operates in resilient in-memory mode. |
| `JWT_SECRET` | String | No | `'neuroguard-dev-fallback-secret-2026'` | Cryptographic secret key used to sign and verify JSON Web Tokens (HMAC-SHA256). In production, this must be set to a strong random 256-bit secret. |
| `GEMINI_API_KEY` | String | No | `""` (Empty string) | Google Gemini API key used for natural-language recovery explanation generation. If omitted, the service automatically falls back to local deterministic explanations (`source: 'local'`). |
| `GEMINI_MODEL` | String | No | `'gemini-3.5-flash-lite'` | Gemini model identifier. Strips any leading `'models/'` prefix automatically to prevent malformed endpoint paths. Examples: `'gemini-3.5-flash-lite'`, `'gemini-1.5-flash'`. |
| `GEMINI_TIMEOUT_MS` | Number | No | `15000` (15 seconds) | Timeout in milliseconds enforced via `AbortController` before falling back to local explanations. |

---

## 2. Frontend Environment Variables (`frontend/.env`)

| Variable | Type | Required | Default | Description |
| :--- | :---: | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | String | No | `'http://localhost:5000/api'` | Base URL prefix for all backend REST API requests initiated by `frontend/src/lib/api.js`. In production, set to your deployed backend domain (e.g. `https://api.neuroguard.ai/api`). |

---

## 3. Sample Configuration Files

### Backend `.env`
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/neuroguard
JWT_SECRET=e7b4a2d8f9c1e3a5b7d9f2e4a6c8b0d2e4f6a8c0b2d4e6f8a0c2e4b6d8f0a2c4
GEMINI_API_KEY=<YOUR_GEMINI_API_KEY_HERE>
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_TIMEOUT_MS=15000
```

### Frontend `.env`
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

> [!CAUTION]
> **Zero Secrets in Frontend Code:** Never prefix `GEMINI_API_KEY`, `JWT_SECRET`, or `MONGODB_URI` with `VITE_`. Any variable prefixed with `VITE_` is compiled into public client-side JavaScript bundles, exposing your secrets to anyone inspecting the browser source.

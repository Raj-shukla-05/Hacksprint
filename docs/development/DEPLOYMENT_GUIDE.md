# Production Deployment & Hosting Guide

This guide describes how to build, containerize, and deploy the NeuroGuard AI platform to production hosting environments.

---

## 1. Production Architecture Overview

In production, NeuroGuard AI deploys as two decoupled artifacts:
1. **Frontend Client:** Pre-compiled static HTML/JS/CSS assets (including MediaPipe WASM and model files) hosted on a Content Delivery Network (CDN) or edge static host (Vercel, Netlify, Cloudflare Pages, or AWS S3 + CloudFront).
2. **Backend API Service:** Containerized Node.js service running on a managed cloud container platform (AWS ECS, Google Cloud Run, Render, or DigitalOcean App Platform) backed by a managed MongoDB Atlas database cluster.

```mermaid
graph TD
    User["Patient / Doctor Browser"] --> DNS["Cloudflare / Route53 DNS"]
    DNS -->|Static Assets & MediaPipe WASM| CDN["Edge CDN / Static Host\n(Vercel / Netlify / S3)"]
    DNS -->|API Requests (/api/*)| ALB["Application Load Balancer\n(HTTPS TLS 1.3)"]
    ALB --> NodeCluster["Containerized Node.js API\n(Docker on Cloud Run / ECS)"]
    NodeCluster --> Atlas[("MongoDB Atlas Cluster\n(Replica Set with TLS)")]
    NodeCluster --> Gemini["Google Gemini API\n(v1beta Secure Gateway)"]
```

---

## 2. Frontend Production Build

1. Set the production backend API URL in `frontend/.env.production`:
   ```env
   VITE_API_BASE_URL=https://api.neuroguard.ai/api
   ```
2. Build the optimized static assets:
   ```bash
   cd frontend
   npm run build
   ```
3. The compiled output is written to `frontend/dist/`.
   - `dist/index.html` (~0.57 KB)
   - `dist/assets/index-*.css` (~40 KB)
   - `dist/assets/index-*.js` (~889 KB, ~253 KB gzip)
   - `dist/mediapipe/wasm/*` (WASM binaries)
   - `dist/models/pose_landmarker_lite.task` (TFLite model)
4. Upload `frontend/dist/` to your static hosting provider.

> [!IMPORTANT]
> **MIME Types for WASM:** Ensure your web server or CDN serves `.wasm` files with the `Content-Type: application/wasm` header.

---

## 3. Backend Production Containerization (Docker)

Create a `backend/Dockerfile`:

```dockerfile
# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

USER node
CMD ["node", "src/server.js"]
```

Build and run the container locally:
```bash
docker build -t neuroguard-backend ./backend
docker run -p 5000:5000 \
  -e MONGODB_URI="mongodb+srv://<db_user>:<db_password>@cluster.mongodb.net/neuroguard" \
  -e JWT_SECRET="your-256-bit-production-secret" \
  -e GEMINI_API_KEY="your-gemini-key" \
  neuroguard-backend
```

---

## 4. Production Checklist

- [ ] `NODE_ENV=production` set on the backend.
- [ ] Strong random 256-bit `JWT_SECRET` generated (e.g., `openssl rand -hex 32`).
- [ ] Production `MONGODB_URI` pointing to a replicated MongoDB Atlas cluster with TLS enabled.
- [ ] Gemini API key configured with quota alerts and budget limits in Google Cloud Console.
- [ ] CORS origin restricted in [server.js](https://github.com/Raj-shukla-05/NeuroGuard/blob/main/backend/src/server.js#L32) to your actual frontend domain (`https://app.neuroguard.ai`).
- [ ] HTTPS / SSL certificates enforced across both frontend and backend (required for browser webcam access).

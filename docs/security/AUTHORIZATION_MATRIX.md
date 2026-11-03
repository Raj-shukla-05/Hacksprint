# Granular Role-Based Access Control (RBAC) Matrix

This document defines the access control boundaries enforced across all routes, actions, and resources in NeuroGuard AI.

---

## 1. Access Control Matrix

| Endpoint / Action | Method | Unauthenticated | Patient (Self) | Patient (Other) | Doctor (Assigned) | Doctor (Unassigned) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `/api/health` | GET | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** |
| `/api/auth/login` | POST | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** |
| `/api/auth/signup` | POST | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** |
| `/api/users/:id/dashboard` | GET | DENY (401) | **ALLOW** | DENY (403) | **ALLOW** | DENY (403) |
| `/api/users/:id/trends` | GET | DENY (401) | **ALLOW** | DENY (403) | **ALLOW** | DENY (403) |
| `/api/alerts/:id` | GET | DENY (401) | **ALLOW** | DENY (403) | **ALLOW** | DENY (403) |
| `/api/assessments` | POST | DENY (401) | **ALLOW** | DENY (403) | DENY (403) | DENY (403) |
| `/api/assignments` | POST | DENY (401) | DENY (403) | DENY (403) | **ALLOW** | DENY (403) |
| `/api/patients/:id/assignments` | GET | DENY (401) | **ALLOW** | DENY (403) | **ALLOW** | DENY (403) |
| `/api/assignments/:id/status` (`in_progress`) | PATCH | DENY (401) | **ALLOW** | DENY (403) | **ALLOW** | DENY (403) |
| `/api/assignments/:id/status` (`reviewed`) | PATCH | DENY (401) | DENY (403) | DENY (403) | **ALLOW** | DENY (403) |
| `/api/assignments/:id/status` (`cancelled`) | PATCH | DENY (401) | DENY (403) | DENY (403) | **ALLOW** | DENY (403) |
| `/api/doctors` | GET | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** |
| `/api/doctors/:id` | GET | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** |
| `/api/doctors/:id/availability` | GET | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** | **ALLOW** |
| `/api/doctors/profile` | PATCH | DENY (401) | DENY (403) | DENY (403) | **ALLOW** (Self) | DENY (403) |
| `/api/doctors/availability` | PUT | DENY (401) | DENY (403) | DENY (403) | **ALLOW** (Self) | DENY (403) |
| `/api/doctors/availability/block` | POST | DENY (401) | DENY (403) | DENY (403) | **ALLOW** (Self) | DENY (403) |
| `/api/doctors/:id/patients` | GET | DENY (401) | DENY (403) | DENY (403) | **ALLOW** (Self) | DENY (403) |
| `/api/appointments` (Book) | POST | DENY (401) | **ALLOW** (Self) | DENY (403) | DENY (403) | DENY (403) |
| `/api/appointments/my` | GET | DENY (401) | **ALLOW** (Self) | DENY (403) | DENY (403) | DENY (403) |
| `/api/appointments/doctor` | GET | DENY (401) | DENY (403) | DENY (403) | **ALLOW** (Self) | DENY (403) |
| `/api/appointments/:id/confirm` | PATCH | DENY (401) | DENY (403) | DENY (403) | **ALLOW** (Assigned) | DENY (403) |
| `/api/appointments/:id/reject` | PATCH | DENY (401) | DENY (403) | DENY (403) | **ALLOW** (Assigned) | DENY (403) |
| `/api/appointments/:id/cancel` | PATCH | DENY (401) | **ALLOW** (Own) | DENY (403) | **ALLOW** (Assigned) | DENY (403) |
| `/api/appointments/:id/reschedule` | PATCH | DENY (401) | **ALLOW** (Own) | DENY (403) | **ALLOW** (Assigned) | DENY (403) |
| `/api/appointments/:id/complete` | PATCH | DENY (401) | DENY (403) | DENY (403) | **ALLOW** (Assigned) | DENY (403) |
| `/api/appointments/:id/no-show` | PATCH | DENY (401) | DENY (403) | DENY (403) | **ALLOW** (Assigned) | DENY (403) |
| `/api/reports/preview` | GET | DENY (401) | **ALLOW** | DENY (403) | DENY (403) | DENY (403) |
| `/api/reports/share` | POST | DENY (401) | **ALLOW** | DENY (403) | DENY (403) | DENY (403) |
| `/api/reports/shared-with-me` | GET | DENY (401) | DENY (403) | DENY (403) | **ALLOW** (Self) | DENY (403) |
| `/api/reports/my-shares` | GET | DENY (401) | **ALLOW** | DENY (403) | DENY (403) | DENY (403) |
| `/api/reports/shared/:id` | GET | DENY (401) | **ALLOW** (Owner) | DENY (403) | **ALLOW** (Active) | DENY (403) |
| `/api/reports/shares/:id` (Revoke) | DELETE | DENY (401) | **ALLOW** (Owner) | DENY (403) | DENY (403) | DENY (403) |
| `/api/notifications` | GET | DENY (401) | **ALLOW** (Own) | DENY (403) | **ALLOW** (Own) | DENY (403) |
| `/api/notifications/:id/read` | PATCH | DENY (401) | **ALLOW** (Own) | DENY (403) | **ALLOW** (Own) | DENY (403) |

---

## 2. Enforcement Mechanisms

1. **Role Verification Middleware:**
   ```javascript
   requireRole('doctor')
   requireRole('patient')
   ```
2. **Resource-Ownership Middleware:**
   ```javascript
   requireSelfOrDoctor(req, res, next)
   ```
3. **State Transition Validation:** Enforced within route handler logic to prevent illegal status leaps (e.g. `pending` $\rightarrow$ `completed` without doctor confirmation).

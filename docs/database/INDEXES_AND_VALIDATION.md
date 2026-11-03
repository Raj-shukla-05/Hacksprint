# Database Indexes, Constraints & Schema Validation Rules

This document details the compound indexes, unique constraints, partial filter expressions, and validation rules configured across MongoDB collections in NeuroGuard AI.

---

## 1. Complete Index Specification Table

| Collection | Indexed Fields | Index Type | Unique | Partial Filter / Options | Purpose |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **`appointments`** | `{ doctorId: 1, date: 1, startTime: 1 }` | Compound | **YES** | `partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } }` | **Double-Booking Prevention:** Guarantees no two active appointments exist for the same doctor at the same date and time. |
| **`appointments`** | `{ id: 1 }` | Single Field | **YES** | Unique | Primary key lookups by appointment ID. |
| **`appointments`** | `{ patientId: 1 }` | Single Field | No | Standard | Optimizes patient and caregiver appointment list retrieval (`/api/appointments/my`). |
| **`appointments`** | `{ doctorId: 1 }` | Single Field | No | Standard | Optimizes doctor appointment retrieval (`/api/appointments/doctor`). |
| **`appointments`** | `{ date: 1 }` | Single Field | No | Standard | Date-range scheduling queries. |
| **`users`** | `{ email: 1 }` | Single Field | **YES** | Unique, lowercase | Prevents duplicate user accounts and optimizes login credential lookups. |
| **`users`** | `{ id: 1 }` | Single Field | **YES** | Unique | Primary user key lookup. |
| **`users`** | `{ doctorId: 1 }` | Single Field | No | Standard | Roster lookups for doctors querying their assigned patients. |
| **`doctors`** | `{ id: 1 }` | Single Field | **YES** | Unique | Doctor catalog lookup. |
| **`doctors`** | `{ userId: 1 }` | Single Field | **YES** | Unique | Resolves doctor profile from authenticated user session. |
| **`doctors`** | `{ isActive: 1, specialization: 1 }` | Compound | No | Standard | Optimizes public doctor search and specialty filtering. |
| **`doctoravailabilities`** | `{ doctorId: 1 }` | Single Field | **YES** | Unique | Ensures exactly one availability record per clinician. |
| **`assessments`** | `{ id: 1 }` | Single Field | **YES** | Unique | Assessment lookup. |
| **`assessments`** | `{ userId: 1, timestamp: -1 }` | Compound | No | Sort: Descending | Optimizes moving-window baseline queries and longitudinal charts. |
| **`assignments`** | `{ id: 1 }` | Single Field | **YES** | Unique | Assignment identifier. |
| **`assignments`** | `{ patientId: 1, status: 1 }` | Compound | No | Standard | Optimizes patient dashboard care plan lookups for active assignments. |
| **`assignments`** | `{ doctorId: 1 }` | Single Field | No | Standard | Optimizes doctor list of assigned patient protocols. |
| **`sharedrecoveryreports`** | `{ id: 1 }` | Single Field | **YES** | Unique | Report share identifier. |
| **`sharedrecoveryreports`** | `{ patientId: 1, status: 1 }` | Compound | No | Standard | Queries patient's active shared reports. |
| **`sharedrecoveryreports`** | `{ doctorId: 1, status: 1 }` | Compound | No | Standard | Queries reports shared with a specific doctor. |
| **`notifications`** | `{ userId: 1, read: 1, createdAt: -1 }` | Compound | No | Sort: Descending | Optimizes the 15-second polling query for unread notifications. |
| **`alerts`** | `{ userId: 1 }` | Single Field | No | Standard | Queries active anomaly alerts for patient dashboard. |

---

## 2. In-Depth Analysis: The Double-Booking Partial Unique Index

The partial unique index on the `appointments` collection represents one of the most critical data integrity mechanisms in the platform:

```javascript
AppointmentSchema.index(
  { doctorId: 1, date: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['pending', 'confirmed'] },
    },
  }
);
```

### Why a standard unique index fails in healthcare scheduling
In healthcare, patients frequently cancel or reschedule appointments, or doctors decline appointment requests. If a standard unique index `{ doctorId: 1, date: 1, startTime: 1 }` is applied:
1. Patient A books November 10 at 10:00 AM.
2. Patient A cancels the appointment (status: `'cancelled'`).
3. Patient B attempts to book November 10 at 10:00 AM.
4. **Failure:** A standard unique index rejects Patient B's booking because a document with `{ doctorId, date, startTime }` already exists in the collection, even though it was cancelled!

### How the partial filter expression solves the problem
MongoDB's `partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } }` instructs the database storage engine (WiredTiger) to enforce uniqueness **only among documents where the status is currently `'pending'` or `'confirmed'`**. Documents with status `'cancelled'`, `'rejected'`, `'completed'`, or `'no-show'` are completely excluded from the unique index constraint, allowing those time slots to be booked again immediately.

---

## 3. Schema-Level Validation Rules

1. **Email Syntax Validation:**
   Enforced via regular expression on signup: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
2. **Password Length Validation:**
   Minimum 8 characters checked before passing to bcrypt.
3. **Score Range Constraint:**
   `score: { type: Number, required: true, min: 0, max: 100 }`.
4. **Repetition Target Bounds:**
   `targetReps: { type: Number, default: 5, min: 1, max: 50 }`.
5. **Fee Non-Negativity:**
   `consultationFee: { type: Number, required: true, min: 0 }`.
6. **Date Chronology:**
   Backend validation ensures `dueDate >= startDate` when prescribing protocols and rejects appointment requests with past dates.

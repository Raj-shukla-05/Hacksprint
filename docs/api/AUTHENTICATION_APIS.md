# API Reference: Authentication Endpoints

## 1. POST /api/auth/login

Authenticates an existing user via email and password, verifies password hashes using `bcrypt.compare`, and returns a signed 7-day JWT.

- **Authentication:** Public (No token required).
- **Rate Limit:** Standard application rate limit.

### Request
```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json

{
  "email": "raj@neuroguard.demo",
  "password": "patient123"
}
```

### Response (200 OK)
```json
{
  "user": {
    "id": "user-raj",
    "name": "Raj Kumar",
    "age": 58,
    "role": "patient",
    "preferredLanguage": "English",
    "doctorId": "doctor-priya"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Error Responses
- **401 Unauthorized:** Invalid email or password.
  ```json
  { "message": "Invalid email or password" }
  ```
- **404 Not Found:** User profile not found in database.
  ```json
  { "message": "User profile not found" }
  ```

---

## 2. POST /api/auth/signup

Registers a new user account across any of the supported roles (`patient` or `doctor`). For doctors, it automatically creates associated `Doctor` and `DoctorAvailability` records.

- **Authentication:** Public (No token required).
- **Validation Rules:**
  - `name`: Required non-empty string.
  - `email`: Required valid email syntax matching `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
  - `password`: Minimum 8 characters.
  - `role`: Must be one of `'patient'` or `'doctor'`.

### Patient Request Example
```http
POST /api/auth/signup HTTP/1.1
Content-Type: application/json

{
  "name": "Suresh Patel",
  "email": "suresh@example.com",
  "password": "securepassword123",
  "role": "patient"
}
```

### Doctor Request Example
```http
POST /api/auth/signup HTTP/1.1
Content-Type: application/json

{
  "name": "Ananya Sen",
  "email": "ananya@neuroclinic.com",
  "password": "doctorpassword123",
  "role": "doctor",
  "specialization": "Neurorehabilitation",
  "consultationFee": 1500,
  "experienceYears": 12,
  "clinic": {
    "name": "Sen Neurorehab Institute",
    "address": "12 Park Street",
    "city": "Kolkata",
    "roomNumber": "Suite 302",
    "phone": "+91 33 2288 1122"
  }
}
```

### Response (201 Created)
```json
{
  "user": {
    "id": "doctor-m8k2x1",
    "name": "Dr. Ananya Sen",
    "role": "doctor",
    "specialty": "Neurorehabilitation"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Error Responses
- **400 Bad Request:** Missing or invalid fields.
  ```json
  { "message": "Password must be at least 8 characters" }
  ```
- **409 Conflict:** Email already registered.
  ```json
  { "message": "An account with this email already exists" }
  ```

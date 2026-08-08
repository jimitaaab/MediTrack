# MediTrack API Documentation

Complete reference for all HTTP endpoints exposed by the **MediTrack** backend.

- **Base URL (local):** `http://localhost:5000/api`
- All routes are mounted under `/api`.
- Responses are always JSON.

---

## Table of Contents

1. [General Conventions](#general-conventions)
   - [Authentication](#authentication)
   - [Standard Response Wrapper](#standard-response-wrapper)
   - [Error Structure](#error-structure)
   - [Enumerations](#enumerations)
2. [Endpoints](#endpoints)
   - [A. Auth](#a-auth-api)
   - [B. Patients](#b-patients)
   - [C. Doctors](#c-doctors)
   - [D. Assistant](#d-assistant)
   - [E. Admin](#e-admin)
   - [F. Specializations](#f-specializations)
   - [G. Appointments](#g-appointments)
   - [H. Queue](#h-queue)
   - [I. Reviews](#i-reviews)
   - [J. Notifications](#j-notifications)
   - [K. AI Chatbot](#k-ai-chatbot)
3. [Protected Routes By User Role](#protected-routes-by-user-role)
4. [Common Errors](#common-errors)

---

## General Conventions

### Authentication

- Tokens are JWT.
- The server sets two **httpOnly**, `SameSite=None`, `Secure` cookies after login:
  - `accessToken` (lifetime `24h` by default)
  - `refreshToken` (lifetime `7d` by default)
- Protected endpoints accept the token via **either**:
  1. `accessToken` cookie (recommended), OR
  2. `Authorization: Bearer <token>` header.

> Logout, refresh, and most protected routes rely on cookies. If you use the `Authorization` header instead, set cookies from the login response yourself.

### Standard Response Wrapper

Every successful response follows:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Human readable message",
  "data": { }
}
```

List-like responses may also include `meta`:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Returned",
  "data": [ ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42
  }
}
```

### Error Structure

Every error response follows:

```json
{
  "success": false,
  "statusCode": 4xx,
  "message": "Description of the error"
}
```

Exceptions (thrown by the central error handler in `src/middleware/error.middleware.ts`):

| HTTP Status | Meaning | Example message |
|-------------|---------|-----------------|
| 400 | Validation / bad request | `"rating must be an integer between 1 and 5"` |
| 401 | Missing / invalid token | `"Authentication token is required"` |
| 403 | Role not allowed / inactive account | `"You do not have permission to access this resource"` |
| 404 | Resource not found / wrong route | `"Record not found"` |
| 409 | Conflict (duplicate, double booking, invalid transition) | `"This time slot is no longer available"` |
| 422/500 | Prisma / unknown | `"Internal server error"` |

The error handler also normalizes Prisma errors, e.g. `P2002` → `409 Unique constraint violation`, `P2025` → `404 Record not found`, `P2003` → `400 Foreign key constraint failed`.

### Role Middleware Responses

`requireRole(...)` returns directly (not wrapped in the standard error handler - same JSON shape):

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Authentication required"
}
```

```json
{
  "success": false,
  "statusCode": 403,
  "message": "You do not have permission to access this resource"
}
```

### NotFound handler

Any unregistered route:

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Route not found: GET /api/some-unknown"
}
```

### Root route

`GET /` → `Hello, World!` (plain text, not JSON).

---

## Enums

### Roles (`src/shared/constants/index.ts`)

`PATIENT` • `DOCTOR` • `DOCTOR_ASSISTANT` • `ADMIN`

### AccountStatus

`ACTIVE` • `INACTIVE` • `SUSPENDED`

### AppointmentStatus

`PENDING` • `CONFIRMED` • `COMPLETED` • `CANCELLED` • `REJECTED`

### DoctorVerificationStatus

`PENDING` • `APPROVED` • `REJECTED`

### QueueStatus

`WAITING` • `CALLED` • `IN_CONSULTATION` • `COMPLETED` • `ABSENT` • `SKIPPED`

### Gender

`MALE` • `FEMALE` • `OTHER`

### Weekday

`SUNDAY` • `MONDAY` • `TUESDAY` • `WEDNESDAY` • `THURSDAY` • `FRIDAY` • `SATURDAY`

---

## A. AUTH `/api/auth`

### 1. Register Patient - `POST /api/auth/register/patient`

**Auth:** Public

**Request body**

```json
{
  "fullName": "Rahim Ahmed",
  "email": "rahim@example.com",
  "phone": "+8801712345678",
  "password": "securePass123"
}
```

- `password` must be ≥ 8 characters.
- `phone` is optional.
- `email` is lowercased and must match `^[^\s@]+@[^\s@]+\.[^\s@]+$`.

**Response `201`**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Patient registered successfully",
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "fullName": "Rahim Ahmed",
    "email": "rahim@example.com",
    "phone": "+8801712345678",
    "role": "PATIENT",
    "status": "ACTIVE",
    "createdAt": "2026-08-08T10:30:00.000Z"
  }
}
```

---

### 2. Register Doctor − `POST /api/auth/register/doctor`

**Public**

**Request body**

```json
{
  "fullName": "Dr. Nusrat Jahan",
  "email": "nusrat@meditrack.com",
  "phone": "+8801987654321",
  "password": "StrongPass@123",
  "specializationId": "3f8f1b9e-5c61-4a9c-9d22-1f6e7f0a5b21",
  "hospitalName": "Dhaka Medical College Hospital",
  "clinicAddress": "Dhanmondi, Dhaka",
  "consultationFee": 800,
  "latitude": 23.8103,
  "longitude": 90.4125
}
```

- `consultationFee` must be a non-negative number (required).
- `specializationId` is required (a valid Specialization id).
- `hospitalName`, `clinicAddress`, `latitude`, `longitude`, `phone` optional.

**Response `201`**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Doctor registered successfully. Your profile is pending verification.",
  "data": {
    "id": "d31e5d8f-11c2-4f7e-a9b0-3e5f1a2c8d77",
    "fullName": "Dr. Nusrat Jahan",
    "email": "nusrat@meditrack.com",
    "role": "DOCTOR",
    "status": "ACTIVE",
    "doctor": {
      "id": "71aa2fc1-33e4-4d0a-9f10-abc123def456",
      "consultationFee": 800,
      "verificationStatus": "PENDING"
    }
  }
}
```

---

### 3. Register Assistant − `POST /api/auth/register/assistant`

**Public**

**Request body**

```json
{
  "fullName": "Karim Uddin",
  "email": "karim@meditrack.com",
  "phone": "+8801622334455",
  "password": "Assistant@123",
  "designation": "Front Desk Officer"
}
```

`designation` optional.

**Response `201`** - same shape as patient registration (`role: "DOCTOR_ASSISTANT"`):

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Assistant registered successfully",
  "data": {
    "id": "b2e3a4f6-77cc-44e5-b1f4-9a8c7d6e5f40",
    "fullName": "Amir Uddin",
    "email": "karim@meditrack.com",
    "phone": "+8801622334455",
    "role": "DOCTOR_ASSISTANT",
    "status": "ACTIVE",
    "createdAt": "2026-08-08T11:00:00.000Z"
  }
}
```

---

### 4. Login − `POST /api/auth/login`

**Public**

**Request body**

```json
{
  "email": "nusrat@meditrack.com",
  "password": "StrongPass@123"
}
```

**Response `200`** - also sets `accessToken` & `refreshToken` httpOnly cookies.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logged in successfully",
  "data": {
    "user": {
      "id": "d31e5d8f-11c2-4f7e-a9b0-3e5f1a2c8d77",
      "fullName": "Dr. Nusrat Jahan",
      "email": "nusrat@meditrack.com",
      "phone": "+8801987654321",
      "role": "DOCTOR"
    },
    "tokens": {
      "accessToken": "<jwt.access.token>",
      "refreshToken": "<jwt.refresh.token>"
    }
  }
}
```

**Errors:**

```json
{ "success": false, "statusCode": 401, "message": "Invalid email or password" }
```

```json
{ "success": false, "statusCode": 403, "message": "Account is not active. Please contact support." }
```

---

### 5. Refresh Token − `POST /api/auth/refresh-token`

**Public** - reads the `refreshToken` cookie, or falls back to a body field.

**Request body (optional, only if cookie is absent)**

```json
{
  "refreshToken": "<jwt.refresh.token>"
}
```

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Tokens refreshed successfully",
  "data": {
    "user": {
      "id": "d31e5d8f-11c2-4f7e-a9b0-3e5f1a2c8d77",
      "email": "nusrat@meditrack.com",
      "role": "DOCTOR"
    },
    "tokens": {
      "accessToken": "<new.access.token>",
      "refreshToken": "<new.refresh.token>"
    }
  }
}
```

**Errors:** `401 "Refresh token is required"`, `401 "Invalid refresh token"`.

---

### 6. Logout − `POST /api/auth/logout`

**Auth required** (any role). Clears cookies.

**Response `200`**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logged out successfully",
  "data": {
    "loggedOut": true
  }
}
```

---

### 7. Change Password − `POST /api/auth/change-password`

**Auth required** (any role).

**Request body**

```json
{
  "oldPassword": "StrongPass@123",
  "newPassword": "NewStrongPass@456"
}
```
(`newPassword` must be ≥ 8 characters)

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password changed successfully",
  "data": {
    "success": true
  }
}
```

**Errors:** `401 "Old password is incorrect"`, `404 "User not found"`.

---

### 8. Forgot Password − `POST /api/auth/forgot-password`

**Public**

```json
{
  "email": "rahim@example.com"
}
```

**Response 200** - note: the reset token is returned directly in the response (demo wiring; expiry 15 minutes).

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password reset link has been generated",
  "data": {
    "message": "Password reset link has been generated",
    "resetToken": "<jwt.reset.token>"
  }
}
```

**Error:** `404 "No account found with that email"`.

---

### 9. Reset Password − `POST /api/auth/reset-password`

**Public**

```json
{
  "token": "<jwt.reset.token.from.step.8>",
  "newPassword": "BrandNewPass@789"
}
```

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Password reset successfully",
  "data": {
    "success": true
  }
}
```

**Errors:** `401 "Invalid or expired reset token"`.

---

## B. PATIENTS `/api/patients`

All endpoints in this section require `role = PATIENT`.

### 1. Get Own Profile − `GET /api/patients/me`

**Auth + PATIENT**

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Patient profile retrieved successfully",
  "data": {
    "id": "f9ac10b-58cc-4372-a567-0e02b2c3d479",
    "fullName": "Rahim Ahmed",
    "email": "rahim@example.com",
    "phone": "+8801712345678",
    "profilePhoto": null,
    "password": "[omitted - hashed]",
    "role": "PATIENT",
    "status": "ACTIVE",
    "needsPasswordChange": false,
    "createdAt": "2026-08-08T10:30:00.000Z",
    "updatedAt": "2026-08-08T10:30:00.000Z",
    "patient": {
      "id": "9d7c9b2e-aa11-4f33-8b1c-5c9e7f6d4a20",
      "userId": "f9ac10c-58cc-4372-a567-0e02b2c3d479",
      "dateOfBirth": null,
      "gender": null,
      "bloodGroup": null
    }
  }
}
```

> Security note: `GET * /me` and `admin` profile/list responses use a bare `include`, so they currently echo the full user row. Fields such as `password` are emitted by the API today (hashed) but should be stripped in production.

---

### 2. Update Own Profile − `PATCH /api/patients/me`

**Auth + PATIENT**

**Request body (all optional)**

```json
{
  "fullName": "Rahim Ahmed Chowdhury",
  "phone": "+8801712345678",
  "profilePhoto": "https://cdn.example.com/photos/rahim.jpg",
  "dateOfBirth": "1995-05-12",
  "gender": "MALE",
  "bloodGroup": "B+"
}
```

**Response 200** - returns the updated profile (same shape as GET /me).

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Patient profile updated successfully",
  "data": {
    "id": "f9ac10c-58cc-4372-a567-0e02b2c3d479",
    "fullName": "Rahim Ahmed Chowdhury",
    "email": "rahim@example.com",
    "phone": "+8801712345678",
    "profilePhoto": null,
    "password": "[omitted]",
    "role": "PATIENT",
    "status": "ACTIVE",
    "needsPasswordChange": false,
    "createdAt": "2026-08-08T10:30:00.000Z",
    "updatedAt": "2026-08-08T12:00:00.000Z",
    "patient": {
      "id": "9d7c9b2e-5c4f-4f33-8b1c-5c9e7f6d4a20",
      "userId": "f9ac10c-58cc-4372-a567-0e02b2c3d479",
      "dateOfBirth": "1995-05-12T00:00:00.000Z",
      "gender": "MALE",
      "bloodGroup": "B+"
    }
  }
}
```

**Errors:** `400 "dateOfBirth must be a valid date"`, `400 "Invalid gender value"`.

---

### 3. Get My Dashboard − `GET /api/patients/me/dashboard`

**Auth + PATIENT**

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Patient dashboard retrieved successfully",
  "data": {
    "welcome": {
      "fullName": "Rahim Ahmed",
      "email": "rahim@example.com",
      "profilePhoto": null
    },
    "totals": {
      "total": 5,
      "pending": 1,
      "confirmed": 2,
      "completed": 2,
      "cancelled": 0
    },
    "upcomingAppointment": {
      "id": "appt-uuid-001",
      "patientId": "9d7c9b2e-...",
      "doctorId": "71c2fc3b-...",
      "assistantId": null,
      "date": "2026-08-09T00:00:00.000Z",
      "timeSlot": "10:15",
      "serialNumber": 3,
      "status": "CONFIRMED",
      "createdAt": "2026-08-08T12:30:00.000Z",
      "doctor": {
        "id": "71c2fc3b-33e4-4d0a-9e4f-abc123def456",
        "userId": "d31e5d8f-...",
        "specializationId": "3f8f1b9e-...",
        "hospitalName": "Dhaka Medical College Hospital",
        "clinicAddress": "Dhanmondi, Dhaka",
        "latitude": 23.8103,
        "longitude": 90.4125,
        "consultationFee": 800,
        "verificationStatus": "APPROVED",
        "averageRating": 4.7,
        "totalReviews": 12,
        "user": { "id": "d31e5d8f-...", "fullName": "Dr. Nusrat Jahan", "profilePhoto": null },
        "specialization": { "id": "3f8f1b9e-...", "name": "Cardiology", "icon": "💓" }
      }
    },
    "recentAppointments": [
      {
        "id": "app10-uuid-001",
        "patientId": "...",
        "doctorId": "...",
        "assistantId": null,
        "date": "2026-08-09T00:00:00.000Z",
        "timeSlot": "10:15",
        "serialNumber": 3,
        "status": "CONFIRMED",
        "createdAt": "2026-08-08T14:30:00.000Z",
        "doctor": { }
      }
    ]
  }
}
```

---

## C. DOCTORS `/api/doctor`

Most endpoints are public except those under `/me`.

### 1. List Doctors − `GET /api/doctor/`

**Public**

**Query params (all optional)**
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Partial name match (case-insensitive) |
| `specialization` | string | Specialization id OR name (case-insensitive) |
| `sortBy` | string | `"rating"` sorts by averageRating desc; otherwise sorted by fullName asc |

**Sample request**

```
GET /api/doctor/?search=jahan&specialization=Cardiology&sortBy=rating
```

**Response 200** - returns only **approved & active** doctors:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Doctors retrieved successfully",
  "data": [
    {
      "id": "71c2fc3b-33e4-4d0a-9e4f-abc123def456",
      "userId": "d31e5d8f-...",
      "specializationId": "3f8f1b9e-...",
      "hospitalName": "Dhaka Medical College Hospital",
      "clinicAddress": "Dhanmondi, Dhaka",
      "latitude": 23.8103,
      "longitude": 90.4125,
      "consultationFee": 800,
      "verificationStatus": "APPROVED",
      "averageRating": 4.7,
      "totalReviews": 12,
      "user": {
        "id": "d31e5d8f-...",
        "fullName": "Dr. Nusrat Jahan",
        "email": "nusrat@meditrack.com",
        "phone": "+8801987654321",
        "profilePhoto": null
      },
      "specialization": {
        "id": "3f8f1b9e-...",
        "name": "Cardiology",
        "icon": "💓"
      }
    }
  ]
}
```

---

### 2. Get Nearby Doctors − `GET /api/doctor/nearby`

**Auth + PATIENT**

**Query params**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `lat` | number | yes | Latitude (-90..90) |
| `lng` | number | yes | Longitude (-180..180) |
| `radius` | number | no | Radius in km (default `10`) |
| `specialization` | string | no | Specialization id or name |

**Sample**

```
GET /api/doctor/nearby?lat=23.8103&lng=90.4125&radius=10&specialization=general
```

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Nearby doctors retrieved successfully",
  "data": [
    {
      "id": "71c2fc3b-...",
      "user": { "id": "...", "fullName": "Dr. Nusrat Jahan", "email": "...", "phone": "...", "profilePhoto": null },
      "specialization": { "id": "...", "name": "Cardiology", "icon": "💓" },
      "latitude": 23.8103,
      "longitude": 90.4125,
      "consultationFee": 800,
      "verificationStatus": "APPROVED",
      "distanceKm": 1.24,
      "directionsUrl": "https://www.google.com/maps/dir/?api=1&destination=23.8103,90.4125"
    }
  ]
}
```

Control Dr. located outside `radius` is excluded; results sorted by `distanceKm`.

**Errors:** `400 "lat must be a number between -90 and 90"`, `400 "radius must be a positive number in kilometers"`.

---

### 3. Get My Profile − `GET /api/doctor/me`

**Auth + DOCTOR**

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Doctor profile retrieved successfully",
  "data": {
    "id": "d31e5d8f-...",
    "fullName": "Dr. Nusrat Jahan",
    "email": "nusrat@meditrack.com",
    "phone": "+8801987654321",
    "profilePhoto": null,
    "password": "[omitted]",
    "role": "DOCTOR",
    "status": "ACTIVE",
    "needsPasswordChange": false,
    "createdAt": "...",
    "updatedAt": "...",
    "doctor": {
      "id": "71c2fc3b-...",
      "userId": "d31e5d8f-...",
      "specializationId": "3f8f1b9e-...",
      "hospitalName": "Dhaka Medical College Hospital",
      "clinicAddress": "Dhanmondi, Dhaka",
      "latitude": 23.8103,
      "longitude": 90.4125,
      "consultationFee": 800,
      "verificationStatus": "APPROVED",
      "averageRating": 4.7,
      "totalReviews": 12,
      "specialization": {
        "id": "3f8f1b9e-...",
        "name": "Cardiology",
        "icon": "💓"
      }
    }
  }
}
```

---

### 4. Update My Profile − `PATCH /api/doctor/me`

**Auth + DOCTOR** - all fields optional

```json
{
  "fullName": "Dr. Nusrat Jahan Rahman",
  "phone": "+8801987654321",
  "profilePhoto": "https://cdn.example.com/doctors/nusrat.jpg",
  "specializationId": "3f8f1b9e-...",
  "hospitalName": "Square Hospital",
  "clinicAddress": "Panakapla, Dhaka",
  "latitude": 23.7481,
  "longitude": 90.4000,
  "consultationFee": 1000
}
```

**Response 200** - updated profile (same shape as GET /me).

**Errors:** `400 "latitude must be a number"`, `400 "consultationFee must be a non-negative number"`.

---

### 5. Get My Dashboard − `GET /api/doctor/me/dashboard`

**Auth + DOCTOR**

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Doctor dashboard retrieved successfully",
  "data": {
    "welcome": {
      "fullName": "Dr. Nusrat Jahan",
      "profilePhoto": null
    },
    "doctor": {
      "id": "71c2fc3b-...",
      "specialization": "Cardiology",
      "hospitalName": "Dhaka Medical College Hospital",
      "clinicAddress": "Dhanmondi, Dhaka",
      "consultationFee": 800,
      "averageRating": 4.7,
      "totalReviews": 12
    },
    "today": {
      "total": 3,
      "queue": {
        "total": 3,
        "current": {
          "id": "queue-uuid-2",
          "serialNumber": 2,
          "status": "IN_CONSULTATION",
          "calledAt": "2026-08-08T10:05:00.000Z",
          "completedAt": null
        },
        "next": {
          "id": "queue-uuid-3",
          "serialNumber": 3,
          "status": "WAITING",
          "calledAt": null,
          "completedAt": null
        },
        "remaining": 1
      },
      "appointments": [
        {
          "id": "app-uuid...",
          "date": "2026-08-08T00:00:00.000Z",
          "timeSlot": "10:00",
          "serialNumber": 1,
          "status": "CONFIRMED",
          "patient": {
            "id": "pat-id...",
            "userId": "user-id...",
            "user": { "id": "...", "fullName": "Rahim Ahmed", "phone": "+8801712345678", "profilePhoto": null }
          },
          "queue": {
            "id": "queue-uuid-1",
            "serialNumber": 1,
            "status": "COMPLETED",
            "calledAt": "...",
            "completedAt": "..."
          }
        }
      ]
    },
    "totals": {
      "totalAppointments": 120,
      "completedAppointments": 98,
      "pendingRequests": 4,
      "totalReviews": 12
    }
  }
}
```

---

### 6. Get My Schedules − `GET /api/doctor/me/schedule`

**Auth + DOCTOR**

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Schedules retrieved successfully",
  "data": [
    {
      "id": "schedule-uuid-1",
      "doctorId": "71c2fc3b-...",
      "dayOfWeek": "SUNDAY",
      "startTime": "10:00",
      "endTime": "13:00",
      "slotDurationMinutes": 15
    },
    {
      "id": "schedule-uuid-2",
      "doctorId": "71c2fc3b-...",
      "dayOfWeek": "TUESDAY",
      "startTime": "14:00",
      "endTime": "17:00",
      "slotDurationMinutes": 15
    }
  ]
}
```

---

### 7. Create Schedule − `POST /api/doctor/me/schedule`

**Auth + DOCTOR**

```json
{
  "dayOfWeek": "MONDAY",
  "startTime": "09:00",
  "endTime": "12:00",
  "slotDurationMinutes": 15
}
```

- `dayOfWeek` one of the Weekday enum.
- `startTime`/`endTime` in `HH:MM` 24h format (end > start).
- `slotDurationMinutes` optional (default `15`), positive integer.

**Response `201`**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Schedule created successfully",
  "data": {
    "id": "schedule-uuid-new",
    "doctorId": "71c2fc3b-...",
    "dayOfWeek": "MONDAY",
    "startTime": "09:00",
    "endTime": "12:00",
    "slotDurationMinutes": 15
  }
}
```

**Errors:** `400 "dayOfWeek must be a valid weekday"`, `400 "endTime must be after startTime"`, `409 "Schedule overlaps with an existing schedule"`.

---

### 8. Update Schedule − `PATCH /api/doctor/me/schedule/:id`

**Auth + DOCTOR** - all optional

```json
{
  "dayOfWeek": "WEDNESDAY",
  "startTime": "10:00",
  "endTime": "14:00"
}
```

**Response 200** - updated schedule object (same shape as create).

**Error:** `404 "Schedule not found"` (also if the schedule belongs to a different doctor).

---

### 9. Delete Schedule − `DELETE /api/doctor/me/schedule/:id`

**Auth + DOCTOR**

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Schedule deleted successfully",
  "data": {
    "id": "5deleted-uuid-1",
    "doctorId": "71c2-...",
    "dayOfWeek": "WEDNESDAY",
    "startTime": "10:00",
    "endTime": "14:00",
    "slotDurationMinutes": 15
  }
}
```

---

### 10. Update Clinic Location − `PATCH /api/doctor/me/clinic-location`

**Auth + DOCTOR** - at least one field required

```json
{
  "clinicAddress": "Gulshan 2, Dhaka",
  "latitude": 23.7925,
  "longitude": 90.4077
}
```

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Clinic location updated successfully",
  "data": {
    "id": "71c2fc3b-...",
    "userId": "...",
    "specializationId": "...",
    "hospitalName": "...,",
    "clinicAddress": "Gulshan 2, Dhaka",
    "latitude": 23.7925,
    "longitude": 90.4077,
    "consultationFee": 800,
    "verificationStatus": "APPROVED",
    "averageRating": 4.7,
    "totalReviews": 12,
    "specialization": { "id": "...", "name": "Cardiology", "icon": "💓" }
  }
}
```

**Errors:** `400 "latitude must be a number between -90 and 90"`, `400 "At least one field is required"`.

---

### 11. Get Public Doctor Profile − `GET /api/doctor/:id`

**Public** - doctor must be APPROVED + ACTIVE.

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Doctor profile retrieved successfully",
  "data": {
    "id": "71c2fc3b-...",
    "userId": "...",
    "specializationId": "...",
    "hospitalName": "Dhaka Medical College Hospital",
    "clinicAddress": "Dhanmondi, Dhaka",
    "latitude": 23.8103,
    "longitude": 90.4125,
    "consultationFee": 800,
    "verificationStatus": "APPROVED",
    "averageRating": 4.7,
    "totalReviews": 12,
    "user": { "id": "...", "fullName": "Dr. Nusrat Jahan", "email": "...", "phone": "...", "profilePhoto": null },
    "specialization": { "id": "...", "name": "Cardiology", "icon": "💓" },
    "schedules": [
      { "id": "..", "doctorId": "..", "dayOfWeek": "SUNDAY", "startTime": "10:00", "endTime": "13:00", "slotDurationMinutes": 15 }
    ],
    "reviews": [
      {
        "id": "review-uuid-1",
        "patientId": "...",
        "doctorId": "...",
        "appointmentId": "...",
        "rating": 5,
        "comment": "Very helpful doctor.",
        "createdAt": "2026-08-07T09:00:00.000Z",
        "patient": {
          "id": "...",
          "userId": "...",
          "dateOfBirth": null,
          "gender": "MALE",
          "bloodGroup": null,
          "user": { "id": "...", "fullName": "Rahim Ahmed", "profilePhoto": null }
        }
      }
    ]
  }
}
```

**Error:** `404 "Doctor not found"`.

---

### 12. Get Available Slots − `GET /api/doctor/:id/schedule?date=YYYY-MM-DD`

**Public** - `date` query param required.

**Sample**

```
GET /api/doctor/71c2fc3b-.../schedule?date=2026-08-10
```

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Available slots retrieved successfully",
  "data": {
    "date": "2026-08-10",
    "dayOfWeek": "MONDAY",
    "slots": ["09:00", "09:15", "09:30", "09:45", "10:00"]
  }
}
```

Slots already booked (not `CANCELLED` / `REJECTED`) are excluded.

**Errors:** `400 "date is required"`, `400 "date must be in YYYY-MM-DD format"`.

---

## D. ASSISTANT `/api/assistant`

All endpoints require `role = DOCTOR_ASSISTANT`.

### 1. Get My Profile − `GET /api/assistant/me`

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Assistant profile retrieved successfully",
  "data": {
    "id": "b1e3a4f6-...",
    "fullName": "Amir Uddin",
    "email": "amir@meditrack.com",
    "phone": "+8801622334455",
    "profilePhoto": null,
    "password": "[omitted]",
    "role": "DOCTOR_ASSISTANT",
    "status": "ACTIVE",
    "needsPasswordChange": false,
    "createdAt": "...",
    "updatedAt": "...",
    "assistant": {
      "id": "asst-id-01",
      "userId": "b1e3a4f6-...",
      "designation": "Front Desk",
      "doctorId": "71c2fc3b-..."
    }
  }
}
```

---

### 2. Update Profile − `PATCH /api/assistant/me`

**Body**

```json
{
  "fullName": "Amir Uddin Ahmed",
  "phone": "+8801622334455",
  "profilePhoto": null,
  "designation": "Senior Front Desk"
}
```

**Response 200** - updated profile (same shape as GET /me).

---

### 3. Get Dashboard − `GET /api/assistant/me/dashboard`

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Assistant dashboard retrieved successfully",
  "data": {
    "welcome": { "fullName": "Amir Uddin", "profilePhoto": null },
    "doctor": {
      "id": "71c2fc3b-...",
      "userId": "...",
      "specializationId": "...",
      "hospitalName": "Dhaka Medical College Hospital",
      "clinicAddress": "Dhanmondi, Dhaka",
      "consultationFee": 800,
      "verificationStatus": "APPROVED",
      "averageRating": 4.7,
      "totalReviews": 12,
      "user": { "id": "...", "fullName": "Dr. Nusrat Jahan", "profilePhoto": null },
      "specialization": { "id": "...", "name": "Cardiology", "icon": "💓" }
    },
    "today": {
      "total": 3,
      "queue": {
        "total": 3,
        "current": { "id": "q2", "serialNumber": 2, "status": "IN_CONSULTATION" },
        "next": { "id": "q3", "serialNumber": 3, "status": "WAITING" },
        "remaining": 1
      },
      "todayAppointments": 4
    },
    "totals": {
      "pendingAppointments": 5,
      "todayAppointments": 4
    }
  }
}
```

When no doctor is assigned, `doctor` is `null`, queue `[]`, counts `0`.

---

### 4. Get Assigned Doctor − `GET /api/assistant/me/doctor`

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Assigned doctor retrieved successfully",
  "data": {
    "doctor": {
      "id": "71c2fc3b-...",
      "userId": "...",
      "specializationId": "...",
      "hospitalName": "Dhaka Medical College Hospital",
      "clinicAddress": "Dhanmondi, Dhaka",
      "latitude": 23.8103,
      "longitude": 90.4125,
      "consultationFee": 800,
      "verificationStatus": "APPROVED",
      "averageRating": 4.7,
      "totalReviews": 12,
      "user": { "id": "...", "fullName": "Dr. Nusrat Jahan", "email": "...", "phone": "...", "profilePhoto": null },
      "specialization": { "id": "...", "name": "Cardiology", "icon": "💓" },
      "schedules": [
        { "id": "...", "doctorId": "...", "dayOfWeek": "SUNDAY", "startTime": "10:00", "endTime": "13:00", "slotDurationMinutes": 15 }
      ]
    },
    "message": null
  }
}
```

Not assigned:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Assigned doctor retrieved successfully",
  "data": { "doctor": null, "message": "No doctor assigned yet" }
}
```

---

## E. ADMIN `/api/admin`

All endpoints require `role = ADMIN`.

### 1. Get Dashboard Stats − `GET /api/admin/dashboard`

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Dashboard statistics retrieved successfully",
  "data": {
    "totals": {
      "users": 25,
      "patients": 15,
      "doctors": 6,
      "assistants": 3,
      "admins": 1,
      "appointments": 200,
      "specializations": 6,
      "reviews": 44
    },
    "userStatuses": {
      "active": 22,
      "suspended": 3
    },
    "doctorVerification": {
      "pending": 2,
      "approved": 3,
      "rejected": 1
    },
    "appointmentStatuses": {
      "PENDING": 5,
      "CONFIRMED": 4,
      "COMPLETED": 6,
      "CANCELLED": 2,
      "REJECTED": 1
    },
    "doctorVerificationByStatus": {
      "PENDING": 2,
      "APPROVED": 3,
      "REJECTED": 1
    }
  }
}
```

---

### 2. Get Reports − `GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD`

**Auth + ADMIN** - `from`/`to` optional.

**Sample**

```
GET /api/admin/reports?from=2026-07-01&to=2026-08-01
```

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Reports retrieved successfully",
  "data": {
    "summary": {
      "totalAppointments": 18,
      "completedAppointments": 6,
      "cancelledAppointments": 2,
      "pendingAppointments": 5,
      "confirmedAppointments": 4,
      "rejectedAppointments": 1,
      "completionRate": 33.33
    },
    "reviews": {
      "total": 44,
      "averageRating": 4.55
    },
    "roleDistribution": {
      "PATIENT": 15,
      "DOCTOR": 6,
      "DOCTOR_ASSISTANT": 3,
      "ADMIN": 1
    },
    "dailyAppointments": [
      { "date": "2026-07-14", "count": 3 },
      { "date": "2026-07-19", "count": 5 }
    ],
    "topDoctors": [
      {
        "id": "...",
        "consultationFee": 800,
        "averageRating": 4.9,
        "totalReviews": 12,
        "user": { "id": "...", "fullName": "Dr. Nusrat Jahan" },
        "specialization": { "id": "...", "name": "Cardiology" }
      }
    ]
  }
}
```

---

### 3. Get Admin Profile − `GET /api/admin/me`

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Admin profile retrieved successfully",
  "data": {
    "id": "admin-user-uuid",
    "fullName": "System Admin",
    "email": "admin@meditrack.com",
    "phone": null,
    "profilePhoto": null,
    "password": "[omitted]",
    "role": "ADMIN",
    "status": "ACTIVE",
    "needsPasswordChange": false,
    "createdAt": "...",
    "updatedAt": "...",
    "admin": {
      "id": "admin-record-uuid",
      "userId": "admin-user-uuid"
    }
  }
}
```

---

### 4. Update Profile − `PATCH /api/admin/me`

```json
{
  "fullName": "System Administrator",
  "phone": "+8801711000000",
  "profilePhoto": null
}
```

**Response 200** - updated admin profile (same shape as GET /me).

---

### 5. Get Pending Doctors − `GET /api/admin/doctors/pending`

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Pending doctors retrieved successfully",
  "data": [
    {
      "id": "pending-doctor-id",
      "userId": "...",
      "specializationId": "...",
      "hospitalName": null,
      "clinicAddress": null,
      "latitude": null,
      "longitude": null,
      "consultationFee": 500,
      "verificationStatus": "PENDING",
      "averageRating": 0,
      "totalReviews": 0,
      "user": { "id": "...", "fullName": "Dr. Hasan Ali", "email": "hasan@meditrack.com", "phone": "+88...", "profilePhoto": null, "status": "ACTIVE", "createdAt": "..." },
      "specialization": { "id": "...", "name": "Neurology", "icon": "🧠" }
    }
  ]
}
```

---

### 6. Approve Doctor − `PATCH /api/admin/doctors/:id/approve`

**Auth + ADMIN**

**(no body)**

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Doctor approved successfully",
  "data": {
    "id": "pending-doctor-id",
    "verificationStatus": "APPROVED",
    "user": { "id": "...", "fullName": "Dr. Rahim Ali", "status": "ACTIVE" },
    "specialization": { "id": "...", "name": "Neurology" }
  }
}
```

Also fires a `"Doctor Approved"` notification to the doctor.

---

### 7. Reject Doctor − `PATCH /api/admin/doctors/:id/reject`

**(no body)** → `verificationStatus: "REJECTED"`, sends `"Doctor Rejected"` notification, same response shape as #6.

---

### 8. Suspend Doctor − `PATCH /api/admin/doctors/:id/suspend`

**(no body)** → sets user status `SUSPENDED`. Response 200 (doctor with user status `SUSPENDED`).

---

### 9. List Assistants − `GET /api/admin/assistants`

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Assistants retrieved successfully",
  "data": [
    {
      "id": "asst-id",
      "userId": "...",
      "designation": "Front Desk",
      "doctorId": "71c2fc3b-...",
      "user": { "id": "...", "fullName": "Amir Uddin", "email": "amir@meditrack.com", "phone": "...", "profilePhoto": null, "status": "ACTIVE", "createdAt": "..." },
      "doctor": {
        "id": "71c2fc3b-...",
        "consultationFee": 800,
        "user": { "id": "...", "fullName": "Dr. Nusrat Jahan" },
        "specialization": { "id": "...", "name": "Cardiology" }
      }
    }
  ]
}
```

---

### 10. Assign Doctor To Assistant − `PATCH /api/admin/assistants/:id/assign-doctor`

```json
{
  "doctorId": "71c2fc3b-..." 
}
```

Pass `"doctorId": null` to unassign. Any non-null value must be a valid doctor id.

**Response 200** - updated assistant (same shape as #9). Sends an `"Assistant Assigned"` notification.

**Errors:** `400 "doctorId must be a string or null"`, `404 "Doctor not found"`.

---

### 11. Suspend Assistant − `PATCH /api/admin/assistants/:id/suspend`

**(no body)** → sets user status `SUSPENDED`. Response 200 - updated assistant.

---

## F. SPECIALIZATIONS `/api/specializations`

### 1. GET `/api/specializations/` - Public

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Specializations retrieved successfully",
  "data": [
    {
      "id": "3f8f1b9e-...",
      "name": "Cardiology",
      "icon": "💓",
      "_count": { "doctors": 3 }
    },
    {
      "id": "6d2a9f0c-...",
      "name": "Dermatology",
      "icon": "🧴",
      "_count": { "doctors": 1 }
    }
  ]
}
```

---

### 2. `POST /api/specializations/` - **Auth + ADMIN**

```json
{
  "name": "Oncology",
  "icon": "🎗️"
}
```

**Response `201`**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Specialization created successfully",
  "data": {
    "id": "new-spec-id",
    "name": "Oncology",
    "icon": "🎗️"
  }
}
```

**Errors:** `400 "name is required"`, `409 "Specialization with this name already exists"`.

---

### 3. `PATCH /api/specializations/:id` - **Auth + ADMIN**

```json
{
  "name": "Oncology & Hematology",
  "icon": "🎗️"
}
```

**Response 200** - updated object.

**Errors:** `404 "Specialization not found"`, `409 "Specialization with this name already exists"`.

---

### 4. `DELETE /api/specializations/:id` - **Auth + ADMIN**

**Response 200** - deleted object.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Specialization deleted successfully",
  "data": {
    "id": "new-spec-id",
    "name": "Oncology",
    "icon": "🎗️"
  }
}
```

**Error:** `409 "Cannot delete specialization that has doctors assigned"`.

---

## G. APPOINTMENTS `/api/appointments` 

### 1. Book Appointment − `POST /api/appointments/`

**Auth + PATIENT**

```json
{
  "doctorId": "71c2fc3b-...",
  "date": "2026-08-10",
  "timeSlot": "09:30"
}
```

- `date` must be `YYYY-MM-DD`; `timeSlot` must be one of the doctor's available slots (`HH:MM`).

**Response `201`** - creates the appointment (status `PENDING`) **and a queue entry** (status `WAITING`).

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Appointment booked successfully",
  "data": {
    "id": "appt-uuid-...",
    "patientId": "9d7c9b2e-...",
    "doctorId": "71c2fc3b-...",
    "assistantId": null,
    "date": "2026-08-10T00:00:00.000Z",
    "timeSlot": "09:30",
    "serialNumber": 1,
    "status": "PENDING",
    "createdAt": "2026-08-08T15:00:00.000Z",
    "patient": {
      "id": "9d7c9b2e-...",
      "userId": "...",
      "user": { "id": "...", "fullName": "Rahim Ahmed", "email": "rahim@example.com", "phone": "+8801712345678", "profilePhoto": null }
    },
    "doctor": {
      "id": "71c2fc3b-...",
      "userId": "...",
      "specializationId": "...",
      "hospitalName": "...",
      "clinicAddress": "...",
      "latitude": null,
      "longitude": null,
      "verificationStatus": "APPROVED",
      "averageRating": 4.7,
      "totalReviews": 12,
      "consultationFee": 800,
      "user": { "id": "...", "fullName": "Dr. Nusrat Jahan", "email": "...", "phone": "...", "profilePhoto": null },
      "specialization": { "id": "...", "name": "Cardiology", "icon": "💓" }
    },
    "queue": {
      "id": "queue-uuid-...",
      "appointmentId": "appt-uuid-...",
      "doctorId": "71c2fc3b-...",
      "serialNumber": 1,
      "status": "WAITING",
      "calledAt": null,
      "completedAt": null
    }
  }
}
```

**Errors:** `400 "timeSlot is not available for the selected date"`, `409 "This time slot is no longer available"`.

---

### 2. Get Pending Requests − `GET /api/appointments/requests`

**Auth + DOCTOR_ASSISTANT** - returns PENDING appointments for the assistant's doctor.

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Pending requests retrieved successfully",
  "data": [
    {
      "id": "appt-uuid-...",
      "patientId": "...",
      "doctorId": "...",
      "assistantId": null,
      "date": "2026-08-10T00:00:00.000Z",
      "timeSlot": "09:30",
      "serialNumber": 1,
      "status": "PENDING",
      "createdAt": "...",
      "patient": { },
      "doctor": { },
      "queue": { }
    }
  ]
}
```

---

### 3. Accept Request − `PATCH /api/appointments/requests/:id/accept`

**Auth + DOCTOR_ASSISTANT** (no body)

Sets `status: CONFIRMED`, records the assistantId, sends `"Appointment Accepted"` notification.

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Appointment request accepted successfully",
  "data": {
    "id": "appt-uuid-...",
    "status": "CONFIRMED",
    "assistantId": "asst-id-...",
    "patient": {}, "doctor": {}, "queue": { }
  }
}
```

**Error:** `409 "Only pending appointments can be accepted"`.

---

### 4. Reject Request − `PATCH /api/appointments/requests/:id/reject`

**(no body)** Sets `status: REJECTED`, deletes the queue entry, sends `"Appointment Rejected"`.

**Response 200** - `message: "Appointment request rejected successfully"`; `data` = appointment with status `REJECTED`.

---

### 5. Get My Appointments − `GET /api/appointments/my?status=PENDING`

**Auth + PATIENT** - optional `status` query filter (one of AppointmentStatus).

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Appointments retrieved successfully",
  "data": [ { ...appointment (same shape as booking) } ]
}
```

**Error:** `400 "status is invalid"`.

---

### 6. Get All Appointments − `GET /api/appointments/?search=&status=&date=`

**Auth + DOCTOR_ASSISTANT or ADMIN**
- `DOCTOR_ASSISTANT`: only their doctor's appointments.
- `ADMIN`: all appointments.

**Query params:** `search` (patient or doctor name), `status` (AppointmentStatus), `date` (`YYYY-MM-DD`).

**Response 200** - array of appointment objects (full include shape).

---

### 7. Get Appointment By Id − `GET /api/appointments/:id`

**Auth + PATIENT, DOCTOR, or DOCTOR_ASSISTANT**

Ownership enforced per role (patient must be the patient, doctor must be the doctor, assistant must be assigned to that doctor).

**Response 200** - full appointment object.

**Error:** `403 "You do not have access to this appointment"`.

---

### 8. Cancel Appointment (patient) − `PATCH /api/appointments/:id/cancel`

**Auth + PATIENT** - only only OWN appointments.

**Rules:** appointment must be `PENDING` or `CONFIRMED`; must be cancelled ≥ **2 hours** before the slot (this is set by the constant `CANCELLATION_CUTOFF_HOURS = 2` in code).

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Appointment cancelled successfully",
  "data": { "status": "CANCELLED", "...rest of appointment..." }
}
```

Also deletes the queue entry and notifies the doctor.

**Errors:** `409 "Appointment cannot be cancelled in its current status"`, `409 "Appointment can only be cancelled at least 2 hours before the slot"`.

---

### 9. Reschedule − `PATCH /api/appointments/:id/reschedule`

**Auth + DOCTOR_ASSISTANT**

```json
{
  "date": "2026-08-12",
  "timeSlot": "11:00"
}
```

If the date changes, `serialNumber` is recomputed; status resets to `WAITING` queue entry. Sends `"Appointment Rescheduled"`.

**Response 200** - `message: "Appointment rescheduled successfully"`.

**Errors:** `409 "Appointment cannot be rescheduled in its current status"`, `409 "This time slot is no longer available"`.

---

### 10. Cancel By Staff − `PATCH /api/appointments/:id/cancel-by-staff`

**Auth + DOCTOR_ASSISTANT** (no body) - sets `CANCELLED` with the assistant's assistantId, deletes queue, notifies patient.

**Response 200** - `message: "Appointment cancelled successfully"`.

---

### 11. Update Appointment Status − `PATCH /api/appointments/:id/status`

**Auth + DOCTOR_ASSISTANT**

```json
{
  "status": "CONFIRMED"
}
```

- The ONLY accepted value is `"CONFIRMED"` (same as accept - the endpoint intends to confirm a pending appointment).
- `status must be CONFIRMED`, else `400`.

**Sends** `"Appointment Accepted"` notification.

**Response 200** - `message: "Appointment status updated successfully"`.

---

## H. QUEUE `/api/queue`

### 1. Get My Queue − `GET /api/queue/my`

**Auth + PATIENT**

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Queue position retrieved successfully",
  "data": {
    "appointment": {
      "id": "appt-uuid-...",
      "date": "2026-08-08T00:00:00.000Z",
      "timeSlot": "10:15",
      "status": "CONFIRMED",
      "doctor": {
        "id": "71c2fc3b-...",
        "specialization": { "name": "Cardiology" },
        "user": { "id": "...", "fullName": "Dr. Nusrat Jahan", "profilePhoto": null }
      }
    },
    "queue": {
      "id": "queue-uuid-...",
      "serialNumber": 3,
      "status": "WAITING"
    },
    "currentServingSerial": 1,
    "patientsAhead": 2
  }
}
```

The queue is looked up on the patient's **next upcoming** appointment (today or later). **Error:** `404 "No upcoming appointment found"`.

---

### 2. Get Today's Queue − `GET /api/queue/today`

**Auth + DOCTOR_ASSISTANT or DOCTOR** - for the doctor the assistant is assigned to (or the doctor's own queue).

**Sample**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Today's queue retrieved successfully",
  "data": [
    {
      "id": "queue-uuid-1",
      "appointmentId": "appt-...",
      "doctorId": "71c2fc3b-...",
      "serialNumber": 1,
      "status": "COMPLETED",
      "calledAt": "2026-08-08T09:00:00.000Z",
      "completedAt": "2026-08-08T09:15:00.000Z",
      "appointment": {
        "id": "appt-...",
        "date": "...",
        "timeSlot": "09:00",
        "status": "CONFIRMED",
        "patient": {
          "id": "pat-...",
          "userId": "...",
          "user": { "id": "...", "fullName": "Rahim Ahmed", "phone": "+8801712345678", "profilePhoto": null }
        }
      }
    }
  ]
}
```

---

### 3. Call Next − `PATCH /api/queue/:id/call-next`

**Auth + DOCTOR_ASSISTANT** (no body) - marks a `WAITING` entry as `CALLED` (`calledAt` now) and sends a `"Queue Called"` notification.

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Patient called successfully",
  "data": {
    "id": "queue-uuid-...",
    "appointmentId": "...",
    "doctorId": "...",
    "serialNumber": 3,
    "status": "CALLED",
    "calledAt": "2026-08-08T10:20:00.000Z",
    "completedAt": null
  }
}
```

**Errors:** `400 "Only waiting patients can be called"`.

---

### 4. Update Queue Status − `PATCH /api/queue/:id/status`

**Auth + DOCTOR_ASSISTANT**

```json
{
  "status": "IN_CONSULTATION"
}
```

Allowed values: any `QueueStatus` (`WAITING`, `CALLED`, `IN_CONSULTATION`, `COMPLETED`, `ABSENT`, `SKIPPED`).
- Sets `calledAt` when entering `IN_CONSULTATION` (unless already called).
- Sets `completedAt` when set to `COMPLETED`.

**Response 200** - `message: "Queue status updated successfully"`, updated queue object.

**Error:** `400 "status is invalid"`.

---

## I. REVIEWS `/api/reviews`

### 1. Create Review − `POST /api/reviews/`

**Auth + PATIENT**

```json
{
  "appointmentId": "appt-uuid-...",
  "rating": 5,
  "comment": "Very thorough consultation."
}
```

**Rules:**
- `rating` must be an integer 1-5.
- Appointment must belong to this patient.
- Appointment must **not** be `PENDING`, `CANCELLED` or `REJECTED`.
- One review per appointment.

**Response `201`**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Review created successfully",
  "data": {
    "id": "review-uuid-...",
    "patientId": "...",
    "doctorId": "71c2fc3b-...",
    "appointmentId": "appt-uuid-...",
    "rating": 5,
    "comment": "Excellent doctor consultation.",
    "createdAt": "2026-08-08T16:00:00.000Z",
    "patient": { "id": "...", "userId": "...", "doctorId": "..." },
    "doctor": { "id": "71c2fc3b-...", "userId": "...", "consultationFee": 800, "verificationStatus": "APPROVED", "user": { "fullName": "Dr. Nusrat Jahan" }, "specialization": { "name": "Cardiology" } },
    "appointment": { "id": "appt-uuid-...", "date": "2026-08-08T00:00:00.000Z", "timeSlot": "10:00" }
  }
}
```

**Errors:** `400 "rating must be an integer between 1 and 5"`, `409 "This appointment is not eligible for review"`, `409 "You have already reviewed this appointment"`, `403 "You can only review your own appointments"`.

---

### 2. Get My Reviews − `GET /api/reviews/my`

**Auth + PATIENT** - array of the patient's reviews (same include shape).

---

### 3. Get All Reviews − `GET /api/reviews/`

**Auth + ADMIN** - array of all reviews (same shape).

---

### 4. Update Review − `PATCH /api/reviews/:id`

**Auth + PATIENT** (owner only)

```json
{ "rating": 4, "comment": "Good doctor." }
```

**Response 200** - `message: "Review updated successfully"`; updated review. Only the owner can update.

**Errors:** `403 "You can only update your own reviews"`, `400 "At least one field is required"`.

---

### 5. Delete Review − `DELETE /api/reviews/:id`

**Auth + PATIENT (owner) or ADMIN** - recomputes doctor's `averageRating`/`totalReviews`.

**Response 200** - `message: "Review deleted successfully"`; the deleted review object.

---

## J. NOTIFICATIONS `/api/notifications`

**Auth: any authenticated role.**

### 1. `GET /api/notifications/`

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Notifications retrieved successfully",
  "data": [
    {
      "id": "notif-uuid-1",
      "userId": "...",
      "title": "Appointment Accepted",
      "message": "Your appointment with Dr. Nusrat Jahan on 2026-08-10 at 09:30 has been accepted.",
      "isRead": false,
      "createdAt": "2026-08-09T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Mark One Read − `PATCH /api/notifications/:id/read`

**(no body)** → `isRead: true`; returns updated notification.

### 3. Mark All Read − `PATCH /api/notifications/read-all`

**(no body)**

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "All notifications marked as read successfully",
  "data": { "count": 2 }
}
```

### 4. Delete − `DELETE /api/notifications/:id`

**(auth)** - returns deleted notification; `404 "Notification not found"` if it isn't yours.

---

## K. AI CHATBOT `/api/chatbot`

### 1. Ask Chatbot − `POST /api/chatbot/ask`

**Auth + PATIENT**

```json
{
  "symptoms": "I have had chest pain and shortness of breath for 3 days."
}
```

- `symptoms` required, 10-2000 characters.

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Response generated successfully",
  "data": {
    "id": "chat-log-uuid-...",
    "question": "I have had chest pain and shortness of breath for 3 days.",
    "urgencyLevel": "High",
    "suggestion": "Please consult a cardiologist soon. Chest pain with breathlessness can be serious.",
    "specialization": "Cardiology",
    "disclaimer": "This is general health information, not a medical diagnosis. Always consult a qualified doctor.",
    "createdAt": "2026-08-08T17:00:00.000Z"
  }
}
```

**Errors:** `400 "symptoms is required"`, `400 "symptoms must be between 10 and 2000 characters"`, `503 "AI chatbot is not configured"` (missing `OPENAI_API_KEY`), `502 "AI service request failed"`.

---

### 2. Get Chat History − `GET /api/chatbot/history`

**Auth + PATIENT**

**Response 200**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Chat history retrieved successfully",
  "data": [
    {
      "id": "log-uuid...",
      "patientId": "...",
      "question": "I have a fever and headache.",
      "response": "Rest, hydrate...",
      "urgencyLevel": "Medium",
      "suggestedSpecialization": "General Medicine",
      "createdAt": "..."
    }
  ]
}
```

---

## Protected Routes By User Role

Legend: 🔓 Public • `A` = authenticated (any role)

| Route | Method | PATIENT | DOCTOR | ASSISTANT | ADMIN |
|-------|--------|:---:|:---:|:---:|:---:|
| `/api/auth/register/patient` | POST | Public | | | |
| `/api/auth/register/doctor` | POST | Public | | | |
| `/api/auth/register/assistant` | POST | Public | | | |
| `/api/auth/login` | POST | Public | | | |
| `/api/auth/refresh-token` | POST | Public | | | |
| `/api/auth/logout` | POST | A | A | A | A |
| `/api/auth/change-password` | POST | A | A | A | A |
| `/api/auth/forgot-password` | POST | Public | | | |
| `/api/auth/reset-password` | POST | Public | | | |
| `/api/patients/me` | GET/PATCH | ✓ | | | |
| `/api/patients/me/dashboard` | GET | ✓ | | | |
| `/api/doctor/` | GET | Public | | | |
| `/api/doctor/nearby` | GET | ✓ | | | |
| `/api/doctor/:id` | GET | Public | | | |
| `/api/doctor/:id/schedule` | GET | Public | | | |
| `/api/doctor/me` | GET/PATCH | | ✓ | | |
| `/api/doctor/me/dashboard` | GET | | ✓ | | |
| `/api/doctor/me/schedule` | GET/POST | | ✓ | | |
| `/api/doctor/me/schedule/:id` | PATCH/DELETE | | ✓ | | |
| `/api/doctor/me/clinic-location` | PATCH | | ✓ | | |
| `/api/assistant/me` | GET/PATCH | | | ✓ | |
| `/api/assistant/me/dashboard` | GET | | | ✓ | |
| `/api/assistant/me/doctor` | GET | | | ✓ | |
| `/api/admin/dashboard` | GET | | | | ✓ |
| `/api/admin/reports` | GET | | | | ✓ |
| `/api/admin/me` | GET/PATCH | | | | ✓ |
| `/api/admin/doctors/pending` | GET | | | | ✓ |
| `/api/admin/doctors/:id/approve` | PATCH | | | | ✓ |
| `/api/admin/doctors/:id/reject` | PATCH | | | | ✓ |
| `/api/admin/doctors/:id/suspend` | PATCH | | | | ✓ |
| `/api/admin/assistants` | GET | | | | ✓ |
| `/api/admin/assistants/:id/assign-doctor` | PATCH | | | | ✓ |
| `/api/admin/assistants/:id/suspend` | PATCH | | | | ✓ |
| `/api/specializations/` | GET | Public | | | |
| `/api/specializations/` | POST | | | | ✓ |
| `/api/specializations/:id` | PATCH | | | | ✓ |
| `/api/specializations/:id` | DELETE | | | | ✓ |
| `/api/appointments/` | POST | ✓ | | | |
| `/api/appointments/my` | GET | ✓ | | | |
| `/api/appointments/` | GET | | | ✓/ADMIN | ✓ |
| `/api/appointments/requests` | GET | | | ✓ | |
| `/api/appointments/requests/:id/accept` | PATCH | | | ✓ | |
| `/api/appointments/requests/:id/reject` | PATCH | | | ✓ | |
| `/api/appointments/:id` | GET | ✓ | ✓ | ✓ | |
| `/api/appointments/:id/cancel` | PATCH | ✓ | | | |
| `/api/appointments/:id/reschedule` | PATCH | | | ✓ | |
| `/api/appointments/:id/cancel-by-staff` | PATCH | | | ✓ | |
| `/api/appointments/:id/status` | PATCH | | | ✓ | |
| `/api/queue/my` | GET | ✓ | | | |
| `/api/queue/today` | GET | | ✓ | ✓ | |
| `/api/queue/:id/call-next` | PATCH | | | ✓ | |
| `/api/queue/:id/status` | PATCH | | | ✓ | |
| `/api/reviews/` | POST | ✓ | | | |
| `/api/reviews/my` | GET | ✓ | | | |
| `/api/reviews/` | GET | | | | ✓ |
| `/api/reviews/:id` | PATCH | ✓ | | | |
| `/api/reviews/:id` | DELETE | ✓ | | | ✓ |
| `/api/notifications/` | GET | A | A | A | A |
| `/api/notifications/read-all` | PATCH | A | A | A | A |
| `/api/notifications/:id/read` | PATCH | A | A | A | A |
| `/api/notifications/:id` | DELETE | A | A | A | A |
| `/api/chatbot/ask` | POST | ✓ | | | |
| `/api/chatbot/history` | GET | ✓ | | | |

> The `search` module (`src/modules/search`) is a placeholder - its controller, service and route are empty and it is **not** registered in `src/routes/index.ts`. There is no `/api/search` endpoint.

---

## Common Errors

**Validation error example (invalid login missing password):**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "password is required"
}
```

**Unauthorized (no/invalid token):**

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Authentication token is required"
}
```

**Suspended account (middleware `auth`):**

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Account is not active. Please contact support."
}
```

**Role not permitted:**

```json
{
  "success": false,
  "statusCode": 403,
  "message": "You do not have permission to access this resource"
}
```

**Resource not found:**

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Record not found"
}
```

**Duplicate / conflict:**

```json
{
  "success": false,
  "statusCode": 409,
  "message": "Unique constraint violation"
}
```

**Internal error:**

```json
{
  "success": false,
  "statusCode": 500,
  "message": "Internal server error"
}
```

*End of documentation.*
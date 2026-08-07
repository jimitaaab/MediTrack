# Meditrack — Doctor Assistant Planning (Update)

This document updates **only the Doctor Assistant part** of `planning.md`. All other
modules, routes, models, and features (Patient, Doctor, Appointment, Queue, Review,
Notification, Chatbot, Admin core) remain unchanged except where noted below for
authorization/scoping.

---

## Part A — Registration (Public Self-Signup)

The assistant can create their own account. A doctor is **not** selected at
registration — only Admin assigns one afterward.

At registration:
- `doctorId = null`
- `role = DOCTOR_ASSISTANT`
- `status = ACTIVE`

### Files (`src/modules/auth/`)

| # | File | Change |
|---|---|---|
| 1 | `auth.interface.ts` | Add `RegisterAssistantInput extends RegisterPatientInput { designation?: string }` |
| 2 | `auth.validation.ts` | Add `validateRegisterAssistant` using existing `requireText`, `requireEmail`, `optionalText` |
| 3 | `auth.service.ts` | Add `registerAssistant()` |
| 4 | `auth.controller.ts` | Add `registerAssistantController` with HTTP 201 |
| 5 | `auth.routes.ts` | Add `POST /auth/register/assistant` |

### Registration Payload

```json
{
  "fullName": "Rima Khan",
  "email": "rima@clinic.com",
  "password": "123456",
  "phone": "01712345678",
  "designation": "Front Desk"
}
```

`designation` is optional — a request without it is also valid:

```json
{
  "fullName": "Rima Khan",
  "email": "rima@clinic.com",
  "password": "123456",
  "phone": "01712345678"
}
```

### Service Logic

```
Create:
User
 └── role = DOCTOR_ASSISTANT
 └── status = ACTIVE
 └── DoctorAssistant
      ├── designation
      └── doctorId = null
```

The assistant is not assigned to any doctor during signup.

---

## Part B — Login

No separate assistant login system is required. Reuse the existing:

```
POST /api/auth/login
```

```json
{
  "email": "rima@clinic.com",
  "password": "123456"
}
```

The existing login system returns JWT tokens containing `role: DOCTOR_ASSISTANT`.
The assistant then passes `Authorization: Bearer ACCESS_TOKEN`, and the existing
`auth` + `requireRole(DOCTOR_ASSISTANT)` middleware handles the rest.

---

## Part C — Admin Assigns Assistant to Doctor

The assistant cannot select or change their own doctor — only Admin manages the
relationship.

### Files (`src/modules/admin/`)

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/admin/assistants` | ADMIN | List all assistants with user and assigned doctor |
| PATCH | `/admin/assistants/:id/assign-doctor` | ADMIN | Assign or remove assistant from a doctor |
| PATCH | `/admin/assistants/:id/suspend` | ADMIN | Suspend assistant account |

### Assign Doctor

```
PATCH /api/admin/assistants/:id/assign-doctor
```

```json
{
  "doctorId": "DOCTOR_ID"
}
```

### Remove Doctor Assignment

```json
{
  "doctorId": null
}
```

Before assigning:
1. Verify assistant exists.
2. Verify the target doctor exists.
3. Update `DoctorAssistant.doctorId`.
4. Trigger the existing `notifyAssistantAssigned` notification.

---

## Part D — Assistant Profile

The assistant can manage their own basic profile only — `doctorId` is never
editable through this endpoint.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/assistant/me` | DOCTOR_ASSISTANT | View own profile |
| PATCH | `/assistant/me` | DOCTOR_ASSISTANT | Update own profile |
| GET | `/assistant/me/dashboard` | DOCTOR_ASSISTANT | Assistant dashboard |
| GET | `/assistant/me/doctor` | DOCTOR_ASSISTANT | View assigned doctor profile and schedule |

---

## Part E — Assistant Dashboard

```
GET /api/assistant/me/dashboard
```

Display:

**Assistant Information**
- Name
- Email
- Phone
- Designation

**Assigned Doctor**
- Doctor name
- Specialization
- Hospital/clinic
- Doctor availability

**Today's Queue**
- Current patient
- Next patient
- Remaining patients
- Current serial number
- Queue status

**Appointments**
- Today's appointments
- Pending appointment requests
- Accepted appointments
- Completed appointments

If the assistant has no doctor assigned, the dashboard should clearly show:

> **No doctor assigned yet. Please contact the administrator.**

---

## Part F — Assigned Doctor

```
GET /api/assistant/me/doctor
```

Returns the assistant's assigned doctor's:
- Basic profile
- Specialization
- Hospital/clinic information
- Consultation fee
- Clinic location
- Schedule

The assistant can only see their own assigned doctor. If `doctorId = null`, return
a response indicating no doctor has been assigned.

---

## Part G — Appointment Management

The assistant manages appointment operations for their assigned doctor only.

| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/appointments/requests` | DOCTOR_ASSISTANT | View pending requests for assigned doctor |
| PATCH | `/appointments/requests/:id/accept` | DOCTOR_ASSISTANT | Accept appointment |
| PATCH | `/appointments/requests/:id/reject` | DOCTOR_ASSISTANT | Reject appointment |
| GET | `/appointments` | DOCTOR_ASSISTANT | View assigned doctor's appointments |
| GET | `/appointments/:id` | DOCTOR_ASSISTANT | View appointment details |
| PATCH | `/appointments/:id/reschedule` | DOCTOR_ASSISTANT | Reschedule appointment |
| PATCH | `/appointments/:id/cancel-by-staff` | DOCTOR_ASSISTANT | Cancel appointment |
| PATCH | `/appointments/:id/status` | DOCTOR_ASSISTANT | Update appointment status |

---

## Part H — Doctor Scoping / Authorization (Required)

An assistant can only manage appointments and queue entries belonging to their
assigned doctor.

```
Assistant A
     ↓
Assigned to Doctor A
```

Assistant A can manage Doctor A's appointments and queue — **not** Doctor B's.

### Backend Check

```
1. Authenticate user
        ↓
2. Verify role = DOCTOR_ASSISTANT
        ↓
3. Get assistant's doctorId
        ↓
4. Get appointment's doctorId
        ↓
5. Compare both IDs
        ↓
6. Match → Allow
7. Different → 403 Forbidden
```

Apply this check to: view appointment, accept, reject, reschedule, staff
cancellation, status update, appointment list, pending requests.

---

## Part I — Queue Management

The assistant manages the queue of their assigned doctor only.

| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/queue/today` | DOCTOR_ASSISTANT | View today's assigned doctor's queue |
| PATCH | `/queue/:id/call-next` | DOCTOR_ASSISTANT | Call next patient |
| PATCH | `/queue/:id/status` | DOCTOR_ASSISTANT | Update queue status |

### Serial System Example

```
Serial 1 → COMPLETED
Serial 2 → WAITING
Serial 3 → WAITING
```

Assistant clicks **Call Next**:

```
Serial 1 → COMPLETED
Serial 2 → CALLED
Serial 3 → WAITING
```

After Serial 2 is completed:

```
Serial 2 → COMPLETED
Serial 3 → CALLED
```

The same doctor-scoping check from Part H applies to all queue operations.

---

## Part J — Appointment → Queue Relationship

When an appointment is accepted and the queue is created, the patient receives a
serial number.

```
Patient: John Patient
Doctor: Dr. John
Appointment: 10:00 AM
Serial: 3
```

- Patient checks position: `GET /api/queue/my`
- Assistant manages the queue: `GET /api/queue/today`, `PATCH /api/queue/:id/call-next`

---

## Part K — Assistant–Appointment Relationship

`DoctorAssistant` should be able to track which assistant processed an appointment.

```
DoctorAssistant
      │
      └── appointments[]

Appointment
 ├── patientId
 ├── doctorId
 └── assistantId?
```

`assistantId` is optional because an appointment may exist before an assistant
processes it. When the assistant accepts/processes the appointment, the system can
associate the assistant where appropriate.

---

## Part L — Admin Suspension

```
PATCH /api/admin/assistants/:id/suspend
```

This changes `User.status = SUSPENDED`. A suspended assistant should not be able to
perform authenticated assistant operations. No separate delete/remove feature is
required at this stage.

---

## Part M — Notifications

Reuse the existing notification system for assistant-related events:

- **Admin assigns assistant** → *"You have been assigned to Dr. John."*
- **Appointment request arrives** → *"New appointment request for Dr. John."*
- **Appointment accepted** → patient receives *"Your appointment has been accepted."*
- **Appointment rejected** → patient receives *"Your appointment request has been rejected."*

No separate notification system is needed for the assistant.

---

## Part N — Data Model

The existing `DoctorAssistant` model represents:

```
DoctorAssistant
├── id
├── userId → User
├── designation?
├── doctorId → Doctor?
└── appointments[]
```

`doctorId = null` is allowed because the assistant can register before being
assigned to a doctor.

```
User
  │
  └── DoctorAssistant
          │
          └── doctorId → Doctor
```

One doctor can have multiple assistants; an assistant belongs to at most one doctor
at a time.

> This model already matches `prisma/schema/models/doctor-assistant.model.prisma` in
> planning.md — no schema changes are required for this update.

---

## Part O — Verification Checklist

1. **Type check**
   ```
   npx tsc --noEmit
   ```

2. **Test registration**
   ```
   POST /api/auth/register/assistant
   ```
   ```json
   {
     "fullName": "Rima Khan",
     "email": "assistant@test.com",
     "password": "123456",
     "phone": "01712345678",
     "designation": "Front Desk"
   }
   ```

3. **Login**
   ```
   POST /api/auth/login
   ```
   ```json
   {
     "email": "assistant@test.com",
     "password": "123456"
   }
   ```

4. **Test dashboard**
   ```
   GET /api/assistant/me/dashboard
   ```
   Confirm `doctorId = null` is handled correctly (shows the "no doctor assigned" message).

5. **Admin assigns doctor**
   ```
   PATCH /api/admin/assistants/:id/assign-doctor
   ```
   ```json
   { "doctorId": "DOCTOR_ID" }
   ```

6. **Test assigned doctor**
   ```
   GET /api/assistant/me/doctor
   ```

7. **Test appointment scoping**
   - ✅ Can manage assigned doctor's appointments
   - ❌ Cannot manage another doctor's appointments

8. **Test queue scoping**
   - ✅ Can manage assigned doctor's queue
   - ❌ Cannot manage another doctor's queue

9. **Test suspension**
   - Admin suspends the assistant; verify the assistant can no longer access
     protected assistant functionality.

---

## Final Doctor Assistant Flow

```
                PUBLIC
                  │
                  ▼
          Assistant Signup
                  │
                  ▼
          Assistant Account
          doctorId = null
                  │
                  ▼
             Assistant Login
                  │
                  ▼
        ┌─────────────────────┐
        │   Admin Dashboard   │
        │                     │
        │ Assign Assistant    │
        │       ↓             │
        │     Doctor          │
        └─────────┬───────────┘
                  │
                  ▼
          doctorId = Doctor ID
                  │
                  ▼
          Assistant Dashboard
                  │
        ┌─────────┴───────────┐
        ▼                     ▼
   Appointments             Queue
        │                     │
        ▼                     ▼
 Accept/Reject            Call Next
 Reschedule               Update Status
 Cancel
 Status Update
        │                     │
        └─────────┬───────────┘
                  ▼
          ONLY assigned doctor's
          data can be accessed
```

---

## Scope Note

This document keeps the Doctor Assistant changes isolated to the
**Assistant / Auth / Admin** integration and does not require changing the
Patient, Doctor, Appointment, Queue, Review, Notification, or Chatbot feature
plans in `planning.md` beyond the necessary assistant authorization/scoping
described in **Part H**.

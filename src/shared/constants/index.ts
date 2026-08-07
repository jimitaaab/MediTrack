export const Roles = {
  PATIENT: "PATIENT",
  DOCTOR: "DOCTOR",
  DOCTOR_ASSISTANT: "DOCTOR_ASSISTANT",
  ADMIN: "ADMIN",
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

export const Genders = {
  MALE: "MALE",
  FEMALE: "FEMALE",
  OTHER: "OTHER",
} as const;

export const AccountStatuses = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

export const AppointmentStatuses = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
} as const;

export const DoctorVerificationStatuses = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const QueueStatuses = {
  WAITING: "WAITING",
  CALLED: "CALLED",
  IN_CONSULTATION: "IN_CONSULTATION",
  COMPLETED: "COMPLETED",
  ABSENT: "ABSENT",
  SKIPPED: "SKIPPED",
} as const;
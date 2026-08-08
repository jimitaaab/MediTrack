export const AccountStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

export const AppointmentStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
} as const;

export const Gender = {
  MALE: "MALE",
  FEMALE: "FEMALE",
  OTHER: "OTHER",
} as const;

export const QueueStatus = {
  WAITING: "WAITING",
  CALLED: "CALLED",
  IN_CONSULTATION: "IN_CONSULTATION",
  COMPLETED: "COMPLETED",
  ABSENT: "ABSENT",
  SKIPPED: "SKIPPED",
} as const;

export const Role = {
  PATIENT: "PATIENT",
  DOCTOR: "DOCTOR",
  DOCTOR_ASSISTANT: "DOCTOR_ASSISTANT",
  ADMIN: "ADMIN",
} as const;

export const Weekday = {
  SUNDAY: "SUNDAY",
  MONDAY: "MONDAY",
  TUESDAY: "TUESDAY",
  WEDNESDAY: "WEDNESDAY",
  THURSDAY: "THURSDAY",
  FRIDAY: "FRIDAY",
  SATURDAY: "SATURDAY",
} as const;

export const DoctorVerificationStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export class PrismaClientKnownRequestError extends Error {
  code: string;
  meta?: unknown;
  constructor(message: string, code: string, meta?: unknown) {
    super(message);
    this.name = "PrismaClientKnownRequestError";
    this.code = code;
    this.meta = meta;
  }
}

export class PrismaClientValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrismaClientValidationError";
  }
}

export const Prisma = {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
};
import {
  AccountStatuses,
  AppointmentStatuses,
  DoctorVerificationStatuses,
  Genders,
  QueueStatuses,
  Roles,
} from "./index";

describe("shared constants", () => {
  it("Roles exposes all role values", () => {
    expect(Roles.PATIENT).toBe("PATIENT");
    expect(Roles.DOCTOR).toBe("DOCTOR");
    expect(Roles.DOCTOR_ASSISTANT).toBe("DOCTOR_ASSISTANT");
    expect(Roles.ADMIN).toBe("ADMIN");
    expect(Object.values(Roles)).toHaveLength(4);
  });

  it("Genders exposes all genders", () => {
    expect(Genders.MALE).toBe("MALE");
    expect(Genders.FEMALE).toBe("FEMALE");
    expect(Genders.OTHER).toBe("OTHER");
  });

  it("AccountStatuses exposes all statuses", () => {
    expect(AccountStatuses.ACTIVE).toBe("ACTIVE");
    expect(AccountStatuses.INACTIVE).toBe("INACTIVE");
    expect(AccountStatuses.SUSPENDED).toBe("SUSPENDED");
  });

  it("AppointmentStatuses exposes all appointment statuses", () => {
    expect(AppointmentStatuses.PENDING).toBe("PENDING");
    expect(AppointmentStatuses.CONFIRMED).toBe("CONFIRMED");
    expect(AppointmentStatuses.COMPLETED).toBe("COMPLETED");
    expect(AppointmentStatuses.CANCELLED).toBe("CANCELLED");
    expect(AppointmentStatuses.REJECTED).toBe("REJECTED");
  });

  it("DoctorVerificationStatuses exposes all verification statuses", () => {
    expect(DoctorVerificationStatuses.PENDING).toBe("PENDING");
    expect(DoctorVerificationStatuses.APPROVED).toBe("APPROVED");
    expect(DoctorVerificationStatuses.REJECTED).toBe("REJECTED");
  });

  it("QueueStatuses exposes all queue statuses", () => {
    expect(QueueStatuses.WAITING).toBe("WAITING");
    expect(QueueStatuses.CALLED).toBe("CALLED");
    expect(QueueStatuses.IN_CONSULTATION).toBe("IN_CONSULTATION");
    expect(QueueStatuses.COMPLETED).toBe("COMPLETED");
    expect(QueueStatuses.ABSENT).toBe("ABSENT");
    expect(QueueStatuses.SKIPPED).toBe("SKIPPED");
  });
});
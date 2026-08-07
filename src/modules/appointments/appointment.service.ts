import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../config/prisma";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors";
import { AppointmentStatus, QueueStatus, Role } from "../../../generated/prisma/client";
import { getDoctorSlotsForDate } from "../doctors/doctor.service";
import {
  notifyAppointmentAccepted,
  notifyAppointmentCancelledToDoctor,
  notifyAppointmentCancelledToPatient,
  notifyAppointmentRejected,
  notifyAppointmentRescheduled,
} from "../notifications/notification.service";
import type {
  BookAppointmentInput,
  ListAppointmentsParams,
  RescheduleAppointmentInput,
} from "./appointment.interface";

const CANCELLATION_CUTOFF_HOURS = 2;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const appointmentInclude = {
  patient: {
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          profilePhoto: true,
        },
      },
    },
  },
  doctor: {
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          profilePhoto: true,
        },
      },
      specialization: true,
    },
  },
  queue: true,
} as const;

const validateTime = (value: unknown): string => {
  if (typeof value !== "string" || !TIME_RE.test(value)) {
    throw new ValidationError("timeSlot must be in HH:MM format");
  }
  return value;
};

const getPatientByUserId = async (userId: string) => {
  const patient = await prisma.patient.findUnique({ where: { userId } });
  if (!patient) {
    throw new NotFoundError("Patient profile not found");
  }
  return patient;
};

export const bookAppointment = async (
  userId: string,
  payload: BookAppointmentInput,
) => {
  const patient = await getPatientByUserId(userId);
  const { date, slots } = await getDoctorSlotsForDate(
    payload.doctorId,
    payload.date,
  );
  const timeSlot = validateTime(payload.timeSlot);
  if (!slots.includes(timeSlot)) {
    throw new ValidationError("timeSlot is not available for the selected date");
  }

  const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const conflicting = await tx.appointment.count({
      where: {
        doctorId: payload.doctorId,
        date: { gte: date, lt: nextDay },
        timeSlot,
        status: {
          notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.REJECTED],
        },
      },
    });
    if (conflicting > 0) {
      throw new ConflictError("This time slot is no longer available");
    }

    const existingCount = await tx.appointment.count({
      where: {
        doctorId: payload.doctorId,
        date: { gte: date, lt: nextDay },
      },
    });
    const serialNumber = existingCount + 1;

    const appointment = await tx.appointment.create({
      data: {
        patientId: patient.id,
        doctorId: payload.doctorId,
        date,
        timeSlot,
        serialNumber,
        status: AppointmentStatus.PENDING,
      },
    });

    await tx.queue.create({
      data: {
        appointmentId: appointment.id,
        doctorId: payload.doctorId,
        serialNumber,
        status: QueueStatus.WAITING,
      },
    });

    return tx.appointment.findUnique({
      where: { id: appointment.id },
      include: appointmentInclude,
    });
  });
};

export const getMyAppointments = async (userId: string, status?: string) => {
  const patient = await getPatientByUserId(userId);

  const where: Prisma.AppointmentWhereInput = { patientId: patient.id };
  if (status) {
    if (!(status in AppointmentStatus)) {
      throw new ValidationError("status is invalid");
    }
    where.status = status as AppointmentStatus;
  }

  return prisma.appointment.findMany({
    where,
    include: appointmentInclude,
    orderBy: { date: "desc" },
  });
};

export const getAppointmentById = async (
  userId: string,
  role: string,
  appointmentId: string,
) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: appointmentInclude,
  });
  if (!appointment) {
    throw new NotFoundError("Appointment not found");
  }

  if (role === Role.PATIENT) {
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient || appointment.patientId !== patient.id) {
      throw new ForbiddenError("You do not have access to this appointment");
    }
  } else if (role === Role.DOCTOR) {
    const doctor = await prisma.doctor.findUnique({ where: { userId } });
    if (!doctor || appointment.doctorId !== doctor.id) {
      throw new ForbiddenError("You do not have access to this appointment");
    }
  } else if (role === Role.DOCTOR_ASSISTANT) {
    const assistant = await prisma.doctorAssistant.findUnique({
      where: { userId },
    });
    if (
      !assistant ||
      !assistant.doctorId ||
      appointment.doctorId !== assistant.doctorId
    ) {
      throw new ForbiddenError("You do not have access to this appointment");
    }
  } else {
    throw new ForbiddenError("You do not have access to this appointment");
  }

  return appointment;
};

export const cancelAppointment = async (
  userId: string,
  appointmentId: string,
) => {
  const patient = await getPatientByUserId(userId);

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, patientId: patient.id },
    include: { queue: true },
  });
  if (!appointment) {
    throw new NotFoundError("Appointment not found");
  }

  if (
    appointment.status !== AppointmentStatus.PENDING &&
    appointment.status !== AppointmentStatus.CONFIRMED
  ) {
    throw new ConflictError("Appointment cannot be cancelled in its current status");
  }

  const slotTime = new Date(
    `${appointment.date.toISOString().slice(0, 10)}T${appointment.timeSlot}:00.000Z`,
  );
  const cutoff = new Date(
    slotTime.getTime() - CANCELLATION_CUTOFF_HOURS * 60 * 60 * 1000,
  );
  if (new Date() >= cutoff) {
    throw new ConflictError(
      `Appointment can only be cancelled at least ${CANCELLATION_CUTOFF_HOURS} hours before the slot`,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CANCELLED },
    });
    if (appointment.queue) {
      await tx.queue.delete({ where: { id: appointment.queue.id } });
    }
  });

  await notifyAppointmentCancelledToDoctor(appointmentId);

  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: appointmentInclude,
  });
};

const getAssistantByUserId = async (userId: string) => {
  const assistant = await prisma.doctorAssistant.findUnique({
    where: { userId },
  });
  if (!assistant) {
    throw new NotFoundError("Assistant profile not found");
  }
  return assistant;
};

const getAssistantDoctorId = async (userId: string): Promise<string> => {
  const assistant = await getAssistantByUserId(userId);
  if (!assistant.doctorId) {
    throw new ForbiddenError("Assistant is not assigned to a doctor");
  }
  return assistant.doctorId;
};

const getAssistantContext = async (
  userId: string,
): Promise<{ assistantId: string; doctorId: string }> => {
  const assistant = await getAssistantByUserId(userId);
  if (!assistant.doctorId) {
    throw new ForbiddenError("Assistant is not assigned to a doctor");
  }
  return { assistantId: assistant.id, doctorId: assistant.doctorId };
};

const getDoctorAppointmentOrThrow = async (
  doctorId: string,
  appointmentId: string,
) => {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, doctorId },
    include: { queue: true },
  });
  if (!appointment) {
    throw new NotFoundError("Appointment not found");
  }
  return appointment;
};

export const getAllAppointments = async (
  userId: string,
  role: string,
  params: ListAppointmentsParams,
) => {
  let doctorId: string | undefined;
  if (role === Role.DOCTOR_ASSISTANT) {
    doctorId = await getAssistantDoctorId(userId);
  }

  const where: Prisma.AppointmentWhereInput = {};
  if (doctorId) {
    where.doctorId = doctorId;
  }
  if (params.status) {
    if (!(params.status in AppointmentStatus)) {
      throw new ValidationError("status is invalid");
    }
    where.status = params.status as AppointmentStatus;
  }
  if (params.date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
      throw new ValidationError("date must be in YYYY-MM-DD format");
    }
    const date = new Date(`${params.date}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new ValidationError("date must be a valid date");
    }
    const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    where.date = { gte: date, lt: nextDay };
  }
  if (params.search) {
    where.OR = [
      {
        patient: {
          user: { fullName: { contains: params.search, mode: "insensitive" } },
        },
      },
      {
        doctor: {
          user: { fullName: { contains: params.search, mode: "insensitive" } },
        },
      },
    ];
  }

  return prisma.appointment.findMany({
    where,
    include: appointmentInclude,
    orderBy: { date: "desc" },
  });
};

export const getPendingRequests = async (userId: string) => {
  const assistant = await getAssistantByUserId(userId);
  if (!assistant.doctorId) {
    return [];
  }
  return prisma.appointment.findMany({
    where: {
      doctorId: assistant.doctorId,
      status: AppointmentStatus.PENDING,
    },
    include: appointmentInclude,
    orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
  });
};

export const acceptRequest = async (userId: string, appointmentId: string) => {
  const { assistantId, doctorId } = await getAssistantContext(userId);
  const appointment = await getDoctorAppointmentOrThrow(doctorId, appointmentId);
  if (appointment.status !== AppointmentStatus.PENDING) {
    throw new ConflictError("Only pending appointments can be accepted");
  }
  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.CONFIRMED, assistantId },
    include: appointmentInclude,
  });
  await notifyAppointmentAccepted(appointmentId);
  return updated;
};

export const rejectRequest = async (userId: string, appointmentId: string) => {
  const { assistantId, doctorId } = await getAssistantContext(userId);
  const appointment = await getDoctorAppointmentOrThrow(doctorId, appointmentId);
  if (appointment.status !== AppointmentStatus.PENDING) {
    throw new ConflictError("Only pending appointments can be rejected");
  }

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.REJECTED, assistantId },
    });
    if (appointment.queue) {
      await tx.queue.delete({ where: { id: appointment.queue.id } });
    }
  });

  await notifyAppointmentRejected(appointmentId);

  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: appointmentInclude,
  });
};

export const rescheduleAppointment = async (
  userId: string,
  appointmentId: string,
  payload: RescheduleAppointmentInput,
) => {
  const { assistantId, doctorId } = await getAssistantContext(userId);
  const appointment = await getDoctorAppointmentOrThrow(doctorId, appointmentId);
  if (
    appointment.status !== AppointmentStatus.PENDING &&
    appointment.status !== AppointmentStatus.CONFIRMED
  ) {
    throw new ConflictError("Appointment cannot be rescheduled in its current status");
  }

  const { date, slots } = await getDoctorSlotsForDate(doctorId, payload.date);
  const timeSlot = validateTime(payload.timeSlot);
  if (!slots.includes(timeSlot)) {
    throw new ValidationError("timeSlot is not available for the selected date");
  }

  const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);

  const updated = await prisma.$transaction(async (tx) => {
    const conflicting = await tx.appointment.count({
      where: {
        doctorId,
        date: { gte: date, lt: nextDay },
        timeSlot,
        status: {
          notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.REJECTED],
        },
        id: { not: appointmentId },
      },
    });
    if (conflicting > 0) {
      throw new ConflictError("This time slot is no longer available");
    }

    const dateChanged = date.getTime() !== appointment.date.getTime();
    let serialNumber = appointment.serialNumber;
    if (dateChanged) {
      const existingCount = await tx.appointment.count({
        where: {
          doctorId,
          date: { gte: date, lt: nextDay },
        },
      });
      serialNumber = existingCount + 1;
    }

    await tx.appointment.update({
      where: { id: appointmentId },
      data: { date, timeSlot, serialNumber, assistantId },
    });

    await tx.queue.update({
      where: { appointmentId },
      data: { serialNumber, status: QueueStatus.WAITING },
    });

    return tx.appointment.findUnique({
      where: { id: appointmentId },
      include: appointmentInclude,
    });
  });

  await notifyAppointmentRescheduled(appointmentId);

  return updated;
};

export const cancelByStaff = async (userId: string, appointmentId: string) => {
  const { assistantId, doctorId } = await getAssistantContext(userId);
  const appointment = await getDoctorAppointmentOrThrow(doctorId, appointmentId);
  if (
    appointment.status !== AppointmentStatus.PENDING &&
    appointment.status !== AppointmentStatus.CONFIRMED
  ) {
    throw new ConflictError("Appointment cannot be cancelled in its current status");
  }

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CANCELLED, assistantId },
    });
    if (appointment.queue) {
      await tx.queue.delete({ where: { id: appointment.queue.id } });
    }
  });

  await notifyAppointmentCancelledToPatient(appointmentId);

  return prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: appointmentInclude,
  });
};

export const updateAppointmentStatus = async (
  userId: string,
  appointmentId: string,
  status: unknown,
) => {
  const { assistantId, doctorId } = await getAssistantContext(userId);
  const appointment = await getDoctorAppointmentOrThrow(doctorId, appointmentId);
  if (status !== AppointmentStatus.CONFIRMED) {
    throw new ValidationError("status must be CONFIRMED");
  }
  if (appointment.status !== AppointmentStatus.PENDING) {
    throw new ConflictError("Only pending appointments can be confirmed");
  }
  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.CONFIRMED, assistantId },
    include: appointmentInclude,
  });
  await notifyAppointmentAccepted(appointmentId);
  return updated;
};

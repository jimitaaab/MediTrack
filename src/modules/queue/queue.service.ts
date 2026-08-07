import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../config/prisma";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors";
import { AppointmentStatus, QueueStatus, Role } from "../../../generated/prisma/client";
import { notifyQueueCalled } from "../notifications/notification.service";

const getTodayRange = () => {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
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

const getDoctorQueueEntryOrThrow = async (
  doctorId: string,
  queueId: string,
) => {
  const queueEntry = await prisma.queue.findFirst({
    where: { id: queueId, doctorId },
  });
  if (!queueEntry) {
    throw new NotFoundError("Queue entry not found");
  }
  return queueEntry;
};

export const getMyQueue = async (userId: string) => {
  const patient = await prisma.patient.findUnique({ where: { userId } });
  if (!patient) {
    throw new NotFoundError("Patient profile not found");
  }

  const { start } = getTodayRange();

  const appointment = await prisma.appointment.findFirst({
    where: {
      patientId: patient.id,
      date: { gte: start },
      status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
    },
    orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
    include: {
      queue: true,
      doctor: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              profilePhoto: true,
            },
          },
          specialization: true,
        },
      },
    },
  });
  if (!appointment || !appointment.queue) {
    throw new NotFoundError("No upcoming appointment found");
  }

  const nextDay = new Date(appointment.date.getTime() + 24 * 60 * 60 * 1000);
  const currentServing = await prisma.queue.findFirst({
    where: {
      doctorId: appointment.doctorId,
      status: { in: [QueueStatus.IN_CONSULTATION, QueueStatus.CALLED] },
      appointment: { date: { gte: appointment.date, lt: nextDay } },
    },
    orderBy: { serialNumber: "desc" },
    select: { serialNumber: true },
  });
  const currentServingSerial = currentServing?.serialNumber ?? 0;
  const patientsAhead = Math.max(
    0,
    appointment.queue.serialNumber - currentServingSerial,
  );

  return {
    appointment: {
      id: appointment.id,
      date: appointment.date,
      timeSlot: appointment.timeSlot,
      status: appointment.status,
      doctor: appointment.doctor,
    },
    queue: {
      id: appointment.queue.id,
      serialNumber: appointment.queue.serialNumber,
      status: appointment.queue.status,
    },
    currentServingSerial,
    patientsAhead,
  };
};

export const getTodayQueue = async (userId: string, role: string) => {
  let doctorId: string;
  if (role === Role.DOCTOR) {
    const doctor = await prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) {
      throw new NotFoundError("Doctor profile not found");
    }
    doctorId = doctor.id;
  } else {
    doctorId = await getAssistantDoctorId(userId);
  }

  const { start, end } = getTodayRange();

  return prisma.queue.findMany({
    where: {
      doctorId,
      appointment: { date: { gte: start, lt: end } },
    },
    orderBy: { serialNumber: "asc" },
    include: {
      appointment: {
        include: {
          patient: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  phone: true,
                  profilePhoto: true,
                },
              },
            },
          },
        },
      },
    },
  });
};

export const callNext = async (userId: string, queueId: string) => {
  const doctorId = await getAssistantDoctorId(userId);
  const queueEntry = await getDoctorQueueEntryOrThrow(doctorId, queueId);
  if (queueEntry.status !== QueueStatus.WAITING) {
    throw new ValidationError("Only waiting patients can be called");
  }
  const updated = await prisma.queue.update({
    where: { id: queueId },
    data: { status: QueueStatus.CALLED, calledAt: new Date() },
  });
  await notifyQueueCalled(queueId);
  return updated;
};

export const updateQueueStatus = async (
  userId: string,
  queueId: string,
  status: unknown,
) => {
  const doctorId = await getAssistantDoctorId(userId);
  const queueEntry = await getDoctorQueueEntryOrThrow(doctorId, queueId);
  if (typeof status !== "string" || !(status in QueueStatus)) {
    throw new ValidationError("status is invalid");
  }
  const nextStatus = status as QueueStatus;

  const data: Prisma.QueueUncheckedUpdateInput = { status: nextStatus };
  if (nextStatus === QueueStatus.IN_CONSULTATION && !queueEntry.calledAt) {
    data.calledAt = new Date();
  }
  if (nextStatus === QueueStatus.COMPLETED) {
    data.completedAt = new Date();
  }

  return prisma.queue.update({
    where: { id: queueId },
    data,
  });
};

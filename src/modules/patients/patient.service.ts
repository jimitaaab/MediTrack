import { Prisma } from "../../../generated/prisma/client";
import {
  AppointmentStatus,
  Gender,
} from "../../../generated/prisma/client";
import { prisma } from "../../config/prisma";
import { NotFoundError, ValidationError } from "../../shared/errors";
import type { UpdatePatientProfileInput } from "./patient.interface";

const patientInclude = {
  patient: true,
} as const;

export const getOwnProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: patientInclude,
  });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return user;
};

export const updateOwnProfile = async (
  userId: string,
  payload: UpdatePatientProfileInput,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: patientInclude,
  });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  if (!user.patient) {
    throw new NotFoundError("Patient profile not found");
  }

  const userData = {} as Prisma.UserUpdateInput;
  if (typeof payload.fullName === "string" && payload.fullName.trim()) {
    userData.fullName = payload.fullName.trim();
  }
  if (typeof payload.phone === "string") {
    userData.phone = payload.phone;
  }
  if (typeof payload.profilePhoto === "string") {
    userData.profilePhoto = payload.profilePhoto;
  }

  const patientData = {} as Prisma.PatientUncheckedUpdateInput;
  if (payload.dateOfBirth !== undefined) {
    const date = new Date(payload.dateOfBirth);
    if (Number.isNaN(date.getTime())) {
      throw new ValidationError("dateOfBirth must be a valid date");
    }
    patientData.dateOfBirth = date;
  }
  if (payload.gender !== undefined) {
    if (!Object.values(Gender).includes(payload.gender as Gender)) {
      throw new ValidationError("Invalid gender value");
    }
    patientData.gender = payload.gender as Gender;
  }
  if (typeof payload.bloodGroup === "string") {
    patientData.bloodGroup = payload.bloodGroup;
  }

  const hasUpdates =
    Object.keys(userData).length > 0 || Object.keys(patientData).length > 0;
  if (!hasUpdates) {
    return user;
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: userData }),
    prisma.patient.update({ where: { userId }, data: patientData }),
  ]);

  return getOwnProfile(userId);
};

const getTodayRange = () => {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
};

const patientAppointmentInclude = {
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
} as const;

export const getDashboard = async (userId: string) => {
  const patient = await prisma.patient.findUnique({
    where: { userId },
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
  });
  if (!patient) {
    throw new NotFoundError("Patient profile not found");
  }

  const { start } = getTodayRange();

  const upcomingAppointment = await prisma.appointment.findFirst({
    where: {
      patientId: patient.id,
      date: { gte: start },
      status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
    },
    orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
    include: patientAppointmentInclude,
  });

  const [total, pending, confirmed, completed, cancelled, reviewsCount] =
    await Promise.all([
      prisma.appointment.count({ where: { patientId: patient.id } }),
      prisma.appointment.count({
        where: { patientId: patient.id, status: AppointmentStatus.PENDING },
      }),
      prisma.appointment.count({
        where: { patientId: patient.id, status: AppointmentStatus.CONFIRMED },
      }),
      prisma.appointment.count({
        where: { patientId: patient.id, status: AppointmentStatus.COMPLETED },
      }),
      prisma.appointment.count({
        where: { patientId: patient.id, status: AppointmentStatus.CANCELLED },
      }),
      prisma.review.count({ where: { patientId: patient.id } }),
    ]);

  const recentAppointments = await prisma.appointment.findMany({
    where: { patientId: patient.id },
    orderBy: { date: "desc" },
    take: 5,
    include: patientAppointmentInclude,
  });

  return {
    welcome: {
      fullName: patient.user.fullName,
      email: patient.user.email,
      profilePhoto: patient.user.profilePhoto,
    },
    totals: { total, pending, confirmed, completed, cancelled, reviewsCount },
    upcomingAppointment,
    recentAppointments,
  };
};
import { Prisma } from "../../../generated/prisma/client";
import { AppointmentStatus, QueueStatus } from "../../../generated/prisma/client";
import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../shared/errors";

interface UpdateAssistantProfileInput {
  fullName?: string;
  phone?: string;
  profilePhoto?: string;
  designation?: string;
}

const assistantInclude = {
  assistant: true,
} as const;

export const getOwnProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: assistantInclude,
  });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return user;
};

export const updateOwnProfile = async (
  userId: string,
  payload: UpdateAssistantProfileInput,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: assistantInclude,
  });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  if (!user.assistant) {
    throw new NotFoundError("Assistant profile not found");
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

  const assistantData = {} as Prisma.DoctorAssistantUncheckedUpdateInput;
  if (typeof payload.designation === "string") {
    assistantData.designation = payload.designation;
  }

  const hasUpdates =
    Object.keys(userData).length > 0 || Object.keys(assistantData).length > 0;
  if (!hasUpdates) {
    return user;
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: userData }),
    prisma.doctorAssistant.update({ where: { userId }, data: assistantData }),
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

export const getAssignedDoctor = async (userId: string) => {
  const assistant = await prisma.doctorAssistant.findUnique({
    where: { userId },
  });
  if (!assistant) {
    throw new NotFoundError("Assistant profile not found");
  }
  if (!assistant.doctorId) {
    return { doctor: null, message: "No doctor assigned yet" };
  }
  const doctor = await prisma.doctor.findUnique({
    where: { id: assistant.doctorId },
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
      schedules: true,
    },
  });
  if (!doctor) {
    return { doctor: null, message: "No doctor assigned yet" };
  }
  return { doctor, message: null };
};

export const getDashboard = async (userId: string) => {
  const assistant = await prisma.doctorAssistant.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          profilePhoto: true,
        },
      },
    },
  });
  if (!assistant) {
    throw new NotFoundError("Assistant profile not found");
  }

  const { start, end } = getTodayRange();

  let doctor = null;
  if (assistant.doctorId) {
    doctor = await prisma.doctor.findUnique({
      where: { id: assistant.doctorId },
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
    });
  }

  const doctorId = assistant.doctorId;

  const todayQueue = doctorId
    ? await prisma.queue.findMany({
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
      })
    : [];

  const [todayAppointments, pendingAppointments] = await Promise.all([
    doctorId
      ? prisma.appointment.count({
          where: {
            doctorId,
            date: { gte: start, lt: end },
            status: {
              in: [
                AppointmentStatus.PENDING,
                AppointmentStatus.CONFIRMED,
              ],
            },
          },
        })
      : Promise.resolve(0),
    doctorId
      ? prisma.appointment.count({
          where: {
            doctorId,
            status: AppointmentStatus.PENDING,
          },
        })
      : Promise.resolve(0),
  ]);

  const waiting = todayQueue.filter(
    (entry) => entry.status === QueueStatus.WAITING,
  );
  const current =
    todayQueue.find(
      (entry) =>
        entry.status === QueueStatus.IN_CONSULTATION ||
        entry.status === QueueStatus.CALLED,
    ) ?? null;
  const next = waiting[0] ?? null;
  const remaining = waiting.length;

  return {
    welcome: {
      fullName: assistant.user.fullName,
      profilePhoto: assistant.user.profilePhoto,
    },
    doctor,
    today: {
      total: todayQueue.length,
      queue: { total: todayQueue.length, current, next, remaining },
      todayAppointments,
    },
    totals: {
      pendingAppointments,
      todayAppointments,
    },
  };
};
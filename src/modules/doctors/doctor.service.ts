import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../config/prisma";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors";
import { AccountStatus, AppointmentStatus, DoctorVerificationStatus, QueueStatus, Weekday } from "../../../generated/prisma/client";
import { haversineDistance } from "../../shared/utils/distanceHelper";
import type {
  CreateScheduleInput,
  ListDoctorsParams,
  NearbyDoctorsParams,
  UpdateClinicLocationInput,
  UpdateDoctorProfileInput,
  UpdateScheduleInput,
} from "./doctor.interface";

const doctorInclude = {
  doctor: {
    include: {
      specialization: true,
    },
  },
} as const;

const publicDoctorInclude = {
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
} as const;

export const listDoctors = async (params: ListDoctorsParams) => {
  const conditions: Prisma.DoctorWhereInput[] = [];

  if (params.search) {
    conditions.push({
      user: {
        fullName: { contains: params.search, mode: "insensitive" },
      },
    });
  }

  if (params.specialization) {
    conditions.push({
      OR: [
        { specializationId: params.specialization },
        {
          specialization: {
            name: { contains: params.specialization, mode: "insensitive" },
          },
        },
      ],
    });
  }

  const where: Prisma.DoctorWhereInput = {
    verificationStatus: DoctorVerificationStatus.APPROVED,
    user: { status: AccountStatus.ACTIVE },
  };
  if (conditions.length > 0) {
    where.AND = conditions;
  }

  const orderBy: Prisma.DoctorOrderByWithRelationInput[] =
    params.sortBy === "rating"
      ? [{ averageRating: "desc" }]
      : [{ user: { fullName: "asc" } }];

  return prisma.doctor.findMany({
    where,
    orderBy,
    include: publicDoctorInclude,
  });
};

export const getNearbyDoctors = async (params: NearbyDoctorsParams) => {
  if (
    typeof params.lat !== "number" ||
    Number.isNaN(params.lat) ||
    params.lat < -90 ||
    params.lat > 90
  ) {
    throw new ValidationError("lat must be a number between -90 and 90");
  }
  if (
    typeof params.lng !== "number" ||
    Number.isNaN(params.lng) ||
    params.lng < -180 ||
    params.lng > 180
  ) {
    throw new ValidationError("lng must be a number between -180 and 180");
  }

  const radius = params.radius ?? 10;
  if (typeof radius !== "number" || Number.isNaN(radius) || radius <= 0) {
    throw new ValidationError("radius must be a positive number in kilometers");
  }

  const conditions: Prisma.DoctorWhereInput[] = [];

  if (params.specialization) {
    conditions.push({
      OR: [
        { specializationId: params.specialization },
        {
          specialization: {
            name: { contains: params.specialization, mode: "insensitive" },
          },
        },
      ],
    });
  }

  const where: Prisma.DoctorWhereInput = {
    verificationStatus: DoctorVerificationStatus.APPROVED,
    user: { status: AccountStatus.ACTIVE },
    latitude: { not: null },
    longitude: { not: null },
  };
  if (conditions.length > 0) {
    where.AND = conditions;
  }

  const doctors = await prisma.doctor.findMany({
    where,
    include: publicDoctorInclude,
  });

  const results = doctors
    .map((doctor) => {
      const distance = haversineDistance(
        params.lat,
        params.lng,
        doctor.latitude as number,
        doctor.longitude as number,
      );
      return {
        ...doctor,
        distanceKm: Number(distance.toFixed(2)),
        directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${doctor.latitude},${doctor.longitude}`,
      };
    })
    .filter((doctor) => doctor.distanceKm <= radius)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return results;
};

export const getOwnProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: doctorInclude,
  });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return user;
};

export const updateOwnProfile = async (
  userId: string,
  payload: UpdateDoctorProfileInput,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: doctorInclude,
  });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  if (!user.doctor) {
    throw new NotFoundError("Doctor profile not found");
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

  const doctorData = {} as Prisma.DoctorUncheckedUpdateInput;
  if (typeof payload.specializationId === "string" && payload.specializationId) {
    doctorData.specializationId = payload.specializationId;
  }
  if (typeof payload.hospitalName === "string") {
    doctorData.hospitalName = payload.hospitalName;
  }
  if (typeof payload.clinicAddress === "string") {
    doctorData.clinicAddress = payload.clinicAddress;
  }
  if (payload.latitude !== undefined) {
    if (typeof payload.latitude !== "number" || Number.isNaN(payload.latitude)) {
      throw new ValidationError("latitude must be a number");
    }
    doctorData.latitude = payload.latitude;
  }
  if (payload.longitude !== undefined) {
    if (typeof payload.longitude !== "number" || Number.isNaN(payload.longitude)) {
      throw new ValidationError("longitude must be a number");
    }
    doctorData.longitude = payload.longitude;
  }
  if (payload.consultationFee !== undefined) {
    if (
      typeof payload.consultationFee !== "number" ||
      payload.consultationFee < 0
    ) {
      throw new ValidationError("consultationFee must be a non-negative number");
    }
    doctorData.consultationFee = payload.consultationFee;
  }

  const hasUpdates =
    Object.keys(userData).length > 0 || Object.keys(doctorData).length > 0;
  if (!hasUpdates) {
    return user;
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: userData }),
    prisma.doctor.update({ where: { userId }, data: doctorData }),
  ]);

  return getOwnProfile(userId);
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const WEEKDAYS: Weekday[] = [
  Weekday.SUNDAY,
  Weekday.MONDAY,
  Weekday.TUESDAY,
  Weekday.WEDNESDAY,
  Weekday.THURSDAY,
  Weekday.FRIDAY,
  Weekday.SATURDAY,
];

const getDoctorByUserId = async (userId: string) => {
  const doctor = await prisma.doctor.findUnique({ where: { userId } });
  if (!doctor) {
    throw new NotFoundError("Doctor profile not found");
  }
  return doctor;
};

const validateDayOfWeek = (value: unknown): Weekday => {
  if (typeof value !== "string" || !WEEKDAYS.includes(value as Weekday)) {
    throw new ValidationError("dayOfWeek must be a valid weekday");
  }
  return value as Weekday;
};

const validateTime = (value: unknown): string => {
  if (typeof value !== "string" || !TIME_RE.test(value)) {
    throw new ValidationError("time must be in HH:MM format");
  }
  return value;
};

const validateSlotDuration = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ValidationError("slotDurationMinutes must be a positive integer");
  }
  return value;
};

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
};

const ensureNoOverlap = async (
  doctorId: string,
  excludeId: string | undefined,
  dayOfWeek: Weekday,
  startTime: string,
  endTime: string,
) => {
  const overlapping = await prisma.doctorSchedule.findFirst({
    where: {
      doctorId,
      dayOfWeek,
      id: excludeId ? { not: excludeId } : undefined,
      OR: [
        {
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      ],
    },
  });
  if (overlapping) {
    throw new ConflictError("Schedule overlaps with an existing schedule");
  }
};

export const getOwnSchedules = async (userId: string) => {
  const doctor = await getDoctorByUserId(userId);
  return prisma.doctorSchedule.findMany({
    where: { doctorId: doctor.id },
    orderBy: { dayOfWeek: "asc" },
  });
};

export const createSchedule = async (
  userId: string,
  payload: CreateScheduleInput,
) => {
  const doctor = await getDoctorByUserId(userId);
  const dayOfWeek = validateDayOfWeek(payload.dayOfWeek);
  const startTime = validateTime(payload.startTime);
  const endTime = validateTime(payload.endTime);
  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    throw new ValidationError("endTime must be after startTime");
  }
  const slotDurationMinutes =
    payload.slotDurationMinutes !== undefined
      ? validateSlotDuration(payload.slotDurationMinutes)
      : 15;

  await ensureNoOverlap(doctor.id, undefined, dayOfWeek, startTime, endTime);

  return prisma.doctorSchedule.create({
    data: {
      doctorId: doctor.id,
      dayOfWeek,
      startTime,
      endTime,
      slotDurationMinutes,
    },
  });
};

export const updateSchedule = async (
  userId: string,
  scheduleId: string,
  payload: UpdateScheduleInput,
) => {
  const doctor = await getDoctorByUserId(userId);
  const existing = await prisma.doctorSchedule.findFirst({
    where: { id: scheduleId, doctorId: doctor.id },
  });
  if (!existing) {
    throw new NotFoundError("Schedule not found");
  }

  const next = {
    dayOfWeek:
      payload.dayOfWeek !== undefined
        ? validateDayOfWeek(payload.dayOfWeek)
        : existing.dayOfWeek,
    startTime:
      payload.startTime !== undefined
        ? validateTime(payload.startTime)
        : existing.startTime,
    endTime:
      payload.endTime !== undefined
        ? validateTime(payload.endTime)
        : existing.endTime,
    slotDurationMinutes:
      payload.slotDurationMinutes !== undefined
        ? validateSlotDuration(payload.slotDurationMinutes)
        : existing.slotDurationMinutes,
  };

  if (timeToMinutes(next.endTime) <= timeToMinutes(next.startTime)) {
    throw new ValidationError("endTime must be after startTime");
  }

  await ensureNoOverlap(
    doctor.id,
    scheduleId,
    next.dayOfWeek,
    next.startTime,
    next.endTime,
  );

  return prisma.doctorSchedule.update({
    where: { id: scheduleId },
    data: next,
  });
};

export const deleteSchedule = async (userId: string, scheduleId: string) => {
  const doctor = await getDoctorByUserId(userId);
  const existing = await prisma.doctorSchedule.findFirst({
    where: { id: scheduleId, doctorId: doctor.id },
  });
  if (!existing) {
    throw new NotFoundError("Schedule not found");
  }
  await prisma.doctorSchedule.delete({ where: { id: scheduleId } });
  return existing;
};

export const updateClinicLocation = async (
  userId: string,
  payload: UpdateClinicLocationInput,
) => {
  const doctor = await getDoctorByUserId(userId);
  const data = {} as Prisma.DoctorUncheckedUpdateInput;

  if (payload.clinicAddress !== undefined) {
    if (typeof payload.clinicAddress !== "string") {
      throw new ValidationError("clinicAddress must be a string");
    }
    data.clinicAddress = payload.clinicAddress;
  }
  if (payload.latitude !== undefined) {
    if (
      typeof payload.latitude !== "number" ||
      Number.isNaN(payload.latitude) ||
      payload.latitude < -90 ||
      payload.latitude > 90
    ) {
      throw new ValidationError("latitude must be a number between -90 and 90");
    }
    data.latitude = payload.latitude;
  }
  if (payload.longitude !== undefined) {
    if (
      typeof payload.longitude !== "number" ||
      Number.isNaN(payload.longitude) ||
      payload.longitude < -180 ||
      payload.longitude > 180
    ) {
      throw new ValidationError(
        "longitude must be a number between -180 and 180",
      );
    }
    data.longitude = payload.longitude;
  }

  if (Object.keys(data).length === 0) {
    throw new ValidationError("At least one field is required");
  }

  return prisma.doctor.update({
    where: { id: doctor.id },
    data,
    include: { specialization: true },
  });
};

const publicDoctorDetailInclude = {
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
  schedules: {
    orderBy: { dayOfWeek: "asc" },
  },
  reviews: {
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      patient: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              profilePhoto: true,
            },
          },
        },
      },
    },
  },
} as const;

const findApprovedActiveDoctor = async (doctorId: string) => {
  const doctor = await prisma.doctor.findFirst({
    where: {
      id: doctorId,
      verificationStatus: DoctorVerificationStatus.APPROVED,
      user: { status: AccountStatus.ACTIVE },
    },
  });
  if (!doctor) {
    throw new NotFoundError("Doctor not found");
  }
  return doctor;
};

export const getPublicDoctorProfile = async (doctorId: string) => {
  const doctor = await prisma.doctor.findFirst({
    where: {
      id: doctorId,
      verificationStatus: DoctorVerificationStatus.APPROVED,
      user: { status: AccountStatus.ACTIVE },
    },
    include: publicDoctorDetailInclude,
  });
  if (!doctor) {
    throw new NotFoundError("Doctor not found");
  }
  return doctor;
};

const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
};

const dayOfWeekFromDate = (date: Date): Weekday => {
  const dayIndex = date.getUTCDay();
  return WEEKDAYS[dayIndex] ?? Weekday.SUNDAY;
};

export const getDoctorSlotsForDate = async (
  doctorId: string,
  dateString: string,
) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new ValidationError("date must be in YYYY-MM-DD format");
  }
  const date = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError("date must be a valid date");
  }

  const doctor = await findApprovedActiveDoctor(doctorId);
  const dayOfWeek = dayOfWeekFromDate(date);

  const schedules = await prisma.doctorSchedule.findMany({
    where: { doctorId: doctor.id, dayOfWeek },
    orderBy: { startTime: "asc" },
  });

  const slots: string[] = [];
  for (const schedule of schedules) {
    const start = timeToMinutes(schedule.startTime);
    const end = timeToMinutes(schedule.endTime);
    const duration = schedule.slotDurationMinutes;
    for (let t = start; t + duration <= end; t += duration) {
      slots.push(formatTime(t));
    }
  }

  return { date, dayOfWeek, slots };
};

export const getAvailableSlots = async (
  doctorId: string,
  dateString: string,
) => {
  const { date, dayOfWeek, slots: allSlots } = await getDoctorSlotsForDate(
    doctorId,
    dateString,
  );

  if (allSlots.length === 0) {
    return { date: dateString, dayOfWeek, slots: [] };
  }

  const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  const takenAppointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      date: { gte: date, lt: nextDay },
      status: {
        notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.REJECTED],
      },
    },
    select: { timeSlot: true },
  });
  const taken = new Set(takenAppointments.map((appointment) => appointment.timeSlot));
  const slots = allSlots.filter((slot) => !taken.has(slot));

  return { date: dateString, dayOfWeek, slots };
};

const getTodayRangeDashboard = () => {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
};

export const getDashboard = async (userId: string) => {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
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
  if (!doctor) {
    throw new NotFoundError("Doctor profile not found");
  }

  const { start, end } = getTodayRangeDashboard();

  const todayAppointments = await prisma.appointment.findMany({
    where: { doctorId: doctor.id, date: { gte: start, lt: end } },
    orderBy: [{ date: "asc" }, { serialNumber: "asc" }],
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
      queue: {
        select: {
          id: true,
          serialNumber: true,
          status: true,
          calledAt: true,
          completedAt: true,
        },
      },
    },
  });

  const queueEntries = todayAppointments
    .map((appointment) => appointment.queue)
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => a.serialNumber - b.serialNumber);

  const current =
    queueEntries.find(
      (entry) =>
        entry.status === QueueStatus.IN_CONSULTATION ||
        entry.status === QueueStatus.CALLED,
    ) ?? null;
  const waitingList = queueEntries.filter(
    (entry) => entry.status === QueueStatus.WAITING,
  );
  const next = waitingList[0] ?? null;
  const remaining = waitingList.length;

  const [
    totalAppointments,
    completedAppointments,
    pendingRequests,
    totalReviews,
  ] = await Promise.all([
    prisma.appointment.count({ where: { doctorId: doctor.id } }),
    prisma.appointment.count({
      where: {
        doctorId: doctor.id,
        status: AppointmentStatus.COMPLETED,
      },
    }),
    prisma.appointment.count({
      where: { doctorId: doctor.id, status: AppointmentStatus.PENDING },
    }),
    prisma.review.count({ where: { doctorId: doctor.id } }),
  ]);

  return {
    welcome: {
      fullName: doctor.user.fullName,
      profilePhoto: doctor.user.profilePhoto,
    },
    doctor: {
      id: doctor.id,
      specialization: doctor.specialization.name,
      hospitalName: doctor.hospitalName,
      clinicAddress: doctor.clinicAddress,
      consultationFee: doctor.consultationFee,
      averageRating: doctor.averageRating,
      totalReviews: doctor.totalReviews,
    },
    today: {
      total: todayAppointments.length,
      queue: {
        total: queueEntries.length,
        current,
        next,
        remaining,
      },
      appointments: todayAppointments,
    },
    totals: {
      totalAppointments,
      completedAppointments,
      pendingRequests,
      totalReviews,
    },
  };
};
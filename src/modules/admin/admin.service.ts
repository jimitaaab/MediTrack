import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../shared/errors";
import { AccountStatus, AppointmentStatus, DoctorVerificationStatus, Role } from "../../../generated/prisma/client";
import { notifyDoctorApproved, notifyDoctorRejected } from "../notifications/notification.service";
import type { UpdateAdminProfileInput } from "./admin.types";

const adminInclude = {
  admin: true,
} as const;

const doctorInclude = {
  user: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      profilePhoto: true,
      status: true,
      createdAt: true,
    },
  },
  specialization: true,
} as const;

export const getOwnProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: adminInclude,
  });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return user;
};

export const updateOwnProfile = async (
  userId: string,
  payload: UpdateAdminProfileInput,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: adminInclude,
  });
  if (!user) {
    throw new NotFoundError("User not found");
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

  if (Object.keys(userData).length === 0) {
    return user;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: userData,
    include: adminInclude,
  });

  return updatedUser;
};

const findDoctorOrThrow = async (doctorId: string) => {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    include: doctorInclude,
  });
  if (!doctor) {
    throw new NotFoundError("Doctor not found");
  }
  return doctor;
};

export const getPendingDoctors = async () => {
  return prisma.doctor.findMany({
    where: { verificationStatus: DoctorVerificationStatus.PENDING },
    include: doctorInclude,
    orderBy: { user: { createdAt: "asc" } },
  });
};

export const approveDoctor = async (doctorId: string) => {
  const doctor = await findDoctorOrThrow(doctorId);
  if (doctor.verificationStatus === DoctorVerificationStatus.APPROVED) {
    return doctor;
  }
  const updated = await prisma.doctor.update({
    where: { id: doctorId },
    data: { verificationStatus: DoctorVerificationStatus.APPROVED },
    include: doctorInclude,
  });
  await notifyDoctorApproved(doctorId);
  return updated;
};

export const rejectDoctor = async (doctorId: string) => {
  const doctor = await findDoctorOrThrow(doctorId);
  if (doctor.verificationStatus === DoctorVerificationStatus.REJECTED) {
    return doctor;
  }
  const updated = await prisma.doctor.update({
    where: { id: doctorId },
    data: { verificationStatus: DoctorVerificationStatus.REJECTED },
    include: doctorInclude,
  });
  await notifyDoctorRejected(doctorId);
  return updated;
};

export const suspendDoctor = async (doctorId: string) => {
  const doctor = await findDoctorOrThrow(doctorId);
  if (doctor.user.status === AccountStatus.SUSPENDED) {
    return doctor;
  }
  await prisma.user.update({
    where: { id: doctor.userId },
    data: { status: AccountStatus.SUSPENDED },
  });
  return findDoctorOrThrow(doctorId);
};

const reduceByEnum = <T extends string>(
  entries: Array<{ field: T; _count: number }>,
  values: T[],
): Record<string, number> => {
  const result: Record<string, number> = {};
  for (const value of values) {
    result[value] = 0;
  }
  for (const entry of entries) {
    result[entry.field] = entry._count;
  }
  return result;
};

export const getDashboardStats = async () => {
  const [
    totalUsers,
    totalPatients,
    totalDoctors,
    totalAssistants,
    totalAdmins,
    totalAppointments,
    totalSpecializations,
    totalReviews,
    pendingDoctors,
    approvedDoctors,
    rejectedDoctors,
    appointmentStatuses,
    doctorVerification,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.patient.count(),
    prisma.doctor.count(),
    prisma.doctorAssistant.count(),
    prisma.admin.count(),
    prisma.appointment.count(),
    prisma.specialization.count(),
    prisma.review.count(),
    prisma.doctor.count({
      where: { verificationStatus: DoctorVerificationStatus.PENDING },
    }),
    prisma.doctor.count({
      where: { verificationStatus: DoctorVerificationStatus.APPROVED },
    }),
    prisma.doctor.count({
      where: { verificationStatus: DoctorVerificationStatus.REJECTED },
    }),
    prisma.appointment.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.doctor.groupBy({
      by: ["verificationStatus"],
      _count: { _all: true },
    }),
  ]);

  const activeUsers = await prisma.user.count({
    where: { status: AccountStatus.ACTIVE },
  });
  const suspendedUsers = await prisma.user.count({
    where: { status: AccountStatus.SUSPENDED },
  });

  return {
    totals: {
      users: totalUsers,
      patients: totalPatients,
      doctors: totalDoctors,
      assistants: totalAssistants,
      admins: totalAdmins,
      appointments: totalAppointments,
      specializations: totalSpecializations,
      reviews: totalReviews,
    },
    userStatuses: {
      active: activeUsers,
      suspended: suspendedUsers,
    },
    doctorVerification: {
      pending: pendingDoctors,
      approved: approvedDoctors,
      rejected: rejectedDoctors,
    },
    appointmentStatuses: reduceByEnum(
      appointmentStatuses.map((entry) => ({
        field: entry.status,
        _count: entry._count._all,
      })),
      Object.values(AppointmentStatus),
    ),
    doctorVerificationByStatus: reduceByEnum(
      doctorVerification.map((entry) => ({
        field: entry.verificationStatus,
        _count: entry._count._all,
      })),
      Object.values(DoctorVerificationStatus),
    ),
  };
};

interface ReportQuery {
  from?: string;
  to?: string;
}

const parseDate = (value: string | undefined): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }
  return date;
};

export const getReports = async (query: ReportQuery) => {
  const from = parseDate(query.from);
  const to = query.to ? parseDate(query.to) : undefined;
  const toExclusive = to ? new Date(to.getTime() + 24 * 60 * 60 * 1000) : undefined;

  const dateFilter: Prisma.AppointmentWhereInput["createdAt"] = {
    ...(from ? { gte: from } : {}),
    ...(toExclusive ? { lt: toExclusive } : {}),
  };
  const where: Prisma.AppointmentWhereInput =
    from || toExclusive ? { createdAt: dateFilter } : {};

  const [
    totalAppointments,
    completedAppointments,
    cancelledAppointments,
    pendingAppointments,
    confirmedAppointments,
    rejectedAppointments,
    totalReviews,
    averageRating,
    roleCounts,
    appointmentsByDate,
    topDoctors,
  ] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.count({
      where: { ...where, status: AppointmentStatus.COMPLETED },
    }),
    prisma.appointment.count({
      where: { ...where, status: AppointmentStatus.CANCELLED },
    }),
    prisma.appointment.count({
      where: { ...where, status: AppointmentStatus.PENDING },
    }),
    prisma.appointment.count({
      where: { ...where, status: AppointmentStatus.CONFIRMED },
    }),
    prisma.appointment.count({
      where: { ...where, status: AppointmentStatus.REJECTED },
    }),
    prisma.review.count(),
    prisma.review.aggregate({ _avg: { rating: true } }),
    prisma.user.groupBy({
      by: ["role"],
      _count: { _all: true },
    }),
    prisma.appointment.groupBy({
      by: ["date"],
      _count: { _all: true },
      ...(from || toExclusive
        ? { where: { createdAt: dateFilter } }
        : {}),
    }),
    prisma.doctor.findMany({
      where: { verificationStatus: DoctorVerificationStatus.APPROVED },
      orderBy: [{ averageRating: "desc" }, { totalReviews: "desc" }],
      take: 5,
      select: {
        id: true,
        consultationFee: true,
        averageRating: true,
        totalReviews: true,
        user: { select: { id: true, fullName: true } },
        specialization: { select: { id: true, name: true } },
      },
    }),
  ]);

  const avg = averageRating._avg.rating ?? 0;
  const completionRate =
    totalAppointments > 0
      ? Number(((completedAppointments / totalAppointments) * 100).toFixed(2))
      : 0;

  const dailyAppointments = appointmentsByDate
    .map((entry) => ({
      date: entry.date.toISOString().slice(0, 10),
      count: entry._count._all,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    summary: {
      totalAppointments,
      completedAppointments,
      cancelledAppointments,
      pendingAppointments,
      confirmedAppointments,
      rejectedAppointments,
      completionRate,
    },
    reviews: {
      total: totalReviews,
      averageRating: Number(avg.toFixed(2)),
    },
    roleDistribution: reduceByEnum(
      roleCounts.map((entry) => ({
        field: entry.role,
        _count: entry._count._all,
      })),
      Object.values(Role),
    ),
    dailyAppointments,
    topDoctors,
  };
};
import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../config/prisma";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors";
import { AppointmentStatus, Role } from "../../../generated/prisma/client";
import { notifyNewReview } from "../notifications/notification.service";

interface CreateReviewInput {
  appointmentId: string;
  rating: number;
  comment?: string;
}

interface UpdateReviewInput {
  rating?: number;
  comment?: string;
}

const NOT_REVIEWABLE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.REJECTED,
];

const reviewInclude = {
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
  appointment: {
    select: {
      id: true,
      date: true,
      timeSlot: true,
    },
  },
} as const;

const getPatientByUserId = async (userId: string) => {
  const patient = await prisma.patient.findUnique({ where: { userId } });
  if (!patient) {
    throw new ForbiddenError("Patient profile not found");
  }
  return patient;
};

const validateRating = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
    throw new ValidationError("rating must be an integer between 1 and 5");
  }
  return value;
};

const optionalComment = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new ValidationError("comment must be a string");
  }
  return value.trim();
};

const recomputeDoctorRating = async (
  tx: Prisma.TransactionClient,
  doctorId: string,
) => {
  const agg = await tx.review.aggregate({
    where: { doctorId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  await tx.doctor.update({
    where: { id: doctorId },
    data: {
      averageRating: agg._avg.rating ?? 0,
      totalReviews: agg._count.rating,
    },
  });
};

export const createReview = async (userId: string, payload: CreateReviewInput) => {
  const patient = await getPatientByUserId(userId);

  const appointment = await prisma.appointment.findUnique({
    where: { id: payload.appointmentId },
  });
  if (!appointment) {
    throw new NotFoundError("Appointment not found");
  }
  if (appointment.patientId !== patient.id) {
    throw new ForbiddenError("You can only review your own appointments");
  }
  if (NOT_REVIEWABLE_STATUSES.includes(appointment.status)) {
    throw new ConflictError("This appointment is not eligible for review");
  }

  const existing = await prisma.review.findUnique({
    where: { appointmentId: appointment.id },
  });
  if (existing) {
    throw new ConflictError("You have already reviewed this appointment");
  }

  const rating = validateRating(payload.rating);
  const comment = optionalComment(payload.comment);

  return prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        patientId: patient.id,
        doctorId: appointment.doctorId,
        appointmentId: appointment.id,
        rating,
        comment,
      },
    });
    await recomputeDoctorRating(tx, appointment.doctorId);
    return tx.review.findUnique({
      where: { id: review.id },
      include: reviewInclude,
    });
  }).then(async (review) => {
    if (review) {
      await notifyNewReview(review.id);
    }
    return review;
  });
};

export const updateReview = async (
  userId: string,
  reviewId: string,
  payload: UpdateReviewInput,
) => {
  const patient = await getPatientByUserId(userId);

  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) {
    throw new NotFoundError("Review not found");
  }
  if (review.patientId !== patient.id) {
    throw new ForbiddenError("You can only update your own reviews");
  }

  const data: Prisma.ReviewUpdateInput = {};
  if (payload.rating !== undefined) data.rating = validateRating(payload.rating);
  if (payload.comment !== undefined) data.comment = optionalComment(payload.comment);
  if (Object.keys(data).length === 0) {
    throw new ValidationError("At least one field is required");
  }

  return prisma.$transaction(async (tx) => {
    await tx.review.update({ where: { id: reviewId }, data });
    await recomputeDoctorRating(tx, review.doctorId);
    return tx.review.findUnique({
      where: { id: reviewId },
      include: reviewInclude,
    });
  });
};

export const deleteReview = async (
  userId: string,
  role: string,
  reviewId: string,
) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) {
    throw new NotFoundError("Review not found");
  }

  if (role === Role.PATIENT) {
    const patient = await getPatientByUserId(userId);
    if (review.patientId !== patient.id) {
      throw new ForbiddenError("You can only delete your own reviews");
    }
  } else if (role !== Role.ADMIN) {
    throw new ForbiddenError("You do not have permission to delete this review");
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: reviewId } });
    await recomputeDoctorRating(tx, review.doctorId);
  });

  return review;
};

export const getMyReviews = async (userId: string) => {
  const patient = await getPatientByUserId(userId);
  return prisma.review.findMany({
    where: { patientId: patient.id },
    include: reviewInclude,
    orderBy: { createdAt: "desc" },
  });
};

export const getAllReviews = async () => {
  return prisma.review.findMany({
    include: reviewInclude,
    orderBy: { createdAt: "desc" },
  });
};

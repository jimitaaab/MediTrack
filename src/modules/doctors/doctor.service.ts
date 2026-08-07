import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../config/prisma";
import {
  NotFoundError,
  ValidationError,
} from "../../shared/errors";
import type { UpdateDoctorProfileInput } from "./doctor.interface";

const doctorInclude = {
  doctor: {
    include: {
      specialization: true,
    },
  },
} as const;

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
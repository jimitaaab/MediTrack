import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../config/prisma";
import { NotFoundError } from "../../shared/errors";
import type { UpdateAdminProfileInput } from "./admin.types";

const adminInclude = {
  admin: true,
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
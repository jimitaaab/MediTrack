import { Prisma } from "../../../generated/prisma/client";
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
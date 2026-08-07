import { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../config/prisma";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors";

interface CreateSpecializationInput {
  name: string;
  icon?: string;
}

interface UpdateSpecializationInput {
  name?: string;
  icon?: string;
}

const requireName = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError("name is required");
  }
  return value.trim();
};

const optionalIcon = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new ValidationError("icon must be a string");
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

export const listSpecializations = async () => {
  return prisma.specialization.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { doctors: true } } },
  });
};

export const createSpecialization = async (
  payload: CreateSpecializationInput,
) => {
  const name = requireName(payload.name);
  const icon = optionalIcon(payload.icon);

  const existing = await prisma.specialization.findUnique({ where: { name } });
  if (existing) {
    throw new ConflictError("Specialization with this name already exists");
  }

  return prisma.specialization.create({
    data: { name, icon },
  });
};

export const updateSpecialization = async (
  id: string,
  payload: UpdateSpecializationInput,
) => {
  const existing = await prisma.specialization.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("Specialization not found");
  }

  const data = {} as Prisma.SpecializationUpdateInput;
  if (payload.name !== undefined) {
    const name = requireName(payload.name);
    if (name !== existing.name) {
      const duplicate = await prisma.specialization.findUnique({
        where: { name },
      });
      if (duplicate) {
        throw new ConflictError("Specialization with this name already exists");
      }
      data.name = name;
    }
  }
  if (payload.icon !== undefined) {
    const icon = optionalIcon(payload.icon);
    data.icon = icon === undefined ? null : icon;
  }

  if (Object.keys(data).length === 0) {
    return existing;
  }

  return prisma.specialization.update({
    where: { id },
    data,
  });
};

export const deleteSpecialization = async (id: string) => {
  const existing = await prisma.specialization.findUnique({
    where: { id },
    include: { _count: { select: { doctors: true } } },
  });
  if (!existing) {
    throw new NotFoundError("Specialization not found");
  }
  if (existing._count.doctors > 0) {
    throw new ConflictError(
      "Cannot delete specialization that has doctors assigned",
    );
  }
  return prisma.specialization.delete({ where: { id } });
};

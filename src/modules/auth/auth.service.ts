import bcrypt from "bcryptjs";
import httpStatus from "http-status-codes";
import { prisma } from "../../config/prisma";
import config from "../../config/env";
import { jwtUtils } from "../../shared/utils/jwt.utils";
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
} from "../../shared/errors";
import {
  AccountStatus,
  DoctorVerificationStatus,
  Role,
} from "../../../generated/prisma/client";
import type {
  AuthTokensResult,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterAssistantInput,
  RegisterDoctorInput,
  RegisterPatientInput,
  ResetPasswordInput,
} from "./auth.interface";

const RESET_TOKEN_EXPIRES_IN = "15m";

const saltRounds = Number(config.bcryptSaltRounds);

const hashPassword = (plain: string): string =>
  bcrypt.hashSync(plain, saltRounds);

const issueTokens = (id: string, email: string, role: string): AuthTokensResult => {
  const accessToken = jwtUtils.createToken(
    { id, email, role },
    config.jwt_access_Secret,
    config.jwt_access_ExpiresIn,
  );
  const refreshToken = jwtUtils.createToken(
    { id, email, role },
    config.jwt_refresh_Secret,
    config.jwt_refresh_ExpiresIn,
  );
  return { accessToken, refreshToken };
};

export const registerPatient = async (payload: RegisterPatientInput) => {
  const user = await prisma.user.create({
    data: {
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      password: hashPassword(payload.password),
      role: Role.PATIENT,
      status: AccountStatus.ACTIVE,
      patient: { create: {} },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });
  return user;
};

export const registerDoctor = async (payload: RegisterDoctorInput) => {
  const user = await prisma.user.create({
    data: {
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      password: hashPassword(payload.password),
      role: Role.DOCTOR,
      status: AccountStatus.ACTIVE,
      doctor: {
        create: {
          specialization: { connect: { id: payload.specializationId } },
          hospitalName: payload.hospitalName,
          clinicAddress: payload.clinicAddress,
          consultationFee: payload.consultationFee,
          latitude: payload.latitude,
          longitude: payload.longitude,
          verificationStatus: DoctorVerificationStatus.PENDING,
        },
      },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      status: true,
      doctor: {
        select: {
          id: true,
          consultationFee: true,
          verificationStatus: true,
        },
      },
    },
  });
  return user;
};

export const registerAssistant = async (payload: RegisterAssistantInput) => {
  const user = await prisma.user.create({
    data: {
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      password: hashPassword(payload.password),
      role: Role.DOCTOR_ASSISTANT,
      status: AccountStatus.ACTIVE,
      assistant: {
        create: {
          designation: payload.designation,
        },
      },
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });
  return user;
};

export const login = async (payload: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
  });
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }
  const passwordMatches = bcrypt.compareSync(payload.password, user.password);
  if (!passwordMatches) {
    throw new UnauthorizedError("Invalid email or password");
  }
  if (user.status !== AccountStatus.ACTIVE) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Account is not active. Please contact support.",
    );
  }
  const tokens = issueTokens(user.id, user.email, user.role);
  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    tokens,
  };
};

export const refreshToken = async (refreshToken: string) => {
  if (!refreshToken) {
    throw new UnauthorizedError("Refresh token is required");
  }
  const verified = jwtUtils.verifyToken(refreshToken, config.jwt_refresh_Secret);
  if (!verified.success) {
    throw new UnauthorizedError("Invalid refresh token");
  }
  const { id } = verified.data;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new UnauthorizedError("Invalid refresh token");
  }
  const tokens = issueTokens(user.id, user.email, user.role);
  return {
    user: { id: user.id, email: user.email, role: user.role },
    tokens,
  };
};

export const logout = async (userId: string) => {
  await prisma.user.findUnique({ where: { id: userId } });
  return { loggedOut: true };
};

export const changePassword = async (
  userId: string,
  payload: ChangePasswordInput,
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  const oldPasswordMatches = bcrypt.compareSync(
    payload.oldPassword,
    user.password,
  );
  if (!oldPasswordMatches) {
    throw new UnauthorizedError("Old password is incorrect");
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hashPassword(payload.newPassword),
      needsPasswordChange: false,
    },
  });
  return { success: true };
};

export const forgotPassword = async (payload: ForgotPasswordInput) => {
  const user = await prisma.user.findUnique({
    where: { email: payload.email },
    select: { id: true, email: true, role: true },
  });
  if (!user) {
    throw new NotFoundError("No account found with that email");
  }
  const token = jwtUtils.createToken(
    { id: user.id, email: user.email, role: user.role, purpose: "password_reset" },
    config.jwt_access_Secret,
    RESET_TOKEN_EXPIRES_IN,
  );
  return {
    message: "Password reset link has been generated",
    resetToken: token,
  };
};

export const resetPassword = async (payload: ResetPasswordInput) => {
  const verified = jwtUtils.verifyToken(payload.token, config.jwt_access_Secret);
  if (!verified.success) {
    throw new UnauthorizedError("Invalid or expired reset token");
  }
  const { id, purpose } = verified.data;
  if (purpose !== "password_reset" || typeof id !== "string") {
    throw new UnauthorizedError("Invalid or expired reset token");
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  await prisma.user.update({
    where: { id },
    data: {
      password: hashPassword(payload.newPassword),
      needsPasswordChange: false,
    },
  });
  return { success: true };
};
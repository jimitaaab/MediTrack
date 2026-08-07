import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status-codes";
import { AppError } from "../../shared/errors";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterAssistantInput,
  RegisterDoctorInput,
  RegisterPatientInput,
  ResetPasswordInput,
} from "./auth.interface";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const fail = (message: string): never => {
  throw new AppError(httpStatus.BAD_REQUEST, message);
};

const asRecord = (body: unknown): Record<string, unknown> =>
  body && typeof body === "object" ? (body as Record<string, unknown>) : {};

const requireText = (value: unknown, message: string): string => {
  if (typeof value !== "string") throw fail(message);
  const trimmed = value.trim();
  if (trimmed.length === 0) throw fail(message);
  return trimmed;
};

const optionalText = (value: unknown, message: string): string | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw fail(message);
  return value.trim();
};

const optionalNumber = (value: unknown, message: string): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) throw fail(message);
  return value;
};

const requirePassword = (value: unknown): string => {
  const password = requireText(value, "password is required");
  if (password.length < MIN_PASSWORD_LENGTH) {
    fail(`password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  return password;
};

const requireEmail = (value: unknown): string => {
  const email = requireText(value, "email is required").toLowerCase();
  if (!EMAIL_RE.test(email)) fail("a valid email is required");
  return email;
};

export const validateRegisterPatient = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const body = asRecord(req.body);
  const input: RegisterPatientInput = {
    fullName: requireText(body.fullName, "fullName is required"),
    email: requireEmail(body.email),
    phone: optionalText(body.phone, "phone must be a string"),
    password: requirePassword(body.password),
  };
  req.body = input;
  next();
};

export const validateRegisterDoctor = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const body = asRecord(req.body);
  const consultationFee = body.consultationFee;
  if (
    typeof consultationFee !== "number" ||
    !Number.isFinite(consultationFee) ||
    consultationFee < 0
  ) {
    throw fail("consultationFee must be a non-negative number");
  }

  req.body = {
    fullName: requireText(body.fullName, "fullName is required"),
    email: requireEmail(body.email),
    phone: optionalText(body.phone, "phone must be a string"),
    password: requirePassword(body.password),
    specializationId: requireText(
      body.specializationId,
      "specializationId is required",
    ),
    hospitalName: optionalText(body.hospitalName, "hospitalName must be a string"),
    clinicAddress: optionalText(body.clinicAddress, "clinicAddress must be a string"),
    consultationFee,
    latitude: optionalNumber(body.latitude, "latitude must be a number"),
    longitude: optionalNumber(body.longitude, "longitude must be a number"),
  } as RegisterDoctorInput;
  next();
};

export const validateRegisterAssistant = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const body = asRecord(req.body);
  const input: RegisterAssistantInput = {
    fullName: requireText(body.fullName, "fullName is required"),
    email: requireEmail(body.email),
    phone: optionalText(body.phone, "phone must be a string"),
    password: requirePassword(body.password),
    designation: optionalText(body.designation, "designation must be a string"),
  };
  req.body = input;
  next();
};

export const validateLogin = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const body = asRecord(req.body);
  const input: LoginInput = {
    email: requireEmail(body.email),
    password: requireText(body.password, "password is required"),
  };
  req.body = input;
  next();
};

export const validateChangePassword = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const body = asRecord(req.body);
  const input: ChangePasswordInput = {
    oldPassword: requireText(body.oldPassword, "oldPassword is required"),
    newPassword: requirePassword(body.newPassword),
  };
  req.body = input;
  next();
};

export const validateForgotPassword = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const body = asRecord(req.body);
  const input: ForgotPasswordInput = {
    email: requireEmail(body.email),
  };
  req.body = input;
  next();
};

export const validateResetPassword = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const body = asRecord(req.body);
  const input: ResetPasswordInput = {
    token: requireText(body.token, "token is required"),
    newPassword: requirePassword(body.newPassword),
  };
  req.body = input;
  next();
};
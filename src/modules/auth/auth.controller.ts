import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import sendResponse from "../../shared/utils/apiResponse";
import catchAsync from "../../shared/utils/asyncHandler";
import { UnauthorizedError } from "../../shared/errors";
import type { AuthTokensResult } from "./auth.interface";
import * as authService from "./auth.service";

const ACCESS_TOKEN_MAX_AGE = 24 * 60 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const setAuthCookies = (res: Response, tokens: AuthTokensResult) => {
  res.cookie("accessToken", tokens.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  res.cookie("refreshToken", tokens.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
};

const clearAuthCookies = (res: Response) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
};

export const registerPatientController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await authService.registerPatient(req.body);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Patient registered successfully",
      data: result,
    });
  },
);

export const registerDoctorController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await authService.registerDoctor(req.body);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message:
        "Doctor registered successfully. Your profile is pending verification.",
      data: result,
    });
  },
);

export const registerAssistantController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await authService.registerAssistant(req.body);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Assistant registered successfully",
      data: result,
    });
  },
);

export const loginController = catchAsync(
  async (req: Request, res: Response) => {
    const { user, tokens } = await authService.login(req.body);
    setAuthCookies(res, tokens);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Logged in successfully",
      data: { user, tokens },
    });
  },
);

export const refreshTokenController = catchAsync(
  async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken ?? req.body.refreshToken;
    const { user, tokens } = await authService.refreshToken(refreshToken);
    setAuthCookies(res, tokens);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Tokens refreshed successfully",
      data: { user, tokens },
    });
  },
);

export const logoutController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await authService.logout(userId);
    clearAuthCookies(res);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Logged out successfully",
      data: result,
    });
  },
);

export const changePasswordController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await authService.changePassword(userId, req.body);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Password changed successfully",
      data: result,
    });
  },
);

export const forgotPasswordController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await authService.forgotPassword(req.body);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Password reset link has been generated",
      data: result,
    });
  },
);

export const resetPasswordController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await authService.resetPassword(req.body);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Password reset successfully",
      data: result,
    });
  },
);
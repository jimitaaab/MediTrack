import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import sendResponse from "../../shared/utils/apiResponse";
import catchAsync from "../../shared/utils/asyncHandler";
import { UnauthorizedError, ValidationError } from "../../shared/errors";
import * as adminService from "./admin.service";

const requireId = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError("Doctor id is required");
  }
  return value;
};

export const getOwnProfileController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await adminService.getOwnProfile(userId);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Admin profile retrieved successfully",
      data: result,
    });
  },
);

export const updateOwnProfileController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await adminService.updateOwnProfile(userId, req.body);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Admin profile updated successfully",
      data: result,
    });
  },
);

export const getPendingDoctorsController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await adminService.getPendingDoctors();
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Pending doctors retrieved successfully",
      data: result,
    });
  },
);

export const approveDoctorController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await adminService.approveDoctor(requireId(req.params.id));
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Doctor approved successfully",
      data: result,
    });
  },
);

export const rejectDoctorController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await adminService.rejectDoctor(requireId(req.params.id));
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Doctor rejected successfully",
      data: result,
    });
  },
);

export const suspendDoctorController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await adminService.suspendDoctor(requireId(req.params.id));
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Doctor suspended successfully",
      data: result,
    });
  },
);

export const getDashboardStatsController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await adminService.getDashboardStats();
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Dashboard statistics retrieved successfully",
      data: result,
    });
  },
);

export const getReportsController = catchAsync(
  async (req: Request, res: Response) => {
    const { from, to } = req.query;
    const result = await adminService.getReports({
      from: typeof from === "string" ? from : undefined,
      to: typeof to === "string" ? to : undefined,
    });
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Reports retrieved successfully",
      data: result,
    });
  },
);
import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import sendResponse from "../../shared/utils/apiResponse";
import catchAsync from "../../shared/utils/asyncHandler";
import { UnauthorizedError } from "../../shared/errors";
import * as adminService from "./admin.service";

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
import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import sendResponse from "../../shared/utils/apiResponse";
import catchAsync from "../../shared/utils/asyncHandler";
import { ValidationError } from "../../shared/errors";
import * as specializationService from "./specialization.service";

const requireId = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError("Specialization id is required");
  }
  return value;
};

export const listSpecializationsController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await specializationService.listSpecializations();
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Specializations retrieved successfully",
      data: result,
    });
  },
);

export const createSpecializationController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await specializationService.createSpecialization(req.body);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Specialization created successfully",
      data: result,
    });
  },
);

export const updateSpecializationController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await specializationService.updateSpecialization(
      requireId(req.params.id),
      req.body,
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Specialization updated successfully",
      data: result,
    });
  },
);

export const deleteSpecializationController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await specializationService.deleteSpecialization(
      requireId(req.params.id),
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Specialization deleted successfully",
      data: result,
    });
  },
);

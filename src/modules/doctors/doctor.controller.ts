import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import sendResponse from "../../shared/utils/apiResponse";
import catchAsync from "../../shared/utils/asyncHandler";
import { UnauthorizedError, ValidationError } from "../../shared/errors";
import * as doctorService from "./doctor.service";

const requireId = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError("id is required");
  }
  return value;
};

export const listDoctorsController = catchAsync(
  async (req: Request, res: Response) => {
    const { search, specialization, sortBy } = req.query;
    const result = await doctorService.listDoctors({
      search: typeof search === "string" ? search : undefined,
      specialization:
        typeof specialization === "string" ? specialization : undefined,
      sortBy: typeof sortBy === "string" ? sortBy : undefined,
    });
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Doctors retrieved successfully",
      data: result,
    });
  },
);

export const getNearbyDoctorsController = catchAsync(
  async (req: Request, res: Response) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius =
      req.query.radius !== undefined ? Number(req.query.radius) : undefined;
    const specialization =
      typeof req.query.specialization === "string"
        ? req.query.specialization
        : undefined;

    const result = await doctorService.getNearbyDoctors({
      lat,
      lng,
      radius,
      specialization,
    });
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Nearby doctors retrieved successfully",
      data: result,
    });
  },
);

export const getPublicDoctorProfileController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await doctorService.getPublicDoctorProfile(
      requireId(req.params.id),
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Doctor profile retrieved successfully",
      data: result,
    });
  },
);

export const getAvailableSlotsController = catchAsync(
  async (req: Request, res: Response) => {
    const date = typeof req.query.date === "string" ? req.query.date : undefined;
    if (!date) throw new ValidationError("date is required");
    const result = await doctorService.getAvailableSlots(
      requireId(req.params.id),
      date,
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Available slots retrieved successfully",
      data: result,
    });
  },
);

export const getOwnProfileController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await doctorService.getOwnProfile(userId);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Doctor profile retrieved successfully",
      data: result,
    });
  },
);

export const getDashboardController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await doctorService.getDashboard(userId);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Doctor dashboard retrieved successfully",
      data: result,
    });
  },
);

export const updateOwnProfileController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await doctorService.updateOwnProfile(userId, req.body);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Doctor profile updated successfully",
      data: result,
    });
  },
);

export const getOwnSchedulesController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await doctorService.getOwnSchedules(userId);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Schedules retrieved successfully",
      data: result,
    });
  },
);

export const createScheduleController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await doctorService.createSchedule(userId, req.body);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Schedule created successfully",
      data: result,
    });
  },
);

export const updateScheduleController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await doctorService.updateSchedule(
      userId,
      requireId(req.params.id),
      req.body,
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Schedule updated successfully",
      data: result,
    });
  },
);

export const deleteScheduleController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await doctorService.deleteSchedule(
      userId,
      requireId(req.params.id),
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Schedule deleted successfully",
      data: result,
    });
  },
);

export const updateClinicLocationController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await doctorService.updateClinicLocation(userId, req.body);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Clinic location updated successfully",
      data: result,
    });
  },
);
import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import sendResponse from "../../shared/utils/apiResponse";
import catchAsync from "../../shared/utils/asyncHandler";
import { UnauthorizedError, ValidationError } from "../../shared/errors";
import * as appointmentService from "./appointment.service";

const requireId = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError("id is required");
  }
  return value;
};

export const bookAppointmentController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await appointmentService.bookAppointment(userId, req.body);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Appointment booked successfully",
      data: result,
    });
  },
);

export const getMyAppointmentsController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const result = await appointmentService.getMyAppointments(userId, status);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Appointments retrieved successfully",
      data: result,
    });
  },
);

export const getAppointmentByIdController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId || !role) throw new UnauthorizedError("Authentication required");
    const result = await appointmentService.getAppointmentById(
      userId,
      role,
      requireId(req.params.id),
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Appointment retrieved successfully",
      data: result,
    });
  },
);

export const cancelAppointmentController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await appointmentService.cancelAppointment(
      userId,
      requireId(req.params.id),
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Appointment cancelled successfully",
      data: result,
    });
  },
);

export const getAllAppointmentsController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId || !role) throw new UnauthorizedError("Authentication required");
    const { search, status, date } = req.query;
    const result = await appointmentService.getAllAppointments(userId, role, {
      search: typeof search === "string" ? search : undefined,
      status: typeof status === "string" ? status : undefined,
      date: typeof date === "string" ? date : undefined,
    });
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Appointments retrieved successfully",
      data: result,
    });
  },
);

export const getPendingRequestsController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await appointmentService.getPendingRequests(userId);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Pending requests retrieved successfully",
      data: result,
    });
  },
);

export const acceptRequestController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await appointmentService.acceptRequest(
      userId,
      requireId(req.params.id),
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Appointment request accepted successfully",
      data: result,
    });
  },
);

export const rejectRequestController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await appointmentService.rejectRequest(
      userId,
      requireId(req.params.id),
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Appointment request rejected successfully",
      data: result,
    });
  },
);

export const rescheduleAppointmentController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await appointmentService.rescheduleAppointment(
      userId,
      requireId(req.params.id),
      req.body,
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Appointment rescheduled successfully",
      data: result,
    });
  },
);

export const cancelByStaffController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await appointmentService.cancelByStaff(
      userId,
      requireId(req.params.id),
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Appointment cancelled successfully",
      data: result,
    });
  },
);

export const updateAppointmentStatusController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await appointmentService.updateAppointmentStatus(
      userId,
      requireId(req.params.id),
      req.body.status,
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Appointment status updated successfully",
      data: result,
    });
  },
);

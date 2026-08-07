import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import sendResponse from "../../shared/utils/apiResponse";
import catchAsync from "../../shared/utils/asyncHandler";
import { UnauthorizedError, ValidationError } from "../../shared/errors";
import * as notificationService from "./notification.service";

const requireId = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError("id is required");
  }
  return value;
};

export const getNotificationsController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await notificationService.getNotifications(userId);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Notifications retrieved successfully",
      data: result,
    });
  },
);

export const markAsReadController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await notificationService.markAsRead(
      userId,
      requireId(req.params.id),
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Notification marked as read successfully",
      data: result,
    });
  },
);

export const markAllAsReadController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await notificationService.markAllAsRead(userId);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "All notifications marked as read successfully",
      data: result,
    });
  },
);

export const deleteNotificationController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await notificationService.deleteNotification(
      userId,
      requireId(req.params.id),
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Notification deleted successfully",
      data: result,
    });
  },
);

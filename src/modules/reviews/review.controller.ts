import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import sendResponse from "../../shared/utils/apiResponse";
import catchAsync from "../../shared/utils/asyncHandler";
import { UnauthorizedError, ValidationError } from "../../shared/errors";
import * as reviewService from "./review.service";

const requireId = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError("id is required");
  }
  return value;
};

export const createReviewController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await reviewService.createReview(userId, req.body);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.CREATED,
      message: "Review created successfully",
      data: result,
    });
  },
);

export const updateReviewController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await reviewService.updateReview(
      userId,
      requireId(req.params.id),
      req.body,
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Review updated successfully",
      data: result,
    });
  },
);

export const deleteReviewController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (!userId || !role) throw new UnauthorizedError("Authentication required");
    const result = await reviewService.deleteReview(
      userId,
      role,
      requireId(req.params.id),
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Review deleted successfully",
      data: result,
    });
  },
);

export const getMyReviewsController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await reviewService.getMyReviews(userId);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Reviews retrieved successfully",
      data: result,
    });
  },
);

export const getAllReviewsController = catchAsync(
  async (req: Request, res: Response) => {
    const result = await reviewService.getAllReviews();
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Reviews retrieved successfully",
      data: result,
    });
  },
);

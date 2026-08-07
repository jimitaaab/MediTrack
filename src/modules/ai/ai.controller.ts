import { Request, Response } from "express";
import httpStatus from "http-status-codes";
import sendResponse from "../../shared/utils/apiResponse";
import catchAsync from "../../shared/utils/asyncHandler";
import { UnauthorizedError } from "../../shared/errors";
import * as aiService from "./ai.service";

export const askChatbotController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await aiService.askChatbot(userId, req.body);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Response generated successfully",
      data: result,
    });
  },
);

export const getChatbotHistoryController = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("Authentication required");
    const result = await aiService.getChatbotHistory(userId);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: "Chat history retrieved successfully",
      data: result,
    });
  },
);

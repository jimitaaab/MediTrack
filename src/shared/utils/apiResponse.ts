import { Response } from "express";

interface ResponseData<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T | null;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

const sendResponse = <T>(
  res: Response,
  params: {
    success: boolean;
    statusCode: number;
    message: string;
    data?: T | null;
    meta?: ResponseData["meta"];
  },
): Response => {
  const body: ResponseData<T> = {
    success: params.success,
    statusCode: params.statusCode,
    message: params.message,
    data: params.data,
  };

  if (params.meta) {
    body.meta = params.meta;
  }

  return res.status(params.statusCode).json(body);
};

export default sendResponse;
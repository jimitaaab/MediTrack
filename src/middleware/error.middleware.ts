import { NextFunction, Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client";
import httpStatus from "http-status-codes";

const handlePrismaError = (err: Prisma.PrismaClientKnownRequestError) => {
  switch (err.code) {
    case "P2002":
      return {
        statusCode: httpStatus.CONFLICT,
        message: "Unique constraint violation",
      };
    case "P2025":
      return {
        statusCode: httpStatus.NOT_FOUND,
        message: "Record not found",
      };
    case "P2003":
      return {
        statusCode: httpStatus.BAD_REQUEST,
        message: "Foreign key constraint failed",
      };
    default:
      return {
        statusCode: httpStatus.BAD_REQUEST,
        message: err.message,
      };
  }
};

const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode = httpStatus.INTERNAL_SERVER_ERROR;
  let message = "Internal server error";

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handlePrismaError(err);
    statusCode = prismaError.statusCode;
    message = prismaError.message;
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Invalid data provided";
  } else if (err.message) {
    message = err.message;
    if (message.includes("already exists")) statusCode = httpStatus.CONFLICT;
    if (message.includes("not found")) statusCode = httpStatus.NOT_FOUND;
    if (message.includes("Invalid") || message.includes("required"))
      statusCode = httpStatus.BAD_REQUEST;
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
};

export default errorHandler;

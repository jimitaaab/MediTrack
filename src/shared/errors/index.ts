import httpStatus from "http-status-codes";

export class AppError extends Error {
  public statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(httpStatus.NOT_FOUND, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(httpStatus.UNAUTHORIZED, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(httpStatus.FORBIDDEN, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(httpStatus.CONFLICT, message);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid data provided") {
    super(httpStatus.BAD_REQUEST, message);
  }
}
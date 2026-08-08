import { NextFunction, Request, Response } from "express";
import errorHandler from "./error.middleware";
import { AppError, NotFoundError } from "../shared/errors";
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from "../test/prisma-client-stub";

describe("errorHandler middleware", () => {
  const makeRes = (): { res: Response; status: jest.Mock; json: jest.Mock } => {
    const res = {} as Response;
    const status = jest.fn().mockReturnValue(res);
    const json = jest.fn().mockReturnValue(res);
    res.status = status;
    res.json = json;
    return { res, status, json };
  };

  const req = {} as Request;
  const next = jest.fn<NextFunction>();

  it("handles AppError with its statusCode and message", () => {
    const { res, status, json } = makeRes();
    errorHandler(new NotFoundError("Nope"), req, res, next);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      statusCode: 404,
      message: "Nope",
    });
  });

  it("handles generic errors as 500", () => {
    const { res, status, json } = makeRes();
    errorHandler(new Error("something broke"), req, res, next);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      statusCode: 500,
      message: "something broke",
    });
  });

  it("maps P2002 to conflict", () => {
    const { res, status, json } = makeRes();
    const prismaErr = new PrismaClientKnownRequestError("Uniq", "P2002");
    errorHandler(prismaErr, req, res, next);
    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      success: false,
      statusCode: 409,
      message: "Unique constraint violation",
    });
  });

  it("maps P2025 to not found", () => {
    const { res, status } = makeRes();
    errorHandler(new PrismaClientKnownRequestError("NoRecord", "P2025"), req, res, next);
    expect(status).toHaveBeenCalledWith(404);
  });

  it("maps P2003 to bad request", () => {
    const { res, status } = makeRes();
    errorHandler(new PrismaClientKnownRequestError("FK", "P2003"), req, res, next);
    expect(status).toHaveBeenCalledWith(400);
  });

  it("maps unknown prisma codes to 400 with the raw message", () => {
    const { res, status, json } = makeRes();
    errorHandler(new PrismaClientKnownRequestError("Weird", "P9000"), req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(json.mock.calls[0][0].message).toBe("Weird");
  });

  it("handles PrismaClientValidationError as 400", () => {
    const { res, status, json } = makeRes();
    errorHandler(new PrismaClientValidationError("invalid"), req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      statusCode: 400,
      message: "Invalid data provided",
    });
  });

  it("maps messages containing 'already exists' to 409", () => {
    const { res, status } = makeRes();
    errorHandler(new Error("Email already exists"), req, res, next);
    expect(status).toHaveBeenCalledWith(409);
  });

  it("maps messages containing 'not found' to 404", () => {
    const { res, status } = makeRes();
    errorHandler(new Error("Order not found"), req, res, next);
    expect(status).toHaveBeenCalledWith(404);
  });

  it("maps messages containing Invalid/required to 400", () => {
    const { res, status } = makeRes();
    errorHandler(new Error("Invalid payload"), req, res, next);
    expect(status).toHaveBeenCalledWith(400);
    errorHandler(new Error("Missing required field"), req, res, next);
    expect(status).toHaveBeenCalledWith(400);
  });
});

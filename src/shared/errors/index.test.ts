import {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "./index";

describe("shared errors", () => {
  it("AppError stores statusCode and message", () => {
    const err = new AppError(418, "teapot");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(418);
    expect(err.message).toBe("teapot");
  });

  it("NotFoundError defaults to 404", () => {
    const err = new NotFoundError();
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Resource not found");
  });

  it("NotFoundError accepts custom message", () => {
    const err = new NotFoundError("missing");
    expect(err.message).toBe("missing");
  });

  it("UnauthorizedError defaults to 401", () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("Authentication required");
  });

  it("ForbiddenError defaults to 403", () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
  });

  it("ConflictError defaults to 409", () => {
    const err = new ConflictError();
    expect(err.statusCode).toBe(409);
  });

  it("ValidationError defaults to 400", () => {
    const err = new ValidationError();
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Invalid data provided");
  });
});
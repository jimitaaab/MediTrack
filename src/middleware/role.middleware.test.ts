import { NextFunction, Request, Response } from "express";
import requireRole from "./role.middleware";

describe("requireRole middleware", () => {
  const makeRes = (): Response => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res) as never;
    res.json = jest.fn().mockReturnValue(res) as never;
    return res;
  };

  it("returns 401 when req.user is missing", () => {
    const middleware = requireRole("ADMIN");
    const mockRes = makeRes();
    const next = jest.fn<NextFunction>();
    middleware({} as Request, mockRes, next);
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      statusCode: 401,
      message: "Authentication required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when the user role is not allowed", () => {
    const middleware = requireRole("ADMIN");
    const mockRes = makeRes();
    const next = jest.fn<NextFunction>();
    middleware({ user: { role: "PATIENT", id: "x", email: "e@e.c" } } as Request, mockRes, next);
    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      statusCode: 403,
      message: "You do not have permission to access this resource",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next for an allowed role", () => {
    const middleware = requireRole("ADMIN", "DOCTOR");
    const mockRes = makeRes();
    const next = jest.fn<NextFunction>();
    middleware({ user: { role: "DOCTOR", email: "e@e.c", id: "1" } } as Request, mockRes, next);
    expect(next).toHaveBeenCalledWith();
    expect(mockRes.status).not.toHaveBeenCalled();
  });
});

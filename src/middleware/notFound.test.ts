import { NextFunction, Request, Response } from "express";
import notFound from "./notFound";

describe("notFound middleware", () => {
  it("responds 404 with the route info", () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;
    const next = jest.fn<NextFunction>();
    const req = {
      method: "GET",
      originalUrl: "/api/unknown",
    } as Request;

    notFound(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      statusCode: 404,
      message: "Route not found: GET /api/unknown",
    });
    expect(next).not.toHaveBeenCalled();
  });
});

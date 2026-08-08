import { Response } from "express";
import sendResponse from "./apiResponse";

describe("sendResponse", () => {
  let res: Response;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;
  });

  it("sends body without meta and uses given status code", () => {
    const result = sendResponse<string>(res, {
      success: true,
      statusCode: 201,
      message: "created",
      data: "abc",
    });

    expect(result).toBe(res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      statusCode: 201,
      message: "created",
      data: "abc",
    });
  });

  it("omits data when not provided and includes meta when present", () => {
    sendResponse(res, {
      success: false,
      statusCode: 500,
      message: "boom",
    });
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      statusCode: 500,
      message: "boom",
      data: undefined,
    });

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "ok",
      data: null,
      meta: { page: 1, limit: 10, total: 3 },
    });
    expect(res.json).toHaveBeenLastCalledWith({
      success: true,
      statusCode: 200,
      message: "ok",
      data: null,
      meta: { page: 1, limit: 10, total: 3 },
    });
  });
});
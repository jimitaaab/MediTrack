import { NextFunction, Request, Response } from "express";
import catchAsync from "./asyncHandler";

describe("catchAsync", () => {
  it("returns a RequestHandler and runs the fn", async () => {
    const marker = jest.fn();
    const handler = catchAsync(async () => {
      marker();
    });
    const next = jest.fn();

    await handler({} as Request, {} as Response, next as NextFunction);
    expect(marker).toHaveBeenCalled();
  });

  it("forwards rejected promises to next", async () => {
    const error = new Error("boom");
    const handler = catchAsync(async () => {
      throw error;
    });
    const next = jest.fn();

    await handler({} as Request, {} as Response, next as NextFunction);
    expect(next).toHaveBeenCalledWith(error);
  });

  it("forwards resolved rejection values (not only Error)", async () => {
    const handler = catchAsync(async () => {
      throw "string-error";
    });
    const next = jest.fn();

    await handler({} as Request, {} as Response, next as NextFunction);
    expect(next).toHaveBeenCalledWith("string-error");
  });
});
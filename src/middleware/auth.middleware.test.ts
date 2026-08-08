import { NextFunction, Request, Response } from "express";
import { createPrismaMock, type PrismaMock } from "../test/mockPrisma";
import type { MockedJwtUtils } from "./middleware-test-types";

jest.mock("../config/prisma", () => ({
  prisma: createPrismaMock(),
}));
jest.mock("../config/env", () => ({
  __esModule: true,
  default: { jwt_access_Secret: "access-secret" },
}));
jest.mock("../shared/utils/jwt.utils", () => ({
  jwtUtils: { verifyToken: jest.fn() },
}));

import auth from "./auth.middleware";
import { prisma } from "../config/prisma";
import { jwtUtils } from "../shared/utils/jwt.utils";
import { UnauthorizedError } from "../shared/errors";

const mockPrisma = prisma as PrismaMock;
const mockJwt = jwtUtils as MockedJwtUtils;

describe("auth middleware", () => {
  let next: jest.Mock<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
    mockPrisma.user.findUnique.mockResolvedValue({ status: "ACTIVE" });
    mockJwt.verifyToken.mockReturnValue({
      success: true,
      data: { id: "u1", email: "a@b.c", role: "PATIENT" },
    });
  });

  const callAuth = async (req: Partial<Request>) =>
    auth(req as Request, {} as Response, next as NextFunction);

  it("throws when no token is provided", async () => {
    await callAuth({ cookies: {}, headers: {} });
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Authentication token is required" }),
    );
    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  it("accepts a cookie token", async () => {
    await callAuth({ cookies: { accessToken: "cookie-token" }, headers: {} });
    expect(mockJwt.verifyToken).toHaveBeenCalledWith(
      "cookie-token",
      "access-secret",
    );
    expect(next).toHaveBeenCalledWith();
  });

  it("accepts a Bearer header token", async () => {
    await callAuth({
      cookies: {},
      headers: { authorization: "Bearer header-token" },
    });
    expect(mockJwt.verifyToken).toHaveBeenCalledWith(
      "header-token",
      "access-secret",
    );
    expect(next).toHaveBeenCalledWith();
  });

  it("accepts a raw authorization header token", async () => {
    await callAuth({ cookies: {}, headers: { authorization: "raw-token" } });
    expect(mockJwt.verifyToken).toHaveBeenCalledWith("raw-token", "access-secret");
  });

  it("throws when the token is invalid", async () => {
    mockJwt.verifyToken.mockReturnValue({
      success: false,
      message: "bad token",
    });
    await callAuth({ cookies: { accessToken: "x" }, headers: {} });
    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
    expect((next.mock.calls[0][0] as Error).message).toBe("bad token");
  });

it("throws when the user no longer exists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await callAuth({ cookies: { accessToken: "x" }, headers: {} });
    console.log("NEXT CALLS", JSON.stringify(next.mock.calls));
    console.log(
      "findUnique CALLS",
      JSON.stringify(mockPrisma.user.findUnique.mock.calls),
    );
    expect((next.mock.calls[0][0] as Error).message).toBe("User no longer exists");
  });

  it("throws when the account is not active", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ status: "SUSPENDED" });
    await callAuth({ cookies: { accessToken: "x" }, headers: {} });
    expect((next.mock.calls[0][0] as Error).message).toContain("not active");
  });

  it("sets req.user and calls next on success", async () => {
    const req = {
      cookies: { accessToken: "x" },
      headers: {},
    } as unknown as Request;
    await auth(req, {} as Response, next as NextFunction);
    expect(req.user).toEqual({ id: "u1", email: "a@b.c", role: "PATIENT" });
    expect(next).toHaveBeenCalledWith();
  });
});

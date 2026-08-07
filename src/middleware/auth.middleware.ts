import { NextFunction, Request, Response } from "express";
import catchAsync from "../shared/utils/asyncHandler";
import config from "../config/env";
import { jwtUtils } from "../shared/utils/jwt.utils";
import { JwtPayload } from "jsonwebtoken";
import { UnauthorizedError } from "../shared/errors";

const auth = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.accessToken
    ? req.cookies.accessToken
    : req.headers.authorization?.startsWith("Bearer ")
       ? req.headers.authorization.split(" ")[1]
      : req.headers.authorization;
  if (!token) {
    throw new UnauthorizedError("Authentication token is required");
  }

  const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_Secret);

  if (!verifiedToken.success) {
    throw new UnauthorizedError(verifiedToken.message);
  }
  const { email, id,  role } = verifiedToken.data as JwtPayload;

  req.user = { email, id, role };
  next();
});

export default auth;

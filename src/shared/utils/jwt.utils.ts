import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

type VerifyResult =
  | { success: true; data: JwtPayload }
  | { success: false; message: string };

const createToken = (
  payload: Record<string, unknown>,
  secret: string,
  expiresIn: string,
): string => {
  return jwt.sign(payload, secret, { expiresIn } as SignOptions);
};

const verifyToken = (token: string, secret: string): VerifyResult => {
  try {
    const data = jwt.verify(token, secret) as JwtPayload;
    return { success: true, data };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
};

const decodeToken = (token: string): JwtPayload | null => {
  return jwt.decode(token) as JwtPayload | null;
};

export const jwtUtils = {
  createToken,
  verifyToken,
  decodeToken,
};

export type { VerifyResult };
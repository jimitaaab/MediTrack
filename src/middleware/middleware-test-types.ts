import type { VerifyResult } from "../shared/utils/jwt.utils";

export type MockedJwtUtils = {
  createToken: jest.Mock;
  verifyToken: jest.Mock<() => VerifyResult>;
  decodeToken: jest.Mock;
};
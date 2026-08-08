import { jwtUtils } from "./jwt.utils";

const SECRET = "test-secret";

describe("jwtUtils", () => {
it("createToken returns a signed token", () => {
    const token = jwtUtils.createToken(
      { id: "1", email: "ADMIN" },
      SECRET,
      "1d",
    );
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("verifyToken returns payload for a valid token", () => {
    const token = jwtUtils.createToken({ id: "1", role: "PATIENT" }, SECRET, "1d");
    const result = jwtUtils.verifyToken(token, SECRET);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("1");
      expect(result.data.role).toBe("PATIENT");
    }
  });

  it("verifyToken rejects a wrong secret", () => {
    const token = jwtUtils.createToken({ id: "1" }, "other-secret", "1d");
    const result = jwtUtils.verifyToken(token, SECRET);
    expect(result.success).toBe(false);
  });

  it("verifyToken rejects a malformed token", () => {
    const result = jwtUtils.verifyToken("not-a-jwt", SECRET);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(typeof result.message).toBe("string");
    }
  });

  it("decodeToken decodes without verification", () => {
    const token = jwtUtils.createToken({ id: "9" }, SECRET, "1d");
    const decoded = jwtUtils.decodeToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.id).toBe("9");
  });

  it("decodeToken returns null for an empty token", () => {
    expect(jwtUtils.decodeToken("")).toBeNull();
  });
});
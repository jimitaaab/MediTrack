import logger from "./logger";

describe("logger", () => {
  const origLog = console.log;
  const origError = console.error;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log = origLog;
    console.error = origError;
  });

  it("logs info with message and no meta", () => {
    logger.info("hello");
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toContain("[INFO] hello");
  });

  it("warn includes meta when provided", () => {
    logger.warn("careful", { code: 1 });
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy.mock.calls[0][0]).toContain("[WARN] careful");
    expect(logSpy.mock.calls[0][1]).toEqual({ code: 1 });
  });

  it("debug uses console.log", () => {
    logger.debug("trace", 42);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("[DEBUG] trace"), 42);
  });

  it("error uses console.error", () => {
    logger.error("failed", { cause: "x" });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain("[ERROR] failed");
    expect(errorSpy.mock.calls[0][1]).toEqual({ cause: "x" });
  });

  it("error without meta still uses console.error once", () => {
    logger.error("only-message");
    expect(errorSpy).toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });
});
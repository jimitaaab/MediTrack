type LogLevel = "info" | "warn" | "error" | "debug";

const prefix = (level: LogLevel): string =>
  `[MediTrack] [${new Date().toISOString()}] [${level.toUpperCase()}]`;

const log = (level: LogLevel, message: string, meta?: unknown): void => {
  const line = `${prefix(level)} ${message}`;
  if (meta !== undefined) {
    if (level === "error") {
      console.error(line, meta);
    } else {
      console.log(line, meta);
    }
    return;
  }
  if (level === "error") {
    console.error(line);
    return;
  }
  console.log(line);
};

export const logger = {
  info: (message: string, meta?: unknown) => log("info", message, meta),
  warn: (message: string, meta?: unknown) => log("warn", message, meta),
  error: (message: string, meta?: unknown) => log("error", message, meta),
  debug: (message: string, meta?: unknown) => log("debug", message, meta),
};

export default logger;
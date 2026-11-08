import pino from "pino";

const quiet = process.env.npm_lifecycle_event === "test" || process.env.LOG_LEVEL === "silent";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (quiet ? "silent" : "info"),
});

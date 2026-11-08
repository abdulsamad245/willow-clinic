import pino from "pino";

const script = process.env.npm_lifecycle_event ?? "";
const quiet = script.startsWith("test") || process.env.LOG_LEVEL === "silent";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (quiet ? "silent" : "info"),
});

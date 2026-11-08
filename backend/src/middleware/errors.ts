import type { ErrorRequestHandler, RequestHandler } from "express";
import { logger } from "../observability/logger.js";
import { HttpStatus } from "../shared/http.js";

export const invalidJson: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    res.status(HttpStatus.BAD_REQUEST).json({ error: "invalid json" });
    return;
  }
  next(err);
};

export const notFound: RequestHandler = (_req, res) => {
  res.status(HttpStatus.NOT_FOUND).json({ error: "not found" });
};

export const unhandled: ErrorRequestHandler = (err, _req, res, _next) => {
  logger.error({ err }, "unhandled error");
  res.status(HttpStatus.INTERNAL).json({ error: "internal error" });
};

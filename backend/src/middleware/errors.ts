import type { ErrorRequestHandler, RequestHandler } from "express";

export const invalidJson: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "invalid json" });
    return;
  }
  next(err);
};

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "not found" });
};

export const unhandled: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "internal error" });
};

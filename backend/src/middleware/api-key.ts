import type { RequestHandler } from "express";

export function requireApiKey(apiKey: string): RequestHandler {
  return (req, res, next) => {
    const key = req.get("X-API-Key");
    if (!key || key !== apiKey) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    next();
  };
}

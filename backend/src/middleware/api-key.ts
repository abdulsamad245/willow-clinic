import type { RequestHandler } from "express";
import { HttpStatus } from "../shared/http.js";

export function requireApiKey(apiKey: string): RequestHandler {
  return (req, res, next) => {
    const key = req.get("X-API-Key");
    if (!key || key !== apiKey) {
      res.status(HttpStatus.UNAUTHORIZED).json({ error: "unauthorized" });
      return;
    }
    next();
  };
}

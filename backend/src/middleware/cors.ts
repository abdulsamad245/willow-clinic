import type { RequestHandler } from "express";
import { HttpStatus } from "../shared/http.js";

export const cors: RequestHandler = (req, res, next) => {
  const origin = process.env.FRONTEND_ORIGIN || "*";
  res.set("Access-Control-Allow-Origin", origin);
  res.set("Access-Control-Allow-Headers", "Content-Type, X-API-Key, Idempotency-Key");
  res.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.set("Access-Control-Expose-Headers", "Retry-After");
  if (req.method === "OPTIONS") {
    res.status(HttpStatus.NO_CONTENT).end();
    return;
  }
  next();
};

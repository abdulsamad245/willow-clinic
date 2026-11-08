import { Router } from "express";
import { queryString } from "../../shared/http.js";
import type { BookingService } from "./bookings.service.js";

export function bookingsRouter(service: BookingService, clock: () => Date): Router {
  const router = Router();

  router.post("/", (req, res) => {
    const result = service.create({
      body: req.body,
      rawBody: req.rawBody,
      idempotencyKey: req.get("Idempotency-Key"),
      now: clock(),
    });
    if (result.headers) {
      for (const [name, value] of Object.entries(result.headers)) {
        res.set(name, value);
      }
    }
    res.status(result.status).json(result.body);
  });

  router.get("/", (req, res) => {
    const result = service.listByEmail({
      email: queryString(req.query.email),
      limit: queryString(req.query.limit),
      cursor: queryString(req.query.cursor),
    });
    res.status(result.status).json(result.body);
  });

  router.get("/:id", (req, res) => {
    const result = service.getById(String(req.params.id));
    res.status(result.status).json(result.body);
  });

  router.delete("/:id", (req, res) => {
    const result = service.cancel(String(req.params.id));
    res.status(result.status).json(result.body);
  });

  return router;
}

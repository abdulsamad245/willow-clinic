import { Router } from "express";
import { queryString } from "../../shared/http.js";
import type { Store } from "../../infrastructure/store.js";

export function slotsRouter(store: Store): Router {
  const router = Router();

  router.get("/", (req, res) => {
    const provider = queryString(req.query.provider);
    res.status(200).json({ slots: store.listSlots(provider || undefined) });
  });

  return router;
}

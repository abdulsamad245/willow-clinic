import { Router } from "express";
import type { Store } from "../../infrastructure/store.js";
import { asyncHandler } from "../../shared/async-handler.js";
import { HttpStatus, queryString } from "../../shared/http.js";

export function slotsRouter(store: Store): Router {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const provider = queryString(req.query.provider);
      res.status(HttpStatus.OK).json({ slots: await store.listSlots(provider || undefined) });
    })
  );

  return router;
}

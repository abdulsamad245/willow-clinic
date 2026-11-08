import { Router } from "express";
import { resetBodySchema } from "@willow/shared";
import type { Store } from "../../infrastructure/store.js";
import { asyncHandler } from "../../shared/async-handler.js";
import { HttpStatus } from "../../shared/http.js";

export function resetRouter(store: Store): Router {
  const router = Router();

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const parsed = resetBodySchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(HttpStatus.BAD_REQUEST).json({ error: "slots is required" });
        return;
      }
      await store.reset(parsed.data.slots);
      res.status(HttpStatus.OK).json({ ok: true, slots: parsed.data.slots.length });
    })
  );

  return router;
}

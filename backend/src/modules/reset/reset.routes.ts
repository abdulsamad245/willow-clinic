import { Router } from "express";
import type { Store } from "../../infrastructure/store.js";
import type { Slot } from "../../shared/types.js";

function isSlot(value: unknown): value is Slot {
  if (!value || typeof value !== "object") return false;
  const slot = value as Record<string, unknown>;
  return [slot.id, slot.provider, slot.start, slot.end].every((field) => field != null);
}

export function resetRouter(store: Store): Router {
  const router = Router();

  router.post("/", (req, res) => {
    const slots = req.body?.slots;
    if (!Array.isArray(slots) || !slots.every(isSlot)) {
      res.status(400).json({ error: "slots is required" });
      return;
    }
    store.reset(
      slots.map((slot) => ({
        id: String(slot.id),
        provider: String(slot.provider),
        start: String(slot.start),
        end: String(slot.end),
      }))
    );
    res.status(200).json({ ok: true, slots: slots.length });
  });

  return router;
}

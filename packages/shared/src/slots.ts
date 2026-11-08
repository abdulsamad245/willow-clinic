import { z } from "zod";

export const slotSchema = z.object({
  id: z.coerce.string().min(1),
  provider: z.coerce.string().min(1),
  start: z.coerce.string().min(1),
  end: z.coerce.string().min(1),
});

export const resetBodySchema = z.object({
  slots: z.array(slotSchema),
});

export type Slot = z.infer<typeof slotSchema>;

export type SlotWithAvailability = Slot & { available: boolean };

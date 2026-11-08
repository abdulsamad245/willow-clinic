import type { Store } from "../infrastructure/store.js";
import type { Slot } from "../shared/types.js";

const PROVIDERS = ["Dr Ade", "Dr Nkechi", "Dr Tunde"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function utcStamp(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:00Z`;
}

export function demoSlots(): Slot[] {
  const slots: Slot[] = [];
  const days = [10, 11, 12, 14, 15];
  let n = 1;

  for (const day of days) {
    for (const [providerIndex, provider] of PROVIDERS.entries()) {
      for (const hour of [9, 10, 11, 13, 14, 15]) {
        const start = new Date(Date.UTC(2026, 11, day, hour, providerIndex * 10, 0));
        const end = new Date(start.getTime() + 30 * 60 * 1000);
        slots.push({
          id: `s${n++}`,
          provider,
          start: utcStamp(start),
          end: utcStamp(end),
        });
      }
    }
  }

  return slots;
}

export async function seedIfEmpty(store: Store): Promise<boolean> {
  if ((await store.slotCount()) > 0) return false;
  await store.reset(demoSlots());
  return true;
}

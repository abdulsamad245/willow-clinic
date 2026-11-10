import { forwardToClinic } from "@/lib/clinic-api";

async function byId(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return forwardToClinic(req, `/bookings/${encodeURIComponent(id)}`);
}

export const GET = byId;
export const DELETE = byId;

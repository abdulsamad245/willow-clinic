import { forwardToClinic } from "@/lib/clinic-api";

export function GET(req: Request) {
  return forwardToClinic(req, "/slots");
}

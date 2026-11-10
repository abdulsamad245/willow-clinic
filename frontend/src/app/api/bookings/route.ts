import { forwardToClinic } from "@/lib/clinic-api";

export function GET(req: Request) {
  return forwardToClinic(req, "/bookings");
}

export function POST(req: Request) {
  return forwardToClinic(req, "/bookings");
}

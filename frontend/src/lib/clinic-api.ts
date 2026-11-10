import { NextResponse } from "next/server";

const API_BASE_URL = String(process.env.API_BASE_URL ?? "").replace(/\/$/, "");
const API_KEY = String(process.env.API_KEY ?? "");

export async function forwardToClinic(req: Request, path: string): Promise<NextResponse> {
  if (!API_BASE_URL || !API_KEY) {
    return NextResponse.json({ error: "clinic API is not configured" }, { status: 500 });
  }

  const headers: Record<string, string> = { "X-API-Key": API_KEY };
  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;
  const idempotency = req.headers.get("Idempotency-Key");
  if (idempotency) headers["Idempotency-Key"] = idempotency;

  try {
    const res = await fetch(`${API_BASE_URL}${path}${new URL(req.url).search}`, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.text(),
    });
    const body = await res.text();
    const out = new Headers();
    const type = res.headers.get("content-type");
    if (type) out.set("Content-Type", type);
    const retryAfter = res.headers.get("Retry-After");
    if (retryAfter) out.set("Retry-After", retryAfter);
    return new NextResponse(body, { status: res.status, headers: out });
  } catch {
    return NextResponse.json({ error: "We could not reach the clinic API. Please try again." }, { status: 502 });
  }
}

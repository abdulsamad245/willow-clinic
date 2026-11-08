import type { Express } from "express";

export function mountPublicRoutes(app: Express, apiKey: string): void {
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/", (_req, res) => {
    res.json({ ok: true, service: "willow-clinic-api" });
  });

  app.get("/config.json", (_req, res) => {
    res.json({ apiKey });
  });
}

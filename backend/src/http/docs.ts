import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Express, Request } from "express";
import swaggerUi from "swagger-ui-express";
import { repoRoot } from "../config/paths.js";

type OpenApiDoc = Record<string, unknown>;

function loadSpec(): OpenApiDoc {
  const raw = readFileSync(join(repoRoot, "spec", "openapi.json"), "utf8");
  return JSON.parse(raw) as OpenApiDoc;
}

function publicUrl(req: Request): string {
  const host = req.get("host") ?? "127.0.0.1:3001";
  return `${req.protocol}://${host}`;
}

export function mountDocs(app: Express): void {
  const spec = loadSpec();

  app.get("/openapi.json", (req, res) => {
    res.json({ ...spec, servers: [{ url: publicUrl(req) }] });
  });

  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      customSiteTitle: "Willow Clinic API",
      swaggerOptions: {
        url: "/openapi.json",
        persistAuthorization: true,
      },
    })
  );
}

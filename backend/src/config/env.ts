import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type AppConfig = {
  port: number;
  apiKey: string;
  dbPath: string;
  databaseUrl: string;
};

function readLocalEnv(): void {
  const fromBackend = resolve(dirname(fileURLToPath(import.meta.url)), "../../.env");
  for (const file of [fromBackend, resolve(process.cwd(), ".env"), resolve(process.cwd(), "backend/.env")]) {
    if (!existsSync(file)) continue;
    process.loadEnvFile(file);
    return;
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (env === process.env) readLocalEnv();
  const apiKey = env.API_KEY?.trim() ?? "";
  if (!apiKey) {
    throw new Error("API_KEY is required");
  }
  return {
    port: Number(env.PORT) || 3001,
    apiKey,
    dbPath: env.DB_PATH || "./data/clinic.db",
    databaseUrl: env.DATABASE_URL?.trim() ?? "",
  };
}

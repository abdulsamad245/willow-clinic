import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
export const backendRoot = join(here, "..", "..");
export const repoRoot = join(backendRoot, "..");

export function webDir(): string {
  if (process.env.WEB_DIR) return process.env.WEB_DIR;
  return join(repoRoot, "frontend", "out");
}

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DatabaseSync } from "node:sqlite";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "migrations");

function migrationFiles(): string[] {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

function sql(file: string): string {
  return readFileSync(join(migrationsDir, file), "utf8");
}

export function migrate(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    db
      .prepare("SELECT id FROM schema_migrations")
      .all()
      .map((row) => String((row as { id: string }).id))
  );

  const insert = db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)");

  for (const file of migrationFiles()) {
    if (applied.has(file)) continue;
    db.exec(sql(file));
    insert.run(file, new Date().toISOString());
  }
}

type QueryFn = (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;

export async function migratePostgres(query: QueryFn): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const result = await query("SELECT id FROM schema_migrations");
  const applied = new Set(result.rows.map((row) => String(row.id)));

  for (const file of migrationFiles()) {
    if (applied.has(file)) continue;
    await query(sql(file));
    await query("INSERT INTO schema_migrations (id, applied_at) VALUES ($1, $2)", [file, new Date().toISOString()]);
  }
}

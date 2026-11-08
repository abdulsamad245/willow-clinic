import type { AppConfig } from "../config/env.js";
import { logger } from "../observability/logger.js";
import { PostgresStore } from "./postgres.store.js";
import { SqliteStore } from "./sqlite.store.js";
import type { Store } from "./store.js";

export async function createStore(config: AppConfig): Promise<Store> {
  if (config.databaseUrl) {
    logger.info("Using PostgreSQL");
    return PostgresStore.connect(config.databaseUrl);
  }
  logger.info({ dbPath: config.dbPath }, "Using SQLite");
  return new SqliteStore(config.dbPath);
}

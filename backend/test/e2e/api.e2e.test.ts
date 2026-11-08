import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after } from "node:test";
import { SqliteStore } from "../../src/infrastructure/sqlite.store.js";
import { registerContract, registerPersistence, registerStoreLifecycle } from "./contract.js";

const { getBaseUrl, cleanup } = registerStoreLifecycle(async () => new SqliteStore(":memory:"));
after(cleanup);
registerContract(getBaseUrl);

const dir = mkdtempSync(join(tmpdir(), "willow-"));
after(() => {
  rmSync(dir, { recursive: true, force: true });
});
registerPersistence(async () => new SqliteStore(join(dir, "clinic.db")));

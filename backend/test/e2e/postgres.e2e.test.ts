import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { after } from "node:test";
import { PostgresStore } from "../../src/infrastructure/postgres.store.js";
import { registerContract, registerPersistence, registerStoreLifecycle } from "./contract.js";

let container: StartedPostgreSqlContainer;

const { getBaseUrl, cleanup } = registerStoreLifecycle(async () => {
  try {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();
  } catch (err) {
    throw new Error(
      `Postgres e2e needs Docker running (Testcontainers). ${String((err as Error).message ?? err)}`
    );
  }
  return PostgresStore.connect(container.getConnectionUri());
});

registerContract(getBaseUrl);
registerPersistence(async () => PostgresStore.connect(container.getConnectionUri()));

after(async () => {
  await cleanup();
  if (container) {
    await container.stop({ timeout: 10 });
  }
});

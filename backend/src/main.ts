import { createApp } from "./app.js";
import { loadConfig } from "./config/env.js";
import { createStore } from "./infrastructure/create-store.js";
import { logger } from "./observability/logger.js";
import { seedIfEmpty } from "./seed/demo.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const store = await createStore(config);
  const seeded = await seedIfEmpty(store);
  const app = createApp({ store, apiKey: config.apiKey });

  app.listen(config.port, "0.0.0.0", () => {
    logger.info({ port: config.port }, "Willow Clinic listening");
    if (seeded) {
      logger.info("Loaded sample timetable");
    }
  });
}

main().catch((err) => {
  logger.error({ err }, "failed to start");
  process.exit(1);
});

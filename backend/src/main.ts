import { createApp } from "./app.js";
import { loadConfig } from "./config/env.js";
import { SqliteStore } from "./infrastructure/sqlite.store.js";
import { seedIfEmpty } from "./seed/demo.js";

const config = loadConfig();
const store = new SqliteStore(config.dbPath);
const seeded = seedIfEmpty(store);
const app = createApp({ store, apiKey: config.apiKey });

app.listen(config.port, "0.0.0.0", () => {
  console.log(`Willow Clinic listening on http://localhost:${config.port}`);
  console.log(`X-API-Key: ${config.apiKey}`);
  if (seeded) {
    console.log("Loaded sample December 2026 timetable");
  }
});

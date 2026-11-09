import { loadConfig } from "../config/env.js";
import { createStore } from "../infrastructure/create-store.js";
import { logger } from "../observability/logger.js";
import { seed } from "./demo.js";

const store = await createStore(loadConfig());
await seed(store);
await store.close();
logger.info("Loaded sample timetable and 12 bookings for ada@example.com");

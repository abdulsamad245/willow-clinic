export type AppConfig = {
  port: number;
  apiKey: string;
  dbPath: string;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: Number(env.PORT) || 3001,
    apiKey: env.API_KEY || "koya_c4_willow_9e2b7f4a",
    dbPath: env.DB_PATH || "./data/clinic.db",
  };
}

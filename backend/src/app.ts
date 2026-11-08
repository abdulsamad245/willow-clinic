import { randomUUID } from "node:crypto";
import express, { type Express, type Request } from "express";
import { pinoHttp } from "pino-http";
import type { Store } from "./infrastructure/store.js";
import { cors } from "./middleware/cors.js";
import { logger } from "./observability/logger.js";
import { requireApiKey } from "./middleware/api-key.js";
import { invalidJson, notFound, unhandled } from "./middleware/errors.js";
import { securityHeaders } from "./middleware/security-headers.js";
import { BookingService } from "./modules/bookings/bookings.service.js";
import { bookingsRouter } from "./modules/bookings/bookings.routes.js";
import { resetRouter } from "./modules/reset/reset.routes.js";
import { slotsRouter } from "./modules/slots/slots.routes.js";
import { mountDocs } from "./http/docs.js";
import { mountPublicRoutes } from "./http/public.js";

export type CreateAppOptions = {
  store: Store;
  apiKey: string;
  clock?: () => Date;
};

export function createApp({ store, apiKey, clock = () => new Date() }: CreateAppOptions): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(cors);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers["x-request-id"];
        const id = typeof incoming === "string" && incoming ? incoming : randomUUID();
        res.setHeader("X-Request-Id", id);
        return id;
      },
      customLogLevel: (_req, res, err) => {
        if (res.statusCode >= 500 || err) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
      },
      customSuccessMessage: (req, res) => `${req.method} ${req.originalUrl ?? req.url} ${res.statusCode}`,
      customErrorMessage: (req, res, err) => `${req.method} ${req.originalUrl ?? req.url} ${res.statusCode} ${err.message}`,
      autoLogging: {
        ignore: (req) => {
          const url = req.url ?? "";
          return url === "/health" || url === "/config.json" || url === "/openapi.json" || url.startsWith("/docs");
        },
      },
    })
  );
  app.use(securityHeaders);
  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buf) => {
        (req as Request).rawBody = buf.toString("utf8");
      },
    })
  );
  app.use(invalidJson);

  mountPublicRoutes(app, apiKey);
  mountDocs(app);
  app.use(requireApiKey(apiKey));

  const bookings = new BookingService(store);
  app.use("/reset", resetRouter(store));
  app.use("/slots", slotsRouter(store));
  app.use("/bookings", bookingsRouter(bookings, clock));
  app.use(notFound);
  app.use(unhandled);

  return app;
}

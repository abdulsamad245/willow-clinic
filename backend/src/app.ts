import express, { type Express, type Request } from "express";
import type { Store } from "./infrastructure/store.js";
import { cors } from "./middleware/cors.js";
import { requireApiKey } from "./middleware/api-key.js";
import { invalidJson, notFound, unhandled } from "./middleware/errors.js";
import { securityHeaders } from "./middleware/security-headers.js";
import { BookingService } from "./modules/bookings/bookings.service.js";
import { bookingsRouter } from "./modules/bookings/bookings.routes.js";
import { resetRouter } from "./modules/reset/reset.routes.js";
import { slotsRouter } from "./modules/slots/slots.routes.js";
import { mountPublicSite } from "./web/static.js";

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

  mountPublicSite(app, apiKey);
  app.use(requireApiKey(apiKey));

  const bookings = new BookingService(store);
  app.use("/reset", resetRouter(store));
  app.use("/slots", slotsRouter(store));
  app.use("/bookings", bookingsRouter(bookings, clock));
  app.use(notFound);
  app.use(unhandled);

  return app;
}

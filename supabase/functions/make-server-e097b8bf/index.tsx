import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import routes from "./routes.tsx";
import twilioRoutes from "./twilio.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-e097b8bf/health", (c) => {
  return c.json({ status: "ok" });
});

// Mount API routes
app.route("/", routes);

// Mount Twilio routes
app.route("/", twilioRoutes);

Deno.serve(app.fetch);
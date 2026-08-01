import { healthHandler } from "./health.js";
import { dbHealthHandler } from "./db-health.js";

export type Handler = (
  req: Request
) => Response | Promise<Response>;

const routes: Record<string, Handler> = {
  "GET /api/health": healthHandler,
  "GET /api/db-health": dbHealthHandler,
};

export function router(req: Request): Response | Promise<Response> {
  const url = new URL(req.url);
  const key = `${req.method} ${url.pathname}`;
  const handler = routes[key];
  if (handler) return handler(req);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}

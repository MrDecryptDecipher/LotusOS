import "./env.js";
import { router } from "./routes/index.js";

const PORT = parseInt(process.env.BACKEND_PORT || "3001", 10);

const server = Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  fetch(req) {
    return router(req);
  },
});

console.log(`LotusOS backend running on http://0.0.0.0:${server.port}`);

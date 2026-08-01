import { pingDb } from "../db.js";

export async function dbHealthHandler(_req: Request): Promise<Response> {
  try {
    const result = await pingDb();
    return Response.json({
      status: "ok",
      database: "connected",
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";
    if (message.includes("DATABASE_URL is not set")) {
      return Response.json(
        {
          status: "error",
          database: "not_configured",
          error:
            "DATABASE_URL is not set. Set it in the environment to connect to PostgreSQL.",
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }
    return Response.json(
      {
        status: "error",
        database: "unreachable",
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

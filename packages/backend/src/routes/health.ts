export function healthHandler(_req: Request): Response {
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}

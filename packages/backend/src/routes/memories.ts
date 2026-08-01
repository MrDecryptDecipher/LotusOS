import { applyDecay, consolidateMemories, getMemories, retrieveMemories, storeMemory } from "../engines/memory.js";
import type { Handler } from "./index.js";

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
const error = (e: unknown) => json({ error: e instanceof Error ? e.message : "Request failed" }, 400);
async function body(req: Request): Promise<Record<string, unknown>> { return await req.json() as Record<string, unknown>; }

export const storeMemoryHandler: Handler = async (req) => { try { const b = await body(req); return json(await storeMemory({ userId: String(b.userId), content: String(b.content), source: b.source as never, sourceId: b.sourceId as string | undefined, importance: b.importance as number | undefined }), 201); } catch (e) { return error(e); } };
export const searchMemoriesHandler: Handler = async (req) => { try { const u = new URL(req.url); return json(await retrieveMemories({ userId: u.searchParams.get("userId") ?? "", query: u.searchParams.get("q") ?? "", limit: Number(u.searchParams.get("limit") ?? 10) })); } catch (e) { return error(e); } };
export const listMemoriesHandler: Handler = async (req) => { try { const u = new URL(req.url); return json(await getMemories({ userId: u.searchParams.get("userId") ?? "", source: u.searchParams.get("source") ?? undefined, sortBy: (u.searchParams.get("sortBy") as "importance" | "recency" | "decay" | null) ?? undefined, limit: Number(u.searchParams.get("limit") ?? 50), offset: Number(u.searchParams.get("offset") ?? 0) })); } catch (e) { return error(e); } };
export const consolidateHandler: Handler = async (req) => { try { const b = await body(req); return json(await consolidateMemories({ userId: String(b.userId) })); } catch (e) { return error(e); } };
export const decayHandler: Handler = async (req) => { try { const b = await body(req); return json(await applyDecay({ userId: String(b.userId) })); } catch (e) { return error(e); } };

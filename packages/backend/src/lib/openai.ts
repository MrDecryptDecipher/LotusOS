import OpenAI from "openai";

const NIM_BASE_URL = "https://integrate.api.nvidia.com/v1";

// Chat models — free unlimited on NVIDIA NIM
export const CHAT_MODEL = "z-ai/glm-5.2";
// Embedding model — BGE-M3 produces 1024-dimensional vectors
export const EMBEDDING_MODEL = "baai/bge-m3";
export const EMBEDDING_DIMS = 1024;

let _nim: OpenAI | null = null;
let _openai: OpenAI | null = null;

/** Primary AI client — NVIDIA NIM (free, unlimited, OpenAI-compatible) */
export function getAI(): OpenAI {
  if (!_nim) {
    const apiKey = process.env.NIM_API_KEY;
    if (!apiKey) {
      throw new Error("NIM_API_KEY is not set — configure it in packages/backend/.env");
    }
    _nim = new OpenAI({ baseURL: NIM_BASE_URL, apiKey });
  }
  return _nim;
}

/** Fallback OpenAI client (paid, used only when NIM is unavailable) */
export function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.startsWith("postgresql://")) {
      throw new Error("OPENAI_API_KEY is not set or invalid");
    }
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

/** Get the best available AI client — tries NIM first, falls back to OpenAI */
export function getBestAI(): OpenAI {
  try {
    const nimKey = process.env.NIM_API_KEY;
    if (nimKey) return getAI();
  } catch { /* fall through */ }
  return getOpenAI();
}

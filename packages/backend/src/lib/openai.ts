import OpenAI from "openai";

let _openai: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.startsWith("postgresql://")) {
      throw new Error(
        "OPENAI_API_KEY is not set or contains an invalid value. " +
        "Please set a valid OpenAI API key (starting with 'sk-') in the .env file."
      );
    }
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export function getGoogleGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }

  client ??= new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 30_000,
      retryOptions: {
        attempts: 1,
      },
    },
  });
  return client;
}

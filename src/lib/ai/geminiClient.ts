import { GoogleGenAI } from "@google/genai";

/**
 * Server-only. The API key must never reach the browser bundle — only import
 * this from route handlers (src/app/api/**), never from a "use client" file.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set. Add it to .env.local to enable AI-assisted input.");
  }
  return new GoogleGenAI({ apiKey });
}

export const GEMINI_TEXT_MODEL = "gemini-3.6-flash";
export const GEMINI_VISION_MODEL = "gemini-3.6-flash";

/**
 * Gemini occasionally returns a transient 503 "high demand" error even on a
 * valid request — retry a couple of times with backoff before giving up.
 */
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const message = err instanceof Error ? err.message : String(err);
      const isRetryable = message.includes("503") || message.includes("UNAVAILABLE") || message.includes("overloaded");
      if (!isRetryable || i === attempts - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** i));
    }
  }
  throw lastErr;
}

/** Turns a thrown Gemini error into a message safe to show the end user. */
export function describeGeminiError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("RESOURCE_EXHAUSTED") || message.includes("429")) {
    return "The AI service has hit its request quota for today. Please fill this in manually for now — try again tomorrow, or ask your admin to upgrade the API plan.";
  }
  return fallback;
}

import { GoogleGenAI } from '@google/genai';
import { AppError } from '../middleware/error.middleware';

const client = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// "-latest" alias, not a pinned version — Google periodically retires pinned
// model IDs for new API keys (e.g. gemini-2.5-flash 404s as of writing);
// the alias always points at Google's current recommended flash model.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

// Unlike email.ts (which silently no-ops without an API key, since a missed
// email is recoverable), chat has no fallback — an unconfigured key must
// surface as a real error to the caller.
export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    throw new AppError(503, 'AI chat is not configured on this server');
  }
  return client;
}

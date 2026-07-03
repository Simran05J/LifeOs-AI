/**
 * Frontend service layer for the LifeOS AI chat API.
 * Calls: POST /api/v1/chat
 *
 * The Vite dev-server proxy (vite.config.js) forwards /api/* → http://localhost:8000
 * so no absolute URL or CORS handling is required during development.
 *
 * Request shape  (matches backend app/schemas/chat.py :: ChatRequest):
 *   { message: string, session_id?: string }
 *
 * Success response envelope  (matches backend app/schemas/common.py :: SuccessResponse):
 *   { success: true, message: string, data: ChatResponse }
 *
 * Error response envelope  (matches backend app/schemas/common.py :: ErrorResponse):
 *   { success: false, error: string, detail?: any }
 *   — FastAPI also uses { detail: string } for HTTPException responses.
 */

import type { ChatRequest, ChatResponse, SuccessResponse } from '../types/chat';

const CHAT_ENDPOINT = '/api/v1/chat';

// ── Internal envelope types ──────────────────────────────────────────────────

/**
 * Shape returned by the backend on non-2xx status codes.
 * Covers both FastAPI HTTPException ({ detail }) and the app's ErrorResponse
 * schema ({ success: false, error, detail }).
 */
interface ErrorEnvelope {
  success?: false;
  error?: string;
  detail?: string | { msg?: string } | unknown;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Retrieve the Firebase ID token stored by the auth flow.
 * Read once per request to avoid double localStorage access.
 * Falls back to an empty string — the backend will return 401 which surfaces as an error.
 */
function getAuthToken(): string {
  return localStorage.getItem('lifeos_auth_token') ?? '';
}

/**
 * Extract the most useful error string from a backend error envelope.
 * Handles: FastAPI HTTPException, backend ErrorResponse, and plain strings.
 */
function extractErrorMessage(envelope: ErrorEnvelope, httpStatus: number): string {
  // FastAPI HTTPException — { detail: "string" }
  if (typeof envelope.detail === 'string' && envelope.detail.trim()) {
    return envelope.detail;
  }
  // FastAPI validation error — { detail: [{ msg: "..." }] }
  if (Array.isArray(envelope.detail) && envelope.detail.length > 0) {
    const first = (envelope.detail as { msg?: string }[])[0];
    if (first?.msg) return first.msg;
  }
  // Backend ErrorResponse — { error: "string" }
  if (typeof envelope.error === 'string' && envelope.error.trim()) {
    return envelope.error;
  }
  // Fallback
  return `Request failed with status ${httpStatus}.`;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a user message to the LifeOS AI backend and return the AI response.
 *
 * @param message    The user's raw text input.
 * @param sessionId  Optional existing session identifier (pass null to start fresh).
 * @returns          Resolved ChatResponse containing the AI's reply and session metadata.
 * @throws           Error with a human-readable message on network failure or non-2xx status.
 */
export async function sendChatMessage(
  message: string,
  sessionId: string | null = null,
): Promise<ChatResponse> {
  // Read the token once — avoids two separate localStorage lookups
  const token = getAuthToken();

  const requestBody: ChatRequest = {
    message,
    ...(sessionId ? { session_id: sessionId } : {}),
  };

  // ── Network request ──────────────────────────────────────────────────────
  let response: Response;
  try {
    response = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(requestBody),
    });
  } catch {
    throw new Error(
      'Unable to reach the LifeOS server. Please check your connection and try again.',
    );
  }

  // ── Parse JSON ───────────────────────────────────────────────────────────
  // Always attempt to parse — we need the body for both success and error paths.
  let envelope: (SuccessResponse & { detail?: unknown }) | ErrorEnvelope;
  try {
    envelope = await response.json();
  } catch {
    throw new Error(`Server returned an unreadable response (HTTP ${response.status}).`);
  }

  // ── Error path ───────────────────────────────────────────────────────────
  if (!response.ok) {
    const message = extractErrorMessage(envelope as ErrorEnvelope, response.status);
    throw new Error(message);
  }

  // ── Success path ─────────────────────────────────────────────────────────
  const successEnvelope = envelope as SuccessResponse;

  // Guard: backend returned 200 but data is missing (should never happen, but be safe)
  if (!successEnvelope.data) {
    throw new Error('Server returned a success response with no data. Please try again.');
  }

  return successEnvelope.data;
}

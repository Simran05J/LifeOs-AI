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

import type { ChatRequest, ChatResponse, SuccessResponse, ChatMessage } from '../types/chat';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';

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
    // Send local wall-clock time so backend AI sees the user's actual current time.
    // Do NOT use toISOString() which converts to UTC and confuses time-relative phrases.
    local_time: (() => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    })(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: Intl.DateTimeFormat().resolvedOptions().locale || 'en-IN',
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

// ── Firestore Database Loaders ───────────────────────────────────────────────

export interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  startedAt: string;
  updatedAt: string;
}

/**
 * Loads all chat sessions for the authenticated user from Firestore, ordered by updatedAt DESC.
 */
export async function fetchChatSessions(userId: string): Promise<ChatSession[]> {
  const db = getFirestore();
  const sessionsRef = collection(db, 'users', userId, 'chat_sessions');
  const q = query(sessionsRef, orderBy('updated_at', 'desc'));
  const querySnapshot = await getDocs(q);
  const sessions: ChatSession[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    sessions.push({
      id: doc.id,
      title: data.title || 'Untitled Chat',
      lastMessage: data.last_message || '',
      startedAt: data.started_at?.toDate().toISOString() || new Date().toISOString(),
      updatedAt: data.updated_at?.toDate().toISOString() || new Date().toISOString(),
    });
  });
  return sessions;
}

/**
 * Loads all messages inside a specific chat session from Firestore, ordered by timestamp ASC.
 */
export async function fetchChatMessages(userId: string, sessionId: string): Promise<ChatMessage[]> {
  const db = getFirestore();
  const messagesRef = collection(db, 'users', userId, 'chat_sessions', sessionId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  const querySnapshot = await getDocs(q);
  const messages: ChatMessage[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    const dateVal = data.timestamp?.toDate() || new Date();
    const timeStr = dateVal.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messages.push({
      id: doc.id,
      sender: data.sender === 'assistant' ? 'assistant' : 'user',
      text: data.message || '',
      time: timeStr,
    });
  });
  return messages;
}

/**
 * Saves a single message to the conversation's messages subcollection in Firestore.
 */
export async function saveChatMessage(
  userId: string,
  sessionId: string,
  messageId: string,
  sender: 'user' | 'assistant',
  text: string
): Promise<void> {
  const db = getFirestore();
  const msgRef = doc(db, 'users', userId, 'chat_sessions', sessionId, 'messages', messageId);
  await setDoc(msgRef, {
    sender,
    role: sender,
    message: text,
    content: text,
    timestamp: serverTimestamp(),
  });
}

/**
 * Updates the chat session's updatedAt, lastMessage, and messageCount in Firestore.
 */
export async function updateChatSessionMetadata(
  userId: string,
  sessionId: string,
  lastMessage: string,
  messageCountIncrement: number = 1
): Promise<void> {
  const db = getFirestore();
  const sessionRef = doc(db, 'users', userId, 'chat_sessions', sessionId);
  await updateDoc(sessionRef, {
    last_message: lastMessage,
    lastMessage: lastMessage,
    updated_at: serverTimestamp(),
    updatedAt: serverTimestamp(),
    message_count: increment(messageCountIncrement),
    messageCount: increment(messageCountIncrement),
  });
}

/**
 * Permanently deletes a chat session and all its nested messages via the backend.
 *
 * @param sessionId  Unique identifier of the session to delete.
 * @throws           Error with a human-readable message on failure.
 */
export async function deleteChatSession(sessionId: string): Promise<void> {
  const token = getAuthToken();
  const endpoint = `${CHAT_ENDPOINT}/${sessionId}`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new Error(
      'Unable to reach the LifeOS server. Please check your connection and try again.'
    );
  }

  let envelope: { success?: boolean; message?: string } | ErrorEnvelope;
  try {
    envelope = await response.json();
  } catch {
    throw new Error(`Server returned an unreadable response (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const message = extractErrorMessage(envelope as ErrorEnvelope, response.status);
    throw new Error(message);
  }
}


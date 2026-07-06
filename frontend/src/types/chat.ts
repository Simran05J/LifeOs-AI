/**
 * Frontend TypeScript types mirroring the backend Pydantic schemas:
 *   backend/app/schemas/chat.py  →  ChatRequest, ChatResponse
 *   backend/app/schemas/common.py →  SuccessResponse
 */

/** Payload sent to POST /api/v1/chat */
export interface ChatRequest {
  /** The chat message content sent by the user (1–5000 chars) */
  message: string;
  /** Unique identifier for the chat session; omit to start a new session */
  session_id?: string;
  /** ISO string of the client's local time */
  local_time?: string;
  /** IANA timezone identifier of the client */
  timezone?: string;
  /** BCP 47 locale string of the client (e.g. en-IN) */
  locale?: string;
}

/** Payload returned inside SuccessResponse.data from POST /api/v1/chat */
export interface ChatResponse {
  /** The AI-generated response message */
  message: string;
  /** Session identifier (echoed or newly assigned) */
  session_id: string;
  /** Unique ID for this specific response message */
  response_id: string;
  /** ISO timestamp when the response was created */
  created_at: string;
  /** Structured actions executed by the agent(s) */
  actions_executed?: any[];
}

/** Top-level envelope returned by the backend on success */
export interface SuccessResponse {
  success: boolean;
  message: string;
  data: ChatResponse;
}

/** Internal UI representation of a single chat bubble */
export interface ChatMessage {
  id: number | string;
  /** 'user' = human, 'assistant' = AI */
  sender: 'user' | 'assistant';
  text: string;
  time: string;
}

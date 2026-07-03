/**
 * Chat.tsx — Self-contained AI chat component for LifeOS AI.
 *
 * Integrates with: frontend/src/services/chatService.ts → POST /api/v1/chat
 *
 * Props:
 *   initialMessages  – seed messages shown before the user sends anything
 *   sessionId        – optional session ID to continue an existing conversation
 *   className        – optional extra class for the root container
 *
 * The component preserves ALL existing styling tokens (violet/slate palette,
 * rounded-2xl bubbles, scrollbar-thin, etc.) and does NOT redesign the UI.
 */

import { useEffect, useRef, useState } from 'react';
import { Send, Mic } from 'lucide-react';
import { sendChatMessage } from '../../services/chatService';
import type { ChatMessage } from '../../types/chat';

// ─── helpers ────────────────────────────────────────────────────────────────

function nowTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── types ───────────────────────────────────────────────────────────────────

interface ChatProps {
  initialMessages?: ChatMessage[];
  sessionId?: string | null;
  className?: string;
}

// ─── default seed messages ────────────────────────────────────────────────────

const DEFAULT_MESSAGES: ChatMessage[] = [
  { id: 1, sender: 'assistant', text: 'Hello 👋  I am your LifeOS AI assistant.', time: nowTime() },
  { id: 2, sender: 'assistant', text: 'How can I help you today?', time: nowTime() },
];

// ─── component ───────────────────────────────────────────────────────────────

export default function Chat({
  initialMessages = DEFAULT_MESSAGES,
  sessionId: initialSessionId = null,
  className = '',
}: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track session across turns so the backend can maintain context
  const sessionIdRef = useRef<string | null>(initialSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed || isLoading) return;

    // Clear any previous error
    setError(null);

    // Optimistically append the user bubble
    const userMsg: ChatMessage = {
      id: Date.now(),
      sender: 'user',
      text: trimmed,
      time: nowTime(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsLoading(true);

    try {
      const chatResponse = await sendChatMessage(trimmed, sessionIdRef.current);
      // Persist session ID for subsequent messages
      sessionIdRef.current = chatResponse.session_id;

      const aiMsg: ChatMessage = {
        id: chatResponse.response_id,
        sender: 'assistant',
        text: chatResponse.message,
        time: nowTime(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* ── Conversation Area ── */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 scrollbar-thin">
        {messages.map((msg) => {
          const isAssistant = msg.sender === 'assistant';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
            >
              <div
                className={`px-4 py-2.5 rounded-2xl text-sm ${
                  isAssistant
                    ? 'bg-white/5 border border-white/5 text-slate-200 rounded-tl-sm'
                    : 'bg-violet-600/25 border border-violet-500/35 text-violet-100 rounded-tr-sm'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.time}</span>
            </div>
          );
        })}

        {/* ── Typing Indicator ── */}
        {isLoading && (
          <div className="flex flex-col items-start">
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/5 border border-white/5">
              <span className="flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="block w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}

        {/* ── Error Banner ── */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input Composer ── */}
      <form onSubmit={handleSend} className="relative flex items-center">
        <button
          type="button"
          aria-label="Start voice typing"
          className="absolute left-4 text-slate-400 hover:text-violet-400 transition cursor-pointer"
        >
          <Mic size={16} />
        </button>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={isLoading ? 'Waiting for response…' : 'Ask me anything…'}
          disabled={isLoading}
          aria-label="Message text"
          className="w-full h-11 pl-11 pr-11 rounded-full bg-slate-900/90 border border-white/5 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500/80 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !inputVal.trim()}
          aria-label="Send message"
          className="absolute right-4 text-violet-400 hover:text-violet-300 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

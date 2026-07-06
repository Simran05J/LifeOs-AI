import type { RefObject } from 'react';
import { Sparkles, Compass, Receipt, Bell, ArrowRight } from 'lucide-react';
import type { ChatMessage } from '../../types/chat';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onPromptClick?: (promptText: string) => void;
}

const SUGGESTED_PROMPTS = [
  {
    text: 'Plan a Goa trip under ₹20,000',
    icon: Compass,
    color: 'text-cyan-400',
  },
  {
    text: 'Log ₹450 dinner expense',
    icon: Receipt,
    color: 'text-emerald-400',
  },
  {
    text: 'Add task: Review final presentation',
    icon: Bell,
    color: 'text-violet-400',
  },
  {
    text: 'What are my wellness goals today?',
    icon: Sparkles,
    color: 'text-rose-400',
  },
];

export default function MessageList({
  messages,
  isLoading,
  error,
  messagesEndRef,
  onPromptClick,
}: MessageListProps) {
  const isEmpty = messages.length === 0;

  return (
    <div className="flex-1 overflow-y-auto pr-1 pb-6 scrollbar-thin scroll-smooth min-h-0 flex flex-col justify-between">
      <div className="max-w-2xl lg:max-w-3xl mx-auto w-full space-y-6 pt-4 flex-1">
        {isEmpty ? (
          /* ── Centered Welcome Experience (ChatGPT/Claude Style) ── */
          <div className="flex flex-col items-center justify-center min-h-[70%] py-12 text-center select-none animate-fade-in">
            {/* Center Logo/Icon */}
            <div className="mb-6 grid h-16 w-16 place-items-center rounded-[22px] bg-gradient-to-br from-violet-600 via-fuchsia-600 to-cyan-500 text-white shadow-xl shadow-violet-500/10 border border-violet-500/20">
              <Sparkles size={28} className="animate-pulse" />
            </div>

            <h2 className="text-2xl font-bold text-white tracking-tight">
              How can I help you today?
            </h2>
            <p className="mt-2.5 text-xs text-slate-400 max-w-md leading-relaxed">
              Your Multi-Agent AI Operating System is active. Ask me to schedule tasks, manage upcoming trips, or track daily metrics.
            </p>

            {/* Suggested Prompts Grid */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full px-4 sm:px-0">
              {SUGGESTED_PROMPTS.map((promptItem) => {
                const IconComp = promptItem.icon;
                return (
                  <button
                    key={promptItem.text}
                    type="button"
                    onClick={() => onPromptClick?.(promptItem.text)}
                    className="flex items-center justify-between p-4 rounded-[20px] border border-white/5 bg-white/3 hover:bg-white/5 hover:border-violet-500/20 text-left transition-all duration-200 group outline-none focus-visible:ring-1 focus-visible:ring-violet-500/30"
                  >
                    <span className="flex items-center gap-3 pr-2">
                      <span className={`shrink-0 ${promptItem.color}`}>
                        <IconComp size={15} />
                      </span>
                      <span className="text-xs font-semibold text-slate-300 group-hover:text-white leading-tight transition-colors duration-150">
                        {promptItem.text}
                      </span>
                    </span>
                    <ArrowRight size={13} className="text-slate-500 group-hover:text-violet-400 transition-all duration-200 transform translate-x-0 group-hover:translate-x-0.5" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── Message Bubbles Stream ── */
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}

        <TypingIndicator isLoading={isLoading} />

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 max-w-lg mx-auto"
          >
            <span className="shrink-0">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
export type { MessageListProps };

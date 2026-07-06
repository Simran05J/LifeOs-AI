import { Sparkles, User } from 'lucide-react';
import type { ChatMessage } from '../../types/chat';

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.sender === 'assistant';

  return (
    <div
      className={`flex gap-4 items-start ${
        isAssistant ? '' : 'flex-row-reverse'
      } animate-fade-in`}
    >
      {/* Avatar Icon */}
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white shadow-sm border ${
          isAssistant
            ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 border-violet-500/20'
            : 'bg-slate-800 border-white/10'
        }`}
        aria-hidden="true"
      >
        {isAssistant ? <Sparkles size={14} /> : <User size={14} />}
      </div>

      {/* Message Bubble Container */}
      <div className={`flex flex-col max-w-[80%] ${isAssistant ? 'items-start' : 'items-end'}`}>
        <div
          className={`px-4 py-3 rounded-[20px] text-sm leading-relaxed ${
            isAssistant
              ? 'bg-white/5 border border-white/5 text-slate-100 rounded-tl-sm'
              : 'bg-violet-600/25 border border-violet-500/35 text-white rounded-tr-sm'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.text}</p>
        </div>
        <span className="text-[9px] text-slate-500 mt-1 px-1 tracking-wider uppercase font-semibold">
          {message.time}
        </span>
      </div>
    </div>
  );
}

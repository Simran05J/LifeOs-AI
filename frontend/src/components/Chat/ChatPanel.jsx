import { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

export default function ChatPanel({ messages = [], loadingHistory = false }) {
  const historyEndRef = useRef(null);

  // Auto-scroll history to bottom
  useEffect(() => {
    if (historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      {loadingHistory ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-500" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-slate-500 bg-slate-900/50 px-6 py-3 rounded-2xl border border-white/5">
            Start by typing a command or using your voice below.
          </p>
        </div>
      ) : (
        messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-violet-600/30 border border-violet-500/20 text-white rounded-br-sm'
                  : 'bg-slate-800/80 border border-white/10 text-slate-200 rounded-bl-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
              <span className="block text-[10px] text-slate-400 mt-1.5 text-right font-medium">
                {msg.time}
              </span>
            </div>
          </div>
        ))
      )}
      <div ref={historyEndRef} />
    </div>
  );
}

ChatPanel.propTypes = {
  messages: PropTypes.array,
  loadingHistory: PropTypes.bool,
};

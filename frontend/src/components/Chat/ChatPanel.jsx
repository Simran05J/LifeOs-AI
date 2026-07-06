import { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  Sparkles, 
  Calendar, 
  DollarSign, 
  Clock, 
  Activity, 
  Compass,
  ArrowRight
} from 'lucide-react';

export default function ChatPanel({ 
  messages = [], 
  loadingHistory = false, 
  onSuggestionClick 
}) {
  const historyEndRef = useRef(null);

  // Auto-scroll history to bottom
  useEffect(() => {
    if (historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Suggestions with concrete command texts that the backend agents can parse
  const suggestions = [
    {
      id: 'plan_day',
      title: 'Plan my day',
      description: 'Create a schedule, block out your timetable, or organize routines.',
      icon: Calendar,
      colorClass: 'text-violet-400 bg-violet-500/10 border-violet-500/20 hover:border-violet-500/40 hover:shadow-[0_0_20px_rgba(124,58,237,0.15)]',
      command: 'Plan my day: Gym at 7 AM, Project Meeting at 10 AM, and Study Session at 3 PM',
    },
    {
      id: 'log_expense',
      title: 'Log expense',
      description: 'Log transaction amounts and track monthly spendings.',
      icon: DollarSign,
      colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]',
      command: 'Log expense: ₹150 for Lunch',
    },
    {
      id: 'set_reminder',
      title: 'Set a reminder',
      description: 'Schedule a time-sensitive alert with voice snooze & stop support.',
      icon: Clock,
      colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      command: 'Set a reminder: Hydration break in 1 hour',
    },
    {
      id: 'wellness_reminder',
      title: 'Set wellness routine',
      description: 'Add a new wellness activity, log hydration, or meditation goal.',
      icon: Activity,
      colorClass: 'text-rose-400 bg-rose-500/10 border-rose-500/20 hover:border-rose-500/40 hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]',
      command: 'Set a wellness reminder to log 2 litres of water hydration goal',
    },
    {
      id: 'plan_trip',
      title: 'Plan a trip',
      description: 'Plan a travel itinerary, set budgets, and generate packing lists.',
      icon: Compass,
      colorClass: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]',
      command: 'Plan a trip to Goa in December',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
      {loadingHistory ? (
        <div className="flex items-center justify-center py-8 h-full">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-500" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-full py-8 max-w-3xl mx-auto px-2 select-none">
          {/* Header Branding */}
          <div className="text-center space-y-3 mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-violet-600/20 to-fuchsia-600/20 border border-violet-500/20 shadow-[0_0_30px_rgba(124,58,237,0.15)] mb-1">
              <Sparkles size={28} className="text-violet-400 animate-pulse" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight animate-fade-in">
              What are you on today?
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              How can I help you today? Choose one of the quick actions below to see it in action, or type a custom command.
            </p>
          </div>

          {/* Grid of Suggestions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
            {suggestions.map((s, idx) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSuggestionClick?.(s.command)}
                  className={`flex items-start text-left p-4 rounded-2xl bg-slate-900/50 backdrop-blur-md border border-white/5 hover:bg-white/[0.03] transition-all duration-300 group hover:-translate-y-0.5 ${s.colorClass}`}
                >
                  <div className="p-2.5 rounded-xl border shrink-0 mr-3.5 transition-colors duration-300">
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <h3 className="text-sm font-bold text-white group-hover:text-slate-100 flex items-center gap-1.5 transition-colors">
                      {s.title}
                      <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-300" />
                    </h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-1 group-hover:text-slate-300 transition-colors">
                      {s.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
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
  onSuggestionClick: PropTypes.func,
};

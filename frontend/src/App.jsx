import { useState, useEffect, useRef } from 'react';
import AppLayout from './layouts/AppLayout';
import {
  Mic,
  RotateCw,
  MoreHorizontal,
  Send,
  PlusCircle,
  Bell,
  DollarSign,
  Compass,
  Heart,
  Sparkles,
} from 'lucide-react';

function App() {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'assistant', text: 'Hello Sheetal 👋', time: '10:30 AM' },
    { id: 2, sender: 'assistant', text: 'How can I help you today?', time: '10:30 AM' },
    { id: 3, sender: 'user', text: 'Help me plan my day and keep track of reminders.', time: '10:31 AM' },
    { id: 4, sender: 'assistant', text: "I'd be happy to help you plan your day and manage your reminders!", time: '10:31 AM' },
  ]);
  const [inputVal, setInputVal] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e?.preventDefault();
    const trimmed = inputVal.trim();
    if (!trimmed) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: trimmed,
      time,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');

    // Mock AI reply after 800ms
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text: `I'm processing "${trimmed}"... Let me know how else I can assist.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 800);
  };

  const handlePromptClick = (prompt) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: prompt,
      time,
    };

    setMessages((prev) => [...prev, userMsg]);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text: `Analyzing info for "${prompt}"... Ready to configure details.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 800);
  };

  const handleRefresh = () => {
    setMessages([
      { id: 1, sender: 'assistant', text: 'Hello Sheetal 👋', time: '10:30 AM' },
      { id: 2, sender: 'assistant', text: 'How can I help you today?', time: '10:30 AM' },
    ]);
  };

  const quickActions = [
    { title: 'Add Task', icon: PlusCircle },
    { title: 'Add Reminder', icon: Bell },
    { title: 'Log Expense', icon: DollarSign },
    { title: 'Plan Trip', icon: Compass },
    { title: 'Health Tracker', icon: Heart },
    { title: 'Ask AI', icon: Sparkles, action: () => handlePromptClick('Help me optimize my schedule') },
  ];

  return (
    <AppLayout>
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] items-start">
        {/* Left Column */}
        <div className="flex flex-col gap-6 w-full">
          {/* 1. Hero Section */}
          <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950/80 p-5 shadow-glow select-none">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-400">DAILY FLOW</p>
            <h2 className="mt-2.5 text-2xl font-semibold text-white tracking-tight sm:text-3xl">Your AI Operating System</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
              Plan your day, organize your work, manage reminders, track finances, and travel smarter with one intelligent assistant.
            </p>
          </div>

          {/* 2. AI Assistant Panel */}
          <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 flex flex-col h-[520px] shadow-glow backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 select-none">
              <div>
                <h3 className="text-base font-semibold text-white">AI Assistant</h3>
                <p className="text-xs text-slate-400">Your personal productivity companion</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Voice input"
                  className="rounded-full p-2 hover:bg-white/10 text-slate-400 hover:text-white transition duration-200 hover:-translate-y-0.5 outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                >
                  <Mic size={15} />
                </button>
                <button
                  type="button"
                  onClick={handleRefresh}
                  aria-label="Refresh conversation"
                  className="rounded-full p-2 hover:bg-white/10 text-slate-400 hover:text-white transition duration-200 hover:-translate-y-0.5 outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                >
                  <RotateCw size={15} />
                </button>
                <button
                  type="button"
                  aria-label="More options"
                  className="rounded-full p-2 hover:bg-white/10 text-slate-400 hover:text-white transition duration-200 hover:-translate-y-0.5 outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                >
                  <MoreHorizontal size={15} />
                </button>
              </div>
            </div>

            {/* Conversation Area */}
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
                    <span className="text-[10px] text-slate-500 mt-1 px-1">
                      {msg.time}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompts */}
            <div className="flex flex-wrap gap-2 mb-4 select-none">
              {['Plan my day', 'Show reminders', "Today's schedule", 'Focus mode'].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handlePromptClick(prompt)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-200 transition-all duration-200 hover:-translate-y-0.5 outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Composer */}
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
                placeholder="Ask me anything..."
                aria-label="Message text"
                className="w-full h-11 pl-11 pr-11 rounded-full bg-slate-900/90 border border-white/5 text-sm text-white placeholder-slate-500 outline-none focus:border-violet-500/80 focus:ring-2 focus:ring-violet-500/20 transition-all duration-200"
              />
              <button
                type="submit"
                aria-label="Send message"
                className="absolute right-4 text-violet-400 hover:text-violet-300 transition cursor-pointer"
              >
                <Send size={16} />
              </button>
            </form>
          </div>

          {/* 3. Workspace Overview */}
          <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Workspace overview</h3>
                <p className="mt-1 text-sm text-slate-400">Structured at a glance</p>
              </div>
              <div className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-200 select-none">Updated</div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                ['Planning', 'Daily priorities synced'],
                ['Assistant', 'Voice + chat ready'],
                ['Reminders', 'Gentle nudges'],
                ['Insights', 'Weekly summary'],
              ].map(([title, copy]) => (
                <div key={title} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6 w-full">
          {/* 4. Momentum Card */}
          <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow">
            <div className="flex items-center justify-between select-none">
              <p className="text-sm font-semibold text-white">Momentum</p>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">Live</span>
            </div>
            <div className="mt-6 grid gap-4">
              {[{ label: 'Focus sessions', value: '12' }, { label: 'Insights ready', value: '4' }, { label: 'Tasks cleared', value: '24' }].map((item) => (
                <div key={item.label} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-slate-400">{item.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Upcoming Card */}
          <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow">
            <p className="text-sm font-semibold text-white select-none">Upcoming</p>
            <div className="mt-5 space-y-3">
              {['Review roadmap', 'Prep launch brief', 'Catch up with team'].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-[20px] border border-white/10 bg-white/5 px-4 py-3">
                  <span className="text-sm text-slate-300">{item}</span>
                  <span className="text-xs text-violet-300 bg-violet-500/10 border border-violet-500/25 px-2 py-0.5 rounded-full select-none">Ready</span>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Quick Actions */}
          <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6 shadow-glow">
            <p className="text-sm font-semibold text-white mb-5 select-none">Quick Actions</p>
            <div className="grid grid-cols-2 gap-4">
              {quickActions.map((act) => {
                const Icon = act.icon;
                return (
                  <button
                    key={act.title}
                    type="button"
                    onClick={act.action || (() => handlePromptClick(`Execute: ${act.title}`))}
                    aria-label={act.title}
                    className="flex flex-col items-start p-4 rounded-[20px] border border-white/10 bg-slate-900/40 hover:bg-white/5 hover:border-violet-500/30 transition-all duration-200 hover:-translate-y-1 group focus-visible:ring-2 focus-visible:ring-violet-500/50 outline-none text-left"
                  >
                    <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20 transition-all duration-200">
                      <Icon size={18} />
                    </div>
                    <span className="mt-3 text-xs font-semibold text-white tracking-wide">{act.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default App;

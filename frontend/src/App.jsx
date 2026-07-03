/**
 * LifeOS AI — App Root with React Router
 *
 * Routes:
 *   /login  → Login page (Google Sign-In)
 *   /       → Dashboard (protected — redirects to /login if no token)
 *
 * A lightweight ProtectedRoute wrapper checks localStorage for the Firebase
 * ID token. Real token validation happens on the backend; this guard just
 * prevents an unauthenticated user from accidentally landing on the dashboard.
 */

import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Chat from './components/Chat/Chat';
import Login from './pages/Login/Login';
import { getStoredToken } from './services/authService';
import {
  RotateCw,
  MoreHorizontal,
  Mic,
  PlusCircle,
  Bell,
  DollarSign,
  Compass,
  Heart,
  Sparkles,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// ProtectedRoute
// ---------------------------------------------------------------------------

function ProtectedRoute({ children }) {
  const hasToken = Boolean(getStoredToken());
  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// ---------------------------------------------------------------------------
// Dashboard — extracted from the original App body (unchanged)
// ---------------------------------------------------------------------------

function Dashboard() {
  const [chatKey, setChatKey] = useState(0);
  const handleRefresh = () => setChatKey((k) => k + 1);

  const quickActions = [
    { title: 'Add Task', icon: PlusCircle },
    { title: 'Add Reminder', icon: Bell },
    { title: 'Log Expense', icon: DollarSign },
    { title: 'Plan Trip', icon: Compass },
    { title: 'Health Tracker', icon: Heart },
    { title: 'Ask AI', icon: Sparkles },
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

          {/* 2. AI Assistant Panel — powered by Chat component → POST /api/v1/chat */}
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

            {/* Live Chat — replaces the mock setTimeout handler */}
            <Chat key={chatKey} />
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

// ---------------------------------------------------------------------------
// App root — routing only
// ---------------------------------------------------------------------------

function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/login" element={<Login />} />

      {/* Protected dashboard */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Catch-all → login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;

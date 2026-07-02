import { useEffect, useState } from 'react';
import { Search, Calendar, Bell, Moon } from 'lucide-react';
import './navbar.css';

function TopNavbar() {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    // Format date: e.g., "Monday, 1 July"
    const formatDate = () => {
      const date = new Date();
      const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
      const day = date.getDate();
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      return `${weekday}, ${day} ${month}`;
    };
    setCurrentDate(formatDate());
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-[72px] w-full items-center justify-between border-b border-white/10 bg-slate-950/80 px-4 sm:px-6 lg:px-8 backdrop-blur-xl animate-fade-in select-none">
      {/* Left Section - Greeting */}
      <div className="hidden md:flex flex-col justify-center min-w-[200px]">
        <h1 className="text-xl font-semibold text-white tracking-tight flex items-center gap-1.5">
          <span>👋</span> Good Morning, LifeOS AI
        </h1>
        <p className="text-sm text-gray-400 font-normal">
        </p>
      </div>

      {/* Center Section - Large Search Bar */}
      <div className="flex-1 md:flex-initial flex justify-center max-w-full md:max-w-[420px] md:w-[420px] px-2">
        <div className="relative w-full group">
          <span className="absolute inset-y-0 left-4 flex items-center text-gray-400 group-focus-within:text-violet-400 transition-colors duration-200">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Search tasks, reminders, trips..."
            aria-label="Search items"
            className="w-full h-11 pl-11 pr-4 rounded-full bg-slate-900/90 text-sm text-white placeholder-gray-500 border border-white/5 outline-none transition-all duration-200 focus:border-violet-500/80 focus:ring-2 focus:ring-violet-500/20"
          />
        </div>
      </div>

      {/* Right Section - Date, Notifications, Theme, Profile */}
      <div className="flex items-center gap-3">
        {/* Current Date Card */}
        <div className="hidden sm:flex items-center gap-2 rounded-full bg-slate-900/80 border border-white/5 px-4 py-2 text-sm text-gray-300 font-medium">
          <Calendar size={15} className="text-violet-400" />
          <span>{currentDate || 'Loading date...'}</span>
        </div>

        {/* Notification Button */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex items-center justify-center rounded-full p-2.5 bg-slate-900/80 border border-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-violet-500/40 outline-none"
        >
          <Bell size={16} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_8px_#8b5cf6]" />
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          aria-label="Toggle theme"
          className="flex items-center justify-center rounded-full p-2.5 bg-slate-900/80 border border-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-violet-500/40 outline-none"
        >
          <Moon size={16} />
        </button>

        {/* Profile Card */}
        <div className="flex items-center gap-3 pl-1 sm:pl-2">
          {/* Circular avatar with initials */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 via-fuchsia-500 to-cyan-400 text-sm font-semibold text-white shadow-md select-none transition-transform duration-200 hover:scale-105 cursor-pointer">
            SH
          </div>

          {/* Name & Title */}
          <div className="hidden md:flex flex-col text-left select-none">
            <span className="text-sm font-medium text-white leading-tight">Sheetal</span>
            <span className="text-[10px] text-gray-400 font-normal leading-tight">Frontend Developer</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default TopNavbar;

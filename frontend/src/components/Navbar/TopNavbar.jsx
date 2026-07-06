/**
 * TopNavbar — Sticky header for the center dashboard panel.
 *
 * Renders in a single horizontal row:
 *   - Waving greeting (DashboardGreeting)
 *   - Search input (SearchBar)
 *   - Sleek date pill (with calendar icon, whitespace-nowrap)
 *   - Notification badge trigger
 *   - Theme moon trigger
 */
import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Calendar, Bell, Menu } from 'lucide-react';
import DashboardGreeting from '../dashboard/DashboardGreeting';
import SearchBar from '../dashboard/SearchBar';
import './navbar.css';

function TopNavbar({ onMenuToggle, displayName = null, onSearch, greetingMessage = null, unreadCount = 0, onBellClick }) {
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
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
    <header className="z-20 flex h-[88px] pt-6 pb-2 shrink-0 w-full items-center justify-between bg-transparent px-6 sm:px-8 lg:px-10 animate-fade-in select-none">

      {/* Mobile hamburger — only visible below lg breakpoint */}
      <button
        type="button"
        aria-label="Open navigation menu"
        onClick={onMenuToggle}
        className="mr-3 flex items-center justify-center rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-all duration-200 lg:hidden outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
      >
        <Menu size={18} />
      </button>

      {/* Left Section — Greeting */}
      <DashboardGreeting displayName={displayName} greetingMessage={greetingMessage} />

      {/* Center Section — Search Bar */}
      <SearchBar onSearch={onSearch} />

      {/* Right Section — Date, Notifications, Theme */}
      <div className="flex items-center gap-3">
        {/* Current Date — whitespace-nowrap prevents line breaks */}
        <div className="hidden sm:flex items-center gap-2 rounded-full bg-slate-900/80 border border-white/5 px-4 py-2 text-sm text-slate-300 font-medium whitespace-nowrap">
          <Calendar size={15} className="text-violet-400" />
          <span>{currentDate || 'Loading…'}</span>
        </div>

        {/* Notifications */}
        <button
          type="button"
          id="notifications-bell-btn"
          aria-label="Open notifications"
          onClick={onBellClick}
          className="relative flex items-center justify-center rounded-full p-2.5 bg-slate-900/80 border border-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
        >
          <Bell size={16} />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-violet-600 shadow-[0_0_10px_#7c3aed] text-[9px] font-bold text-white px-1 leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-violet-500/50" />
          )}
        </button>

      </div>
    </header>
  );
}

TopNavbar.propTypes = {
  onMenuToggle: PropTypes.func,
  displayName: PropTypes.string,
  onSearch: PropTypes.func,
  greetingMessage: PropTypes.string,
  unreadCount: PropTypes.number,
  onBellClick: PropTypes.func,
};

export default TopNavbar;

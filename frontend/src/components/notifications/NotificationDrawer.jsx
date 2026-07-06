/**
 * NotificationDrawer.jsx — Right-side slide-in notification center for LifeOS AI.
 *
 * Features:
 *  - Grouped by Today / Yesterday / Older
 *  - Category filter pills: All, Planner, Reminder, Finance, Travel, Wellness, System
 *  - Search bar
 *  - Priority colours: high → red, medium → amber, low → violet
 *  - Mark individual notification read
 *  - Mark all read
 *  - Delete notification
 *  - Unread badge count in header
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  X,
  Bell,
  CheckSquare,
  DollarSign,
  Plane,
  Heart,
  Settings,
  Search,
  CheckCheck,
  Trash2,
  Check,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getLocalDateString(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d);
}

function formatRelativeTime(isoString) {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;

    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

// ─── Category Config ─────────────────────────────────────────────────────────

const CATEGORY_META = {
  planner:  { label: 'Planner',  Icon: CheckSquare, color: 'text-blue-400',   bg: 'bg-blue-500/15',  ring: 'ring-blue-500/30'  },
  reminder: { label: 'Reminder', Icon: Bell,         color: 'text-violet-400', bg: 'bg-violet-500/15',ring: 'ring-violet-500/30' },
  finance:  { label: 'Finance',  Icon: DollarSign,   color: 'text-emerald-400',bg: 'bg-emerald-500/15',ring: 'ring-emerald-500/30'},
  travel:   { label: 'Travel',   Icon: Plane,        color: 'text-sky-400',    bg: 'bg-sky-500/15',   ring: 'ring-sky-500/30'   },
  wellness: { label: 'Wellness', Icon: Heart,        color: 'text-pink-400',   bg: 'bg-pink-500/15',  ring: 'ring-pink-500/30'  },
  system:   { label: 'System',   Icon: Settings,     color: 'text-slate-400',  bg: 'bg-slate-500/15', ring: 'ring-slate-500/30'  },
};

const PRIORITY_META = {
  high:   { bar: 'bg-red-500',    text: 'text-red-400',   label: 'High'   },
  medium: { bar: 'bg-amber-500',  text: 'text-amber-400', label: 'Medium' },
  low:    { bar: 'bg-violet-500', text: 'text-violet-400',label: 'Low'    },
};

const FILTER_OPTIONS = [
  { value: 'all',      label: 'All'      },
  { value: 'planner',  label: 'Planner'  },
  { value: 'reminder', label: 'Reminder' },
  { value: 'finance',  label: 'Finance'  },
  { value: 'travel',   label: 'Travel'   },
  { value: 'wellness', label: 'Wellness' },
  { value: 'system',   label: 'System'   },
];

// ─── Single Notification Card ────────────────────────────────────────────────

function NotificationCard({ notification, onMarkRead, onDelete }) {
  const meta   = CATEGORY_META[notification.category] || CATEGORY_META.system;
  const pMeta  = PRIORITY_META[notification.priority] || PRIORITY_META.low;
  const { Icon } = meta;

  return (
    <div
      className={`group relative flex gap-3 rounded-2xl border p-3.5 transition-all duration-200 cursor-default
        ${notification.read
          ? 'border-white/5 bg-white/[0.02]'
          : 'border-white/10 bg-white/[0.05] shadow-[0_4px_20px_rgba(0,0,0,0.3)]'}`}
    >
      {/* Priority bar */}
      <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${pMeta.bar} ${notification.read ? 'opacity-30' : 'opacity-100'}`} />

      {/* Category icon */}
      <div className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl ring-1 ${meta.bg} ${meta.ring}`}>
        <Icon size={16} className={meta.color} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs font-semibold leading-snug ${notification.read ? 'text-slate-400' : 'text-white'}`}>
            {notification.title}
          </p>
          <span className="flex-shrink-0 text-[10px] text-slate-500 whitespace-nowrap mt-0.5">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>

        <p className={`mt-0.5 text-[11px] leading-relaxed ${notification.read ? 'text-slate-500' : 'text-slate-300'}`}>
          {notification.message}
        </p>

        <div className="mt-2 flex items-center gap-2">
          <span className={`text-[9px] font-semibold uppercase tracking-widest ${pMeta.text}`}>
            {pMeta.label}
          </span>
          <span className="text-slate-700">·</span>
          <span className={`text-[9px] font-medium uppercase tracking-widest ${meta.color}`}>
            {meta.label}
          </span>
        </div>
      </div>

      {/* Action buttons — visible on hover */}
      <div className="flex-shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        {!notification.read && (
          <button
            type="button"
            aria-label="Mark as read"
            onClick={() => onMarkRead(notification.id)}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-500 hover:text-emerald-400 transition-colors duration-150"
          >
            <Check size={12} />
          </button>
        )}
        <button
          type="button"
          aria-label="Delete notification"
          onClick={() => onDelete(notification.id)}
          className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors duration-150"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

NotificationCard.propTypes = {
  notification: PropTypes.object.isRequired,
  onMarkRead: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

// ─── Group Divider ────────────────────────────────────────────────────────────

function GroupHeader({ label, count }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      {count > 0 && (
        <span className="text-[9px] font-semibold text-slate-600 bg-white/5 rounded-full px-2 py-0.5">
          {count}
        </span>
      )}
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}

GroupHeader.propTypes = {
  label: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
};

// ─── Main Drawer ──────────────────────────────────────────────────────────────

function NotificationDrawer({ isOpen, onClose, notifications = [], onMarkRead, onMarkAllRead, onDelete }) {
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery]       = useState('');
  const drawerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e) {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Filter + search
  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      const catMatch = filterCategory === 'all' || n.category === filterCategory;
      const searchMatch = !searchQuery.trim() ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase());
      return catMatch && searchMatch;
    });
  }, [notifications, filterCategory, searchQuery]);

  // Group by date
  const todayStr     = getLocalDateString();
  const yesterdayStr = getYesterdayString();

  const groups = useMemo(() => {
    const today     = filtered.filter((n) => n.createdAt && n.createdAt.startsWith(todayStr));
    const yesterday = filtered.filter((n) => n.createdAt && n.createdAt.startsWith(yesterdayStr));
    const older     = filtered.filter((n) => {
      if (!n.createdAt) return true;
      return !n.createdAt.startsWith(todayStr) && !n.createdAt.startsWith(yesterdayStr);
    });
    return { today, yesterday, older };
  }, [filtered, todayStr, yesterdayStr]);

  const isEmpty = filtered.length === 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        ref={drawerRef}
        aria-label="Notification center"
        className={`fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-[400px] bg-[#090e1a] border-l border-white/8
          shadow-[−24px_0_80px_rgba(0,0,0,0.7)] transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-violet-500/20 ring-1 ring-violet-500/30">
              <Bell size={15} className="text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-none">Notifications</h2>
              {unreadCount > 0 && (
                <p className="text-[10px] text-violet-400 mt-0.5 font-medium">{unreadCount} unread</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-emerald-500/15 border border-white/8 hover:border-emerald-500/30 text-slate-400 hover:text-emerald-400 px-3 py-1.5 text-[11px] font-medium transition-all duration-200"
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
            <button
              type="button"
              aria-label="Close notifications"
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all duration-200"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Search ── */}
        <div className="flex-shrink-0 px-5 pt-4">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search notifications…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/8 text-slate-200 placeholder-slate-600 text-xs pl-9 pr-4 py-2.5 outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all duration-200"
            />
          </div>
        </div>

        {/* ── Filter Pills ── */}
        <div className="flex-shrink-0 flex gap-2 px-5 pt-3 pb-1 overflow-x-auto scrollbar-none">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilterCategory(value)}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all duration-200 border ${
                filterCategory === value
                  ? 'bg-violet-500/25 border-violet-500/50 text-violet-300'
                  : 'bg-white/5 border-white/8 text-slate-500 hover:text-slate-300 hover:border-white/15'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Notification List ── */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16 text-center select-none">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/5 ring-1 ring-white/10">
                <Bell size={22} className="text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-500">No notifications</p>
                <p className="text-xs text-slate-600 mt-1">You&apos;re all caught up!</p>
              </div>
            </div>
          ) : (
            <>
              {/* Today */}
              {groups.today.length > 0 && (
                <div className="space-y-2">
                  <GroupHeader label="Today" count={groups.today.length} />
                  {groups.today.map((n) => (
                    <NotificationCard key={n.id} notification={n} onMarkRead={onMarkRead} onDelete={onDelete} />
                  ))}
                </div>
              )}

              {/* Yesterday */}
              {groups.yesterday.length > 0 && (
                <div className="space-y-2 mt-4">
                  <GroupHeader label="Yesterday" count={groups.yesterday.length} />
                  {groups.yesterday.map((n) => (
                    <NotificationCard key={n.id} notification={n} onMarkRead={onMarkRead} onDelete={onDelete} />
                  ))}
                </div>
              )}

              {/* Older */}
              {groups.older.length > 0 && (
                <div className="space-y-2 mt-4">
                  <GroupHeader label="Older" count={groups.older.length} />
                  {groups.older.map((n) => (
                    <NotificationCard key={n.id} notification={n} onMarkRead={onMarkRead} onDelete={onDelete} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 px-5 py-3 border-t border-white/8 text-center">
          <p className="text-[10px] text-slate-600">
            {notifications.length} total · {unreadCount} unread
          </p>
        </div>
      </aside>
    </>
  );
}

NotificationDrawer.propTypes = {
  isOpen:          PropTypes.bool.isRequired,
  onClose:         PropTypes.func.isRequired,
  notifications:   PropTypes.array,
  onMarkRead:      PropTypes.func.isRequired,
  onMarkAllRead:   PropTypes.func.isRequired,
  onDelete:        PropTypes.func.isRequired,
};

export default NotificationDrawer;

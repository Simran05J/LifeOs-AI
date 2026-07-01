import PropTypes from 'prop-types';
import {
  BellRing,
  BrainCircuit,
  CalendarRange,
  CreditCard,
  HeartPulse,
  Home,
  Plane,
  Settings,
  Sparkles,
  Wallet,
  ChevronRight,
  UserRound,
} from 'lucide-react';

const defaultNavItems = [
  { label: 'Overview', icon: Home },
  { label: 'Planner', icon: CalendarRange },
  { label: 'Assistant', icon: BrainCircuit },
  { label: 'Reminder', icon: BellRing },
  { label: 'Finance', icon: Wallet },
  { label: 'Travel', icon: Plane },
  { label: 'Wellness', icon: HeartPulse },
  { label: 'Settings', icon: Settings },
];

function Sidebar({ title = 'LifeOS AI', navItems = defaultNavItems, onNavigate, activeItem = 'Overview' }) {
  return (
    <aside
      className="flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/80 p-4 shadow-[0_20px_70px_rgba(15,23,42,0.45)] backdrop-blur-xl"
      aria-label="Primary navigation"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 text-sm font-semibold text-white shadow-lg shadow-violet-500/20">
          L
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <p className="text-sm text-slate-400">Premium control center</p>
        </div>
      </div>

      <nav className="mt-5 flex flex-col gap-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.label === activeItem;

          return (
            <button
              key={item.label}
              type="button"
              className={`group relative flex items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-violet-500/15 text-white shadow-[inset_0_0_0_1px_rgba(167,139,250,0.3)]'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
              onClick={() => onNavigate?.(item.label)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`rounded-xl p-2 transition-transform duration-200 ${
                    isActive ? 'scale-110 bg-violet-500/20 text-violet-200' : 'bg-white/5 text-slate-400 group-hover:text-white'
                  }`}
                  aria-hidden="true"
                >
                  <Icon size={16} />
                </span>
                <span>{item.label}</span>
              </span>

              {isActive ? (
                <span className="h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.8)]" />
              ) : (
                <ChevronRight size={14} className="text-slate-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-6 space-y-3">
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 text-white">
              <UserRound size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Ava Chen</p>
              <p className="text-xs text-slate-400">Product Designer</p>
            </div>
          </div>
        </div>

        <div className="rounded-[24px] border border-violet-500/20 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 p-4">
          <div className="flex items-center gap-2 text-violet-200">
            <Sparkles size={16} />
            <p className="text-sm font-semibold">Upgrade to Pro</p>
          </div>
          <p className="mt-2 text-sm text-slate-300">Unlock AI agents, automations, and premium insights for every plan.</p>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/20"
          >
            <CreditCard size={14} />
            Get Pro
          </button>
        </div>
      </div>
    </aside>
  );
}

Sidebar.propTypes = {
  title: PropTypes.string,
  navItems: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      icon: PropTypes.elementType,
    }),
  ),
  onNavigate: PropTypes.func,
  activeItem: PropTypes.string,
};

export default Sidebar;

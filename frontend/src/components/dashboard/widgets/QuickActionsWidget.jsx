/**
 * QuickActionsWidget — Compact shortcut launcher for widgets.
 *
 * Implements standard, backend-ready triggers:
 *   - Task
 *   - Reminder
 *   - Expense
 *   - Trip
 *   - Wellness
 */
import PropTypes from 'prop-types';
import {
  Sparkles,
  PlusCircle,
  Bell,
  DollarSign,
  Compass,
  Heart,
} from 'lucide-react';

const SHORTCUT_ACTIONS = [
  { title: 'Task', icon: PlusCircle },
  { title: 'Reminder', icon: Bell },
  { title: 'Expense', icon: DollarSign },
  { title: 'Trip', icon: Compass },
  { title: 'Wellness', icon: Heart },
];

function QuickActionsWidget({ actions = SHORTCUT_ACTIONS }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-glow flex flex-col">
      {/* Widget Header */}
      <div className="mb-3 flex items-center gap-2 select-none">
        <span className="grid h-7 w-7 place-items-center rounded-xl bg-violet-500/10 text-violet-400">
          <Sparkles size={14} />
        </span>
        <h3 className="text-sm font-semibold text-white">Quick Actions</h3>
      </div>

      {/* Responsive Grid */}
      <div className="grid grid-cols-5 gap-2 mt-1">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.title}
              type="button"
              onClick={act.onClick}
              className="flex flex-col items-center justify-center p-2 rounded-xl border border-white/5 bg-slate-900/40 hover:bg-white/5 hover:border-violet-500/30 transition-all duration-150 group outline-none focus-visible:ring-1 focus-visible:ring-violet-500/30 text-center"
              title={`Quick Add ${act.title}`}
            >
              <span className="text-violet-400 group-hover:text-violet-300 transition-colors duration-150">
                <Icon size={16} />
              </span>
              <span className="mt-1.5 text-[9px] font-bold text-slate-400 group-hover:text-white transition-colors duration-150 truncate max-w-full">
                {act.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

QuickActionsWidget.propTypes = {
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      icon: PropTypes.elementType.isRequired,
      onClick: PropTypes.func,
    })
  ),
};

export default QuickActionsWidget;

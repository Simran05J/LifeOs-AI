import PropTypes from 'prop-types';
import PlannerWidget from './PlannerWidget';
import ReminderWidget from './ReminderWidget';
import FinanceWidget from './FinanceWidget';
import TravelWidget from './TravelWidget';
import WellnessWidget from './WellnessWidget';
import QuickActionsWidget from './QuickActionsWidget';

function RightWidgetColumn({
  tasks = null,
  reminders = null,
  transactions = null,
  trips = null,
  wellnessItems = null,
  workspaceFocus = 'Workspace Focus',
  isLoading = false,
}) {
  return (
    <div className="flex flex-col gap-4 pb-6 scroll-smooth">
      {/* Sticky Section Header */}
      <div className="sticky top-0 z-10 bg-slate-950/70 backdrop-blur-md pb-3 pt-1 select-none border-b border-white/5 flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] pl-1 truncate max-w-[200px]" title={workspaceFocus}>
          {workspaceFocus}
        </span>
        <div className="flex items-center gap-1.5 pr-1 shrink-0">
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Active</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
        </div>
      </div>

      {/* 1. Today's Planner */}
      <PlannerWidget data={tasks} isLoading={isLoading} />

      {/* 2. Today's Reminders */}
      <ReminderWidget data={reminders} isLoading={isLoading} />

      {/* 3. Finance Summary */}
      <FinanceWidget data={transactions} isLoading={isLoading} />

      {/* 4. Upcoming Travel */}
      <TravelWidget data={trips} isLoading={isLoading} />

      {/* 5. Wellness Snapshot */}
      <WellnessWidget data={wellnessItems} isLoading={isLoading} />

      {/* 6. Quick Actions */}
      <QuickActionsWidget />
    </div>
  );
}

RightWidgetColumn.propTypes = {
  tasks: PropTypes.array,
  reminders: PropTypes.array,
  transactions: PropTypes.array,
  trips: PropTypes.array,
  wellnessItems: PropTypes.array,
  workspaceFocus: PropTypes.string,
  isLoading: PropTypes.bool,
};

export default RightWidgetColumn;

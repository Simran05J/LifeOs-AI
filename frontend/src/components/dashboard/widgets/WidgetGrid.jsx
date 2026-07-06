import PropTypes from 'prop-types';
import PlannerWidget from './PlannerWidget';
import ReminderWidget from './ReminderWidget';
import FinanceWidget from './FinanceWidget';
import TravelWidget from './TravelWidget';
import WellnessWidget from './WellnessWidget';

function WidgetGrid({
  tasks = null,
  reminders = null,
  transactions = null,
  trips = null,
  wellnessItems = null,
  workspaceFocus = 'Workspace Focus',
  isLoading = false,
}) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-1 sm:px-2 flex flex-col h-full">
      {/* Sticky Section Header */}
      <div className="sticky top-0 z-10 bg-slate-950/70 backdrop-blur-md pb-3 pt-1 select-none border-b border-white/5 flex items-center justify-between mb-4">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] pl-1 truncate max-w-[200px]" title={workspaceFocus}>
          {workspaceFocus}
        </span>
        <div className="flex items-center gap-1.5 pr-1 shrink-0">
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Live</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
        </div>
      </div>

      {/* Grid container */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-6">
        <div className="h-full">
          <PlannerWidget data={tasks} isLoading={isLoading} />
        </div>
        <div className="h-full">
          <ReminderWidget data={reminders} isLoading={isLoading} />
        </div>
        <div className="h-full">
          <FinanceWidget data={transactions} isLoading={isLoading} />
        </div>
        <div className="h-full">
          <TravelWidget data={trips} isLoading={isLoading} />
        </div>
        <div className="h-full">
          <WellnessWidget data={wellnessItems} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}

WidgetGrid.propTypes = {
  tasks: PropTypes.array,
  reminders: PropTypes.array,
  transactions: PropTypes.array,
  trips: PropTypes.array,
  wellnessItems: PropTypes.array,
  workspaceFocus: PropTypes.string,
  isLoading: PropTypes.bool,
};

export default WidgetGrid;

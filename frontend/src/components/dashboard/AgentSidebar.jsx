/**
 * AgentSidebar — Vertical stack of AI Agent cards for the right column.
 * Each card is displayed one below the other in a compact scrollable column.
 */
import PropTypes from 'prop-types';
import PlannerWidget from './widgets/PlannerWidget';
import ReminderWidget from './widgets/ReminderWidget';
import FinanceWidget from './widgets/FinanceWidget';
import TravelWidget from './widgets/TravelWidget';
import WellnessWidget from './widgets/WellnessWidget';

function AgentSidebar({
  tasks = null,
  reminders = null,
  transactions = null,
  trips = null,
  wellnessItems = null,
  isLoading = false,
}) {
  return (
    <div className="flex flex-col gap-3 w-full pb-2">
      {/* Live indicator */}
      <div className="flex items-center justify-between px-1 pt-1 select-none">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
          AI Agents
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Live</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
        </div>
      </div>

      {/* Cards — stacked vertically */}
      <PlannerWidget data={tasks} isLoading={isLoading} />
      <ReminderWidget data={reminders} isLoading={isLoading} />
      <FinanceWidget data={transactions} isLoading={isLoading} />
      <TravelWidget data={trips} isLoading={isLoading} />
      <WellnessWidget data={wellnessItems} isLoading={isLoading} />
    </div>
  );
}

AgentSidebar.propTypes = {
  tasks: PropTypes.array,
  reminders: PropTypes.array,
  transactions: PropTypes.array,
  trips: PropTypes.array,
  wellnessItems: PropTypes.array,
  isLoading: PropTypes.bool,
};

export default AgentSidebar;

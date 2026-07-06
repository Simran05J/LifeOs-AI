import PropTypes from 'prop-types';
import { Calendar, CheckCircle2, Circle, Repeat, Volume2, Bell } from 'lucide-react';

const getRepeatText = (reminder) => {
  const mode = reminder.repeatMode || reminder.repeat || 'none';
  const interval = reminder.interval !== undefined ? Number(reminder.interval) : 1;
  
  if (mode === 'none') return '';
  if (mode === 'minutes') {
    return `Every ${interval} ${interval === 1 ? 'minute' : 'minutes'}`;
  }
  if (mode === 'hours') {
    return `Every ${interval} ${interval === 1 ? 'hour' : 'hours'}`;
  }
  if (mode === 'daily') return 'Daily';
  if (mode === 'weekdays') return 'Weekdays';
  if (mode === 'weekly') return 'Weekly';
  if (mode === 'monthly') return 'Monthly';
  if (mode === 'yearly') return 'Yearly';
  return 'Repeating';
};

function ReminderCard({ reminder, onToggle, onClick }) {
  const formatTime12Hour = (time24) => {
    if (!time24) return '';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  };

  const formatReminderDate = (dateStr, timeStr) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    const dateFormatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const formattedTime = formatTime12Hour(timeStr);
    return formattedTime ? `${dateFormatted} • ${formattedTime}` : dateFormatted;
  };

  const showBrowser = reminder.browserNotification !== undefined
    ? reminder.browserNotification
    : reminder.notificationEnabled;

  const hasRepeat = (reminder.repeatMode && reminder.repeatMode !== 'none') || 
                    (!reminder.repeatMode && reminder.repeat && reminder.repeat !== 'none');

  const startDateVal = reminder.startDate || reminder.date;

  return (
    <div
      onClick={onClick}
      className={`group flex items-center justify-between gap-2.5 rounded-xl bg-white/3 p-2.5 hover:bg-white/5 border border-white/5 transition-all duration-150 cursor-pointer ${
        reminder.completed ? 'opacity-40' : ''
      }`}
    >
      <div className="flex flex-1 items-start gap-2.5 text-left text-xs min-w-0">
        {/* Toggle Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle(reminder);
          }}
          className="shrink-0 mt-0.5 text-amber-400 outline-none focus-visible:ring-1 focus-visible:ring-amber-500/30"
          aria-label={reminder.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {reminder.completed ? (
            <CheckCircle2 size={15} className="fill-amber-500/10" />
          ) : (
            <Circle size={15} className="text-slate-400" />
          )}
        </button>

        {/* Title and Metadata */}
        <div className="min-w-0 flex-1 space-y-1">
          <span className={`leading-tight block font-medium ${
            reminder.completed ? 'text-slate-500 line-through' : 'text-slate-200'
          }`}>
            {reminder.title}
          </span>

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 select-none">
            {/* Date & Time */}
            {startDateVal && (
              <div className="flex items-center gap-1 text-[9px] font-medium text-slate-400">
                <Calendar size={10} className="text-slate-500" />
                <span>{formatReminderDate(startDateVal, reminder.time)}</span>
              </div>
            )}

            {/* Repeat Badge */}
            {hasRepeat && (
              <span className="flex items-center gap-1 rounded bg-violet-500/10 border border-violet-500/15 px-1 py-0.5 text-[9px] font-semibold text-violet-400">
                <Repeat size={9} />
                <span>{getRepeatText(reminder)}</span>
                {reminder.repeatForever && <span className="text-[8px] opacity-70 ml-0.5">(Forever)</span>}
                {!reminder.repeatForever && reminder.endDate && (
                  <span className="text-[8px] opacity-70 ml-0.5">
                    (until {new Date(reminder.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                  </span>
                )}
              </span>
            )}

            {/* Browser Alert Badge */}
            {showBrowser && (
              <span className="flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/15 px-1 py-0.5 text-[9px] font-semibold text-amber-400" title="Browser Notification">
                <Bell size={9} />
                <span>Browser</span>
              </span>
            )}

            {/* Voice Alert Badge */}
            {showBrowser && reminder.voiceNotification && (
              <span className="flex items-center gap-1 rounded bg-sky-500/10 border border-sky-500/15 px-1 py-0.5 text-[9px] font-semibold text-sky-400" title="Voice Announcement">
                <Volume2 size={9} />
                <span>Voice</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

ReminderCard.propTypes = {
  reminder: PropTypes.object.isRequired,
  onToggle: PropTypes.func.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default ReminderCard;

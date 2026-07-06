import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Trash2 } from 'lucide-react';

/**
 * Returns today's local date string formatted as YYYY-MM-DD.
 */
const getTodayString = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/**
 * Parses HH:MM 24-hour time string into 12-hour components: hour (1-12), minute (00-59), period (AM/PM).
 */
const parseTime24To12 = (time24) => {
  if (!time24) return { hour: '12', minute: '00', period: 'PM' };
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const p = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return {
    hour: String(h),
    minute: m,
    period: p,
  };
};

/**
 * Converts 12-hour components (hour, minute, AM/PM) to an HH:MM 24-hour time string.
 */
const formatTime12To24 = (h, m, p) => {
  let hourNum = parseInt(h, 10);
  if (p === 'PM' && hourNum < 12) {
    hourNum += 12;
  } else if (p === 'AM' && hourNum === 12) {
    hourNum = 0;
  }
  const hStr = String(hourNum).padStart(2, '0');
  const mStr = String(m).padStart(2, '0');
  return `${hStr}:${mStr}`;
};

function ReminderModal({ isOpen, onClose, reminderToEdit, onSave, onDelete }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(''); // Start Date YYYY-MM-DD
  const [endDate, setEndDate] = useState(''); // End Date YYYY-MM-DD
  
  // 12-hour time states
  const [hour, setHour] = useState('12');
  const [minute, setMinute] = useState('00');
  const [period, setPeriod] = useState('PM');

  // Channels & Redesigned Repeat Model
  const [browserNotification, setBrowserNotification] = useState(false);
  const [voiceNotification, setVoiceNotification] = useState(false);
  const [repeatMode, setRepeatMode] = useState('none');
  const [interval, setInterval] = useState(1);
  const [repeatForever, setRepeatForever] = useState(false);

  // Validation State
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setValidationError('');
      if (reminderToEdit) {
        const formatToPickerDate = (isoStr) => {
          if (!isoStr) return '';
          return isoStr.split('T')[0];
        };

        setTitle(reminderToEdit.title);
        setDescription(reminderToEdit.description || '');
        setDate(formatToPickerDate(reminderToEdit.startDate || reminderToEdit.date));
        setEndDate(formatToPickerDate(reminderToEdit.endDate));

        const time12 = parseTime24To12(reminderToEdit.time || '12:00');
        setHour(time12.hour);
        setMinute(time12.minute);
        setPeriod(time12.period);

        setBrowserNotification(
          reminderToEdit.browserNotification !== undefined
            ? !!reminderToEdit.browserNotification
            : !!reminderToEdit.notificationEnabled
        );
        setVoiceNotification(!!reminderToEdit.voiceNotification);
        setRepeatMode(reminderToEdit.repeatMode || 'none');
        setInterval(reminderToEdit.interval !== undefined ? Number(reminderToEdit.interval) : 1);
        setRepeatForever(!!reminderToEdit.repeatForever);
      } else {
        setTitle('');
        setDescription('');
        setDate(getTodayString()); // Default start date to today
        setEndDate('');
        setHour('12');
        setMinute('00');
        setPeriod('PM');
        setBrowserNotification(false);
        setVoiceNotification(false);
        setRepeatMode('none');
        setInterval(1);
        setRepeatForever(false);
      }
    }
  }, [isOpen, reminderToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!title.trim()) return;

    if (!date) {
      setValidationError('Start Date is required.');
      return;
    }

    const todayStr = getTodayString();
    
    // Prevent manual keyboard inputs of past dates (only on creation or if user modified the date)
    const originalDateOnly = reminderToEdit ? (reminderToEdit.startDate || reminderToEdit.date)?.split('T')[0] : null;
    const isDateModified = date !== originalDateOnly;

    if (!reminderToEdit || isDateModified) {
      if (date < todayStr) {
        setValidationError('Start Date cannot be in the past.');
        return;
      }
    }

    // Time validation if selected date is today
    if (date === todayStr) {
      const now = new Date();
      const time24 = formatTime12To24(hour, minute, period);
      const [nowHour, nowMin] = [now.getHours(), now.getMinutes()];
      const [selHour, selMin] = time24.split(':').map(Number);
      
      if (selHour < nowHour || (selHour === nowHour && selMin <= nowMin)) {
        setValidationError('Selected time must be in the future.');
        return;
      }
    }

    // End date validation
    if (repeatMode !== 'none' && !repeatForever) {
      if (!endDate) {
        setValidationError('End Date is required for repeating reminders.');
        return;
      }
      if (endDate < date) {
        setValidationError('End Date cannot be before Start Date.');
        return;
      }
    }

    const parsePickerDate = (dateStr) => {
      if (!dateStr) return null;
      return new Date(`${dateStr}T00:00:00`).toISOString();
    };

    const time24 = formatTime12To24(hour, minute, period);
    const startVal = parsePickerDate(date);

    onSave({
      title: title.trim(),
      description: description.trim(),
      startDate: startVal,
      date: startVal, // keep legacy sync
      endDate: repeatMode !== 'none' && !repeatForever ? parsePickerDate(endDate) : null,
      time: time24,
      browserNotification,
      voiceNotification,
      notificationEnabled: browserNotification || voiceNotification,
      repeatMode,
      interval: Number(interval),
      repeatForever: repeatMode !== 'none' && repeatForever,
      // Legacy compatibility field fallback
      repeat: repeatMode === 'none' ? 'none' : (repeatMode === 'daily' ? 'daily' : (repeatMode === 'weekly' ? 'weekly' : (repeatMode === 'monthly' ? 'monthly' : 'custom'))),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-990 p-6 shadow-2xl backdrop-blur-xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin">
        <h3 className="text-base font-semibold text-white select-none">
          {reminderToEdit ? 'Edit Reminder' : 'Add Reminder'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
              Title <span className="text-violet-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="What do you want to be reminded of?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-all"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
              Description
            </label>
            <textarea
              placeholder="Add details (optional)"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-none transition-all"
            />
          </div>

          {/* Date & Time Picker */}
          <div className="grid grid-cols-2 gap-3">
            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                Start Date
              </label>
              <input
                type="date"
                required
                value={date}
                min={reminderToEdit ? '' : getTodayString()}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50 transition-all"
              />
            </div>

            {/* 12-hour Time selects */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                Time
              </label>
              <div className="grid grid-cols-3 gap-1">
                {/* Hour */}
                <select
                  value={hour}
                  onChange={(e) => setHour(e.target.value)}
                  className="rounded-xl bg-white/5 border border-white/10 px-1 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50 transition-all"
                >
                  {[...Array(12).keys()].map((h) => {
                    const val = String(h + 1);
                    return (
                      <option key={val} value={val} className="bg-slate-900 text-white">
                        {val}
                      </option>
                    );
                  })}
                </select>

                {/* Minute */}
                <select
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                  className="rounded-xl bg-white/5 border border-white/10 px-1 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50 transition-all"
                >
                  {[...Array(60).keys()].map((m) => {
                    const val = String(m).padStart(2, '0');
                    return (
                      <option key={val} value={val} className="bg-slate-900 text-white">
                        {val}
                      </option>
                    );
                  })}
                </select>

                {/* Period (AM/PM) */}
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="rounded-xl bg-white/5 border border-white/10 px-1 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50 transition-all"
                >
                  <option value="AM" className="bg-slate-900 text-white">AM</option>
                  <option value="PM" className="bg-slate-900 text-white">PM</option>
                </select>
              </div>
            </div>
          </div>

          {/* Repeat */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
              Repeat
            </label>
            <select
              value={repeatMode}
              onChange={(e) => {
                const val = e.target.value;
                setRepeatMode(val);
                if (val === 'none') {
                  setRepeatForever(false);
                  setEndDate('');
                  setInterval(1);
                }
              }}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50 transition-all"
            >
              <option value="none" className="bg-slate-900 text-white">Never</option>
              <option value="minutes" className="bg-slate-900 text-white">Every X Minutes</option>
              <option value="hours" className="bg-slate-900 text-white">Every X Hours</option>
              <option value="daily" className="bg-slate-900 text-white">Daily</option>
              <option value="weekdays" className="bg-slate-900 text-white">Weekdays</option>
              <option value="weekly" className="bg-slate-900 text-white">Weekly</option>
              <option value="monthly" className="bg-slate-900 text-white">Monthly</option>
              <option value="yearly" className="bg-slate-900 text-white">Yearly</option>
            </select>
          </div>

          {/* Conditional Multiplier for Minutes and Hours */}
          {(repeatMode === 'minutes' || repeatMode === 'hours') && (
            <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/3 p-3 animate-slide-down select-none">
              <span className="text-xs text-slate-300 font-medium">Every</span>
              <input
                type="number"
                min="1"
                required
                value={interval}
                onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-16 text-center rounded-lg bg-white/10 border border-white/10 px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-all"
              />
              <span className="text-xs text-slate-300 font-medium capitalize">
                {repeatMode === 'minutes' ? 'Minutes' : 'Hours'}
              </span>
            </div>
          )}

          {/* Recurring Dates Settings (Start/End limits) */}
          {repeatMode !== 'none' && (
            <div className="space-y-3 rounded-xl border border-white/5 bg-white/3 p-3 animate-fade-in">
              {/* Until I Stop */}
              <div className="flex items-center justify-between select-none">
                <div className="flex flex-col">
                  <span className="text-[11px] font-semibold text-slate-200">Until I Stop</span>
                  <span className="text-[9px] text-slate-500 font-medium">Keep repeating forever</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={repeatForever}
                    onChange={(e) => {
                      setRepeatForever(e.target.checked);
                      if (e.target.checked) {
                        setEndDate('');
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600 peer-checked:after:bg-white peer-checked:after:border-white"></div>
                </label>
              </div>

              {/* End Date */}
              {!repeatForever && (
                <div className="space-y-1.5 pt-1 border-t border-white/5 animate-slide-down">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider select-none">
                    End Date <span className="text-violet-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    min={date || getTodayString()}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500/50 transition-all"
                  />
                </div>
              )}
            </div>
          )}

          {/* Channels Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
              Alert Channels
            </label>
            <div className="grid grid-cols-2 gap-2 select-none">
              {/* Browser Notification */}
              <div className="flex items-center justify-between rounded-xl bg-white/3 border border-white/5 p-3">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-200">Browser</span>
                  <span className="text-[9px] text-slate-500 font-medium">Desktop alert</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={browserNotification}
                    onChange={(e) => setBrowserNotification(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-violet-600 peer-checked:after:bg-white peer-checked:after:border-white"></div>
                </label>
              </div>

              {/* Voice Reminder */}
              <div className="flex items-center justify-between rounded-xl bg-white/3 border border-white/5 p-3">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-200">Voice</span>
                  <span className="text-[9px] text-slate-500 font-medium">Spoken text</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={voiceNotification}
                    onChange={(e) => setVoiceNotification(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-violet-600 peer-checked:after:bg-white peer-checked:after:border-white"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Validation Warning Box */}
          {validationError && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-[10px] text-rose-300 animate-slide-down">
              <span className="font-semibold">Validation Error: </span>{validationError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            {reminderToEdit ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(reminderToEdit.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 hover:text-white transition-all duration-150"
              >
                <Trash2 size={13} />
                Delete
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 select-none">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 shadow-lg shadow-violet-600/20 transition-all duration-150"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

ReminderModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  reminderToEdit: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default ReminderModal;

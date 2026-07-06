import { useEffect, useState, useRef } from 'react';
import { Bell, AlarmClock, X } from 'lucide-react';
import PropTypes from 'prop-types';
import { voiceAnnouncementService } from '../../services/VoiceAnnouncementService';
import { ReminderEngine } from '../../services/reminderEngine';

const SNOOZE_OPTIONS = [5, 10, 15];

/**
 * ReminderAlertDialog
 * A full-screen modal overlay that appears when a reminder fires.
 * Provides Snooze (5/10/15 min) and Stop buttons.
 */
export default function ReminderAlertDialog({ reminder, userId, onDismiss }) {
  const [visible, setVisible] = useState(true);
  const [snoozed, setSnoozed] = useState(false);
  const [snoozeMinutes, setSnoozeMinutes] = useState(null);
  const autoCloseRef = useRef(null);

  // Auto-dismiss after 60 seconds if user doesn't interact
  useEffect(() => {
    autoCloseRef.current = setTimeout(() => {
      handleStop();
    }, 60000);

    return () => {
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSnooze = async (minutes) => {
    if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    setSnoozeMinutes(minutes);
    setSnoozed(true);
    await ReminderEngine.snoozeReminder(userId, reminder, minutes);
    setTimeout(() => {
      setVisible(false);
      if (onDismiss) onDismiss();
    }, 1800);
  };

  const handleStop = () => {
    if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    voiceAnnouncementService.clearAndStop();
    setVisible(false);
    if (onDismiss) onDismiss();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      {/* Card */}
      <div className="relative w-[92%] max-w-sm rounded-3xl border border-white/10 bg-slate-900/95 shadow-[0_0_80px_rgba(167,139,250,0.25)] p-6 flex flex-col gap-5 animate-scale-in">
        
        {/* Dismiss X button */}
        <button
          onClick={handleStop}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-slate-500 hover:text-white hover:bg-white/10 transition-all"
          aria-label="Dismiss reminder"
        >
          <X size={14} />
        </button>

        {/* Icon + Title */}
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div className="h-12 w-12 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <Bell size={22} className="text-violet-400" />
            </div>
            {/* Pulse ring */}
            <span className="absolute -inset-1 rounded-2xl border border-violet-400/30 animate-ping opacity-60" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest mb-0.5">
              LifeOS Reminder
            </p>
            <h2 className="text-sm font-bold text-white leading-snug line-clamp-2">
              {reminder.title}
            </h2>
            {reminder.description && (
              <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                {reminder.description}
              </p>
            )}
          </div>
        </div>

        {/* Snooze confirmation */}
        {snoozed && snoozeMinutes && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-950/60 border border-emerald-500/20 px-3 py-2">
            <AlarmClock size={13} className="text-emerald-400 shrink-0" />
            <p className="text-xs text-emerald-300">
              Snoozed for <span className="font-bold">{snoozeMinutes} minutes</span>. See you soon!
            </p>
          </div>
        )}

        {/* Snooze buttons */}
        {!snoozed && (
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Snooze for
            </p>
            <div className="flex gap-2">
              {SNOOZE_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  onClick={() => handleSnooze(mins)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-violet-600/40 border border-white/10 hover:border-violet-500/40 text-slate-300 hover:text-white transition-all duration-150"
                >
                  {mins} min
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stop / Dismiss button */}
        {!snoozed && (
          <button
            onClick={handleStop}
            className="w-full py-2.5 rounded-2xl text-xs font-bold bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/30 hover:border-rose-500/60 text-rose-300 hover:text-white transition-all duration-150"
          >
            Stop & Dismiss
          </button>
        )}
      </div>
    </div>
  );
}

ReminderAlertDialog.propTypes = {
  reminder: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
  }).isRequired,
  userId: PropTypes.string.isRequired,
  onDismiss: PropTypes.func,
};

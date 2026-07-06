import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Bell, Plus, AlertTriangle } from 'lucide-react';
import EmptyWidgetState from './EmptyWidgetState';
import ReminderCard from './ReminderCard';
import ReminderModal from './ReminderModal';
import { getFirebaseAuth } from '../../../services/authService';
import {
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
} from '../../../services/reminderService';
import { NotificationService } from '../../../services/notificationService';
import { ReminderEngine } from '../../../services/reminderEngine';

function ReminderWidget({ data = null, isLoading = false }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Modal and Edit States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reminderToEdit, setReminderToEdit] = useState(null);

  // Toast Auto-Dismiss
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Fetch reminders helper
  const loadReminders = async (uid) => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await getReminders(uid);
      setReminders(fetched);
      
      // Restore schedules on app load / auth initialization
      ReminderEngine.restoreSchedules(uid, fetched);
    } catch (err) {
      console.error('Error fetching reminders:', err);
      setError('Unable to fetch reminders. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Auth subscription
  useEffect(() => {
    if (data) {
      setReminders(data);
      setLoading(isLoading);
      const auth = getFirebaseAuth();
      if (auth.currentUser && !isLoading) {
        ReminderEngine.restoreSchedules(auth.currentUser.uid, data);
      }
      return;
    }

    const auth = getFirebaseAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        loadReminders(user.uid);
      } else {
        setReminders([]);
        setLoading(false);
      }
    });

    // Request permissions silently at start
    NotificationService.requestPermission();

    return () => unsubscribe();
  }, [data, isLoading]);

  const openCreateModal = () => {
    setReminderToEdit(null);
    setIsModalOpen(true);
  };

  const openEditModal = (reminder) => {
    setReminderToEdit(reminder);
    setIsModalOpen(true);
  };

  const handleToggleCompleted = async (reminder) => {
    if (!currentUser) return;
    const originalState = reminder.completed;
    const nextCompleted = !originalState;

    // Optimistic UI state toggle
    setReminders((prev) =>
      prev.map((r) => (r.id === reminder.id ? { ...r, completed: nextCompleted } : r))
    );

    try {
      await updateReminder(currentUser.uid, reminder.id, {
        completed: nextCompleted,
      });

      const updated = { ...reminder, completed: nextCompleted };
      if (nextCompleted) {
        ReminderEngine.cancelReminder(reminder.id);
        setToast({ type: 'success', title: 'Completed', message: `Reminder "${reminder.title}" marked as complete.` });
      } else {
        ReminderEngine.scheduleReminder(updated);
        setToast({ type: 'success', title: 'Active', message: `Reminder "${reminder.title}" restored to active.` });
      }
    } catch (err) {
      console.error('Failed to toggle reminder status:', err);
      setError('Failed to update status.');
      setToast({ type: 'error', title: 'Error', message: 'Failed to update reminder status.' });
      setReminders((prev) =>
        prev.map((r) => (r.id === reminder.id ? { ...r, completed: originalState } : r))
      );
    }
  };

  const handleModalSave = async (fields) => {
    if (!currentUser) return;

    const payload = {
      ...fields,
      source: reminderToEdit ? reminderToEdit.source : 'manual',
      voiceCreated: reminderToEdit ? reminderToEdit.voiceCreated : false,
      agentGenerated: reminderToEdit ? reminderToEdit.agentGenerated : false,
      completed: reminderToEdit ? reminderToEdit.completed : false,
    };

    setError(null);
    setIsModalOpen(false);

    if (reminderToEdit) {
      // Edit mode (optimistic update)
      const original = [...reminders];
      setReminders((prev) =>
        prev.map((r) => (r.id === reminderToEdit.id ? { ...r, ...payload } : r))
      );

      try {
        await updateReminder(currentUser.uid, reminderToEdit.id, payload);

        // Cancel old timer, create new timer via reschedule
        const updated = { id: reminderToEdit.id, ...payload };
        ReminderEngine.rescheduleReminder(updated);
        setToast({ type: 'success', title: 'Updated', message: `Reminder "${payload.title}" updated.` });
      } catch (err) {
        console.error('Failed to update reminder:', err);
        setError('Unable to update reminder. Please try again.');
        setToast({ type: 'error', title: 'Error', message: 'Failed to update reminder.' });
        setReminders(original);
      }
    } else {
      // Create mode
      try {
        const newReminder = await createReminder(currentUser.uid, payload);
        setReminders((prev) => [newReminder, ...prev]);

        // Request browser permission if browser notification is desired
        const showBrowser = newReminder.browserNotification !== undefined
          ? newReminder.browserNotification
          : newReminder.notificationEnabled;

        if (showBrowser) {
          await NotificationService.requestPermission();
        }
        
        ReminderEngine.scheduleReminder(newReminder);
        setToast({ type: 'success', title: 'Scheduled', message: `Reminder "${payload.title}" scheduled.` });
      } catch (err) {
        console.error('Failed to create reminder:', err);
        setError('Unable to save reminder. Please try again.');
        setToast({ type: 'error', title: 'Error', message: 'Failed to save reminder.' });
      }
    }
    setReminderToEdit(null);
  };

  const handleDeleteReminder = async (reminderId) => {
    if (!currentUser) return;

    const original = [...reminders];
    const targetReminder = reminders.find(r => r.id === reminderId);
    setReminders((prev) => prev.filter((r) => r.id !== reminderId));

    try {
      await deleteReminder(currentUser.uid, reminderId);
      ReminderEngine.cancelReminder(reminderId);
      setToast({ type: 'success', title: 'Deleted', message: `Reminder "${targetReminder?.title || ''}" deleted.` });
    } catch (err) {
      console.error('Failed to delete reminder:', err);
      setError('Failed to delete reminder.');
      setToast({ type: 'error', title: 'Error', message: 'Failed to delete reminder.' });
      setReminders(original);
    }
  };

  const showLoading = loading || isLoading;

  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-glow flex flex-col relative">
      {/* Widget Header */}
      <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-3 select-none">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-xl bg-amber-500/10 text-amber-400">
            <Bell size={14} />
          </span>
          <h3 className="text-sm font-semibold text-white">Upcoming Reminders</h3>
        </div>
        <span className="text-[10px] text-slate-500">Alerts active</span>
      </div>

      {/* Error Alert Box */}
      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 text-[10px] text-red-300">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-white font-bold px-1 select-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* Widget Content */}
      {showLoading ? (
        <div className="space-y-2 py-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      ) : reminders.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
            {reminders.map((rem) => (
              <ReminderCard
                key={rem.id}
                reminder={rem}
                onToggle={handleToggleCompleted}
                onClick={() => openEditModal(rem)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 py-2 text-xs font-semibold text-slate-400 hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-violet-300 transition-all duration-150 select-none"
          >
            <Plus size={13} />
            Add Reminder
          </button>
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col gap-2">
          <EmptyWidgetState
            icon={Bell}
            title="No active reminders"
            description="Keep your workspace clean. Set reminders using the composer."
            ctaLabel="Add Reminder"
            onCta={openCreateModal}
          />
        </div>
      )}

      {/* Modal Dialog */}
      <ReminderModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setReminderToEdit(null);
        }}
        reminderToEdit={reminderToEdit}
        onSave={handleModalSave}
        onDelete={handleDeleteReminder}
      />

      {/* Toast Feedback notifications */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-300 animate-slide-up ${
          toast.type === 'success' 
            ? 'border-emerald-500/20 bg-slate-900/90 text-emerald-300' 
            : 'border-red-500/20 bg-slate-900/90 text-red-300'
        }`}>
          <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
          <div className="flex-1 space-y-0.5 min-w-[150px]">
            <p className="text-xs font-semibold text-white">{toast.title || (toast.type === 'success' ? 'Success' : 'Error')}</p>
            <p className="text-[10px] text-slate-400">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-500 hover:text-white transition-colors duration-150 text-xs px-1.5 font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

ReminderWidget.propTypes = {
  data: PropTypes.array,
  isLoading: PropTypes.bool,
};

export default ReminderWidget;

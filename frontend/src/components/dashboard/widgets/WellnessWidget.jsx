import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { HeartPulse, Droplet, Moon, Activity, Apple, Wind, AlertTriangle } from 'lucide-react';
import EmptyWidgetState from './EmptyWidgetState';
import WellnessModal from './WellnessModal';
import { getFirebaseAuth } from '../../../services/authService';
import {
  getWellnessItems,
  createWellnessItem,
  updateWellnessItem,
  deleteWellnessItem,
} from '../../../services/wellnessService';
import {
  calculateCompletionPercentage,
  calculateDailyGoals,
} from '../../../services/wellnessEngine';

/**
 * Returns configuration for inline progress controls based on goal unit and category.
 */
function getIncrementConfig(item) {
  const unitClean = (item.unit || '').toLowerCase().trim();
  const categoryClean = item.category;

  if (unitClean === 'l' || unitClean === 'liter' || unitClean === 'liters') {
    return { value: 0.25, label: '+0.25 L' };
  } else if (unitClean === 'ml' || unitClean === 'milliliters') {
    return { value: 250, label: '+250 ml' };
  } else if (unitClean === 'glass' || unitClean === 'glasses') {
    return { value: 1, label: '+1 glass' };
  } else if (unitClean.startsWith('min')) {
    return { value: 15, label: '+15 min' };
  } else if (unitClean.startsWith('hour') || unitClean === 'hr' || unitClean === 'hrs') {
    return { value: 1, label: '+1 hr' };
  } else if (unitClean === 'km' || unitClean === 'kms' || unitClean.startsWith('mile')) {
    return { value: 1, label: '+1 km' };
  } else {
    // Default fallback based on category
    if (categoryClean === 'water') {
      return { value: 1, label: '+1 glass' };
    } else if (categoryClean === 'exercise' || categoryClean === 'meditation') {
      return { value: 15, label: '+15 min' };
    } else if (categoryClean === 'sleep') {
      return { value: 1, label: '+1 hr' };
    }
    return { value: 1, label: '+1' };
  }
}

function WellnessWidget({ data = null, isLoading = false }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Active Tab: 'active' | 'completed'
  const [activeTab, setActiveTab] = useState('active');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);

  // Toast Auto-Dismiss
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Fetch helper
  const loadWellnessItems = async (uid) => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await getWellnessItems(uid);
      setItems(fetched);
    } catch (err) {
      console.error('Error fetching wellness items:', err);
      setError('Unable to fetch wellness goals. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Auth subscription
  useEffect(() => {
    if (data) {
      setItems(data);
      setLoading(isLoading);
      return;
    }

    const auth = getFirebaseAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        loadWellnessItems(user.uid);
      } else {
        setItems([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [data, isLoading]);

  const openCreateModal = () => {
    setItemToEdit(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setItemToEdit(item);
    setIsModalOpen(true);
  };

  const handleModalSave = async (fields) => {
    if (!currentUser) return;

    setError(null);
    setIsModalOpen(false);

    // Automatically mark goals as completed when target is reached
    const status = fields.current >= fields.target ? 'completed' : fields.status;
    const payload = {
      ...fields,
      status,
    };

    if (itemToEdit && itemToEdit.id) {
      // Edit mode (optimistic update)
      const original = [...items];
      setItems((prev) =>
        prev.map((item) => (item.id === itemToEdit.id ? { ...item, ...payload } : item))
      );

      try {
        await updateWellnessItem(currentUser.uid, itemToEdit.id, payload);
        setToast({ type: 'success', title: 'Updated', message: `Goal "${payload.title}" updated successfully.` });
      } catch (err) {
        console.error('Failed to update wellness item:', err);
        setError('Unable to update wellness goal. Please try again.');
        setToast({ type: 'error', title: 'Error', message: 'Failed to update goal.' });
        setItems(original);
      }
    } else {
      // Create mode (optimistic update with temporary ID)
      const tempId = `temp-${Date.now()}`;
      const tempItem = {
        id: tempId,
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const original = [...items];
      setItems((prev) => [tempItem, ...prev]);

      try {
        const newItem = await createWellnessItem(currentUser.uid, payload);
        setItems((prev) =>
          prev.map((item) => (item.id === tempId ? newItem : item))
        );
        setToast({ type: 'success', title: 'Goal Created', message: `Goal "${payload.title}" saved.` });
      } catch (err) {
        console.error('Failed to create wellness item:', err);
        setError('Unable to save wellness goal. Please try again.');
        setToast({ type: 'error', title: 'Error', message: 'Failed to save goal.' });
        setItems(original);
      }
    }
    setItemToEdit(null);
  };

  const handleDeleteItem = async (itemId) => {
    if (!currentUser) return;

    const original = [...items];
    const targetItem = items.find((i) => i.id === itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));

    try {
      await deleteWellnessItem(currentUser.uid, itemId);
      setToast({ type: 'success', title: 'Deleted', message: `Goal "${targetItem?.title || ''}" deleted.` });
    } catch (err) {
      console.error('Failed to delete wellness goal:', err);
      setError('Failed to delete goal.');
      setToast({ type: 'error', title: 'Error', message: 'Failed to delete goal.' });
      setItems(original);
    }
  };

  const handleQuickProgress = async (e, item, direction) => {
    e.stopPropagation(); // Avoid triggering edit modal click handler

    if (!currentUser) return;

    const config = getIncrementConfig(item);
    const amount = direction === 'inc' ? config.value : -config.value;
    const nextCurrent = parseFloat(Math.min(Math.max(0, item.current + amount), item.target).toFixed(2));
    const nextStatus = nextCurrent >= item.target ? 'completed' : 'active';

    const updates = {
      current: nextCurrent,
      status: nextStatus,
    };

    // Optimistic Update
    const original = [...items];
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, ...updates } : i))
    );

    try {
      await updateWellnessItem(currentUser.uid, item.id, updates);
      if (nextStatus === 'completed' && item.status !== 'completed') {
        setToast({ type: 'success', title: 'Goal Completed! 🎉', message: `Great job completing "${item.title}"!` });
      } else {
        setToast({ type: 'success', title: 'Progress Synced', message: `Goal "${item.title}" updated.` });
      }
    } catch (err) {
      console.error('Failed to update quick progress:', err);
      setToast({ type: 'error', title: 'Error', message: 'Failed to update progress.' });
      setItems(original);
    }
  };

  const handlePresetClick = (presetType) => {
    let presetData = {};
    switch (presetType) {
      case 'water':
        presetData = {
          title: 'Drink Water',
          category: 'water',
          target: 2,
          current: 0,
          unit: 'L',
          frequency: 'daily',
          reminderEnabled: false,
          notes: 'Stay hydrated throughout the day.',
          status: 'active',
          agentGenerated: false,
        };
        break;
      case 'exercise':
        presetData = {
          title: 'Workout Session',
          category: 'exercise',
          target: 30,
          current: 0,
          unit: 'min',
          frequency: 'daily',
          reminderEnabled: false,
          notes: 'Daily physical exercise.',
          status: 'active',
          agentGenerated: false,
        };
        break;
      case 'meditation':
        presetData = {
          title: 'Mindful Meditation',
          category: 'meditation',
          target: 10,
          current: 0,
          unit: 'min',
          frequency: 'daily',
          reminderEnabled: false,
          notes: 'Mindfulness and breathing session.',
          status: 'active',
          agentGenerated: false,
        };
        break;
      case 'sleep':
        presetData = {
          title: 'Nightly Sleep',
          category: 'sleep',
          target: 8,
          current: 0,
          unit: 'hours',
          frequency: 'daily',
          reminderEnabled: false,
          notes: 'Track nightly sleep duration.',
          status: 'active',
          agentGenerated: false,
        };
        break;
      default:
        return;
    }

    setItemToEdit(presetData);
    setIsModalOpen(true);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'water':
        return <Droplet size={14} className="text-cyan-400" />;
      case 'exercise':
        return <Activity size={14} className="text-emerald-400" />;
      case 'sleep':
        return <Moon size={14} className="text-indigo-400" />;
      case 'meditation':
        return <Wind size={14} className="text-violet-400" />;
      case 'nutrition':
        return <Apple size={14} className="text-amber-400" />;
      case 'custom':
      default:
        return <HeartPulse size={14} className="text-rose-400" />;
    }
  };

  const showLoading = loading || isLoading;

  // Group / Filter items
  const activeItems = items.filter((item) => item.status === 'active');
  const completedItems = items.filter((item) => item.status === 'completed');

  // Daily progress tracking calculation using engine
  const dailyGoals = calculateDailyGoals(items).filter((item) => item.status === 'active');
  const totalDailyTarget = dailyGoals.reduce((acc, item) => acc + item.target, 0);
  const totalDailyCurrent = dailyGoals.reduce((acc, item) => acc + Math.min(item.current, item.target), 0);
  const dailyPercentage = totalDailyTarget > 0 ? Math.round((totalDailyCurrent / totalDailyTarget) * 100) : 0;

  const currentTabItems = activeTab === 'completed' ? completedItems : activeItems;

  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-glow flex flex-col relative transition-all duration-300">
      {/* Widget Header */}
      <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-3 select-none">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-xl bg-rose-500/10 text-rose-400">
            <HeartPulse size={14} />
          </span>
          <h3 className="text-sm font-semibold text-white">Wellness Tracker</h3>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-full border border-rose-500/20 bg-rose-500/5 px-2.5 py-0.5 text-[9px] font-medium text-rose-300 hover:bg-rose-500/10 transition-colors duration-150"
        >
          Add Goal
        </button>
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

      {/* Daily Progress Tracker Panel */}
      {dailyGoals.length > 0 && !showLoading && (
        <div className="mb-3 rounded-2xl border border-rose-500/15 bg-rose-500/5 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold text-rose-300 uppercase tracking-wider">Daily Progress</p>
              <p className="text-xs font-semibold text-white mt-0.5">
                {totalDailyCurrent.toFixed(1).replace(/\.0$/, '')} / {totalDailyTarget.toFixed(1).replace(/\.0$/, '')} units completed
              </p>
            </div>
            <span className="text-xs font-extrabold text-rose-400">{dailyPercentage}%</span>
          </div>
          <div className="w-full bg-slate-800/40 rounded-full h-1 overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${dailyPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Category Tabs */}
      {items.length > 0 && !showLoading && (
        <div className="flex border-b border-white/5 mb-3 select-none">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`flex-1 pb-1.5 text-[10px] font-bold text-center border-b transition-all duration-150 ${
              activeTab === 'active'
                ? 'text-rose-400 border-rose-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            Active ({activeItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`flex-1 pb-1.5 text-[10px] font-bold text-center border-b transition-all duration-150 ${
              activeTab === 'completed'
                ? 'text-rose-400 border-rose-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            Completed ({completedItems.length})
          </button>
        </div>
      )}

      {/* Widget Content */}
      {showLoading ? (
        <div className="space-y-2.5 py-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-[78px] animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : currentTabItems.length > 0 ? (
        <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
          {currentTabItems.map((item) => {
            const percentage = calculateCompletionPercentage(item);
            const remaining = Math.max(0, item.target - item.current);
            const config = getIncrementConfig(item);

            const remainingStr = remaining > 0
              ? `${remaining.toFixed(1).replace(/\.0$/, '')} ${item.unit || 'units'} remaining`
              : 'Goal completed';

            return (
              <div
                key={item.id}
                onClick={() => openEditModal(item)}
                className="group relative cursor-pointer rounded-2xl border border-white/5 bg-slate-900/40 p-3 hover:bg-slate-900/60 hover:border-rose-500/20 transition-all duration-150 flex flex-col gap-2 select-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-slate-800/65 group-hover:bg-slate-800 transition-colors shrink-0">
                      {getCategoryIcon(item.category)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate group-hover:text-rose-300 transition-colors">
                        {item.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] text-slate-500 capitalize">{item.frequency}</span>
                        {item.reminderEnabled && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-slate-600" />
                            <span className="text-[8px] text-rose-400 font-medium uppercase tracking-wider">Reminder</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-extrabold text-white">
                      {item.current.toFixed(1).replace(/\.0$/, '')}
                      <span className="text-[10px] font-normal text-slate-400 ml-0.5">{item.unit || 'units'}</span>
                    </p>
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      {remainingStr}
                    </p>
                  </div>
                </div>

                {/* Progress Bar & Inline controls */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <div className="flex-1 bg-slate-800/40 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.status === 'completed' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-bold shrink-0 ${
                      item.status === 'completed' ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {percentage}%
                    </span>
                  </div>

                  {/* Inline quick progress controls */}
                  {item.status === 'active' && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleQuickProgress(e, item, 'dec')}
                        className="rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[8px] font-bold text-slate-400 hover:bg-white/10 hover:text-white transition-all select-none"
                        title="Subtract progress"
                      >
                        -{config.label.replace('+', '')}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleQuickProgress(e, item, 'inc')}
                        className="rounded bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 text-[8px] font-bold text-rose-300 hover:bg-rose-500/20 hover:text-white transition-all select-none"
                        title="Add progress"
                      >
                        {config.label}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <EmptyWidgetState
          icon={HeartPulse}
          title={activeTab === 'completed' ? 'No goals completed yet' : 'No active wellness goals'}
          description={activeTab === 'completed' ? 'Log progress to complete goals.' : 'Start tracking water, workouts, or sleep goals.'}
          ctaLabel="Add Wellness Goal"
          onCta={openCreateModal}
        />
      )}

      {/* Quick Presets Panel */}
      {!showLoading && (
        <div className="mt-4 border-t border-white/5 pt-3.5 select-none">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2 pl-0.5">Quick Presets</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handlePresetClick('water')}
              className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-slate-900/30 p-2 text-left hover:border-rose-500/20 hover:bg-slate-900/50 transition-all text-[10px] font-semibold text-slate-300 hover:text-white"
            >
              <span className="text-cyan-400 text-xs shrink-0">💧</span>
              <span className="truncate">Drink 2L Water</span>
            </button>
            <button
              type="button"
              onClick={() => handlePresetClick('exercise')}
              className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-slate-900/30 p-2 text-left hover:border-rose-500/20 hover:bg-slate-900/50 transition-all text-[10px] font-semibold text-slate-300 hover:text-white"
            >
              <span className="text-emerald-400 text-xs shrink-0">🏃</span>
              <span className="truncate">30 Min Workout</span>
            </button>
            <button
              type="button"
              onClick={() => handlePresetClick('meditation')}
              className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-slate-900/30 p-2 text-left hover:border-rose-500/20 hover:bg-slate-900/50 transition-all text-[10px] font-semibold text-slate-300 hover:text-white"
            >
              <span className="text-violet-400 text-xs shrink-0">🧘</span>
              <span className="truncate">10 Min Meditate</span>
            </button>
            <button
              type="button"
              onClick={() => handlePresetClick('sleep')}
              className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-slate-900/30 p-2 text-left hover:border-rose-500/20 hover:bg-slate-900/50 transition-all text-[10px] font-semibold text-slate-300 hover:text-white"
            >
              <span className="text-indigo-400 text-xs shrink-0">🌙</span>
              <span className="truncate">Sleep 8 Hours</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      <WellnessModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setItemToEdit(null);
        }}
        itemToEdit={itemToEdit}
        onSave={handleModalSave}
        onDelete={handleDeleteItem}
      />

      {/* Toast Feedback Notifications */}
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

WellnessWidget.propTypes = {
  data: PropTypes.array,
  isLoading: PropTypes.bool,
};

export default WellnessWidget;

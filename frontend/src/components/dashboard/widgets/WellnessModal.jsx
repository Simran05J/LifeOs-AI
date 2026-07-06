import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Trash2, Heart, Award, Hash, Activity, Compass, AlertCircle, FileText, Flame } from 'lucide-react';

function WellnessModal({ isOpen, onClose, itemToEdit, onSave, onDelete }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('water');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [unit, setUnit] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('active');
  const [streak, setStreak] = useState('0');

  // Validation State
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setValidationError('');
      if (itemToEdit) {
        setTitle(itemToEdit.title || '');
        setCategory(itemToEdit.category || 'water');
        setTarget(itemToEdit.target !== undefined ? String(itemToEdit.target) : '');
        setCurrent(itemToEdit.current !== undefined ? String(itemToEdit.current) : '');
        setUnit(itemToEdit.unit || '');
        setFrequency(itemToEdit.frequency || 'daily');
        setReminderEnabled(!!itemToEdit.reminderEnabled);
        setNotes(itemToEdit.notes || '');
        setStatus(itemToEdit.status || 'active');
        setStreak(itemToEdit.streak !== undefined ? String(itemToEdit.streak) : '0');
      } else {
        setTitle('');
        setCategory('water');
        setTarget('');
        setCurrent('0');
        setUnit('');
        setFrequency('daily');
        setReminderEnabled(false);
        setNotes('');
        setStatus('active');
        setStreak('0');
      }
    }
  }, [isOpen, itemToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!title.trim()) {
      setValidationError('Goal Title is required.');
      return;
    }

    const numericTarget = parseFloat(target);
    if (isNaN(numericTarget) || numericTarget <= 0) {
      setValidationError('Target Value must be greater than zero.');
      return;
    }

    const numericCurrent = current === '' ? 0 : parseFloat(current);
    if (isNaN(numericCurrent) || numericCurrent < 0) {
      setValidationError('Current Progress cannot be negative.');
      return;
    }

    if (numericCurrent > numericTarget) {
      setValidationError('Current Progress cannot exceed Target Value.');
      return;
    }

    if (!frequency) {
      setValidationError('Frequency is required.');
      return;
    }

    const numericStreak = streak === '' ? 0 : parseInt(streak, 10);
    if (isNaN(numericStreak) || numericStreak < 0) {
      setValidationError('Streak cannot be negative.');
      return;
    }

    onSave({
      title: title.trim(),
      category,
      target: numericTarget,
      current: numericCurrent,
      unit: unit.trim(),
      frequency,
      reminderEnabled,
      notes: notes.trim(),
      status,
      streak: numericStreak,
      source: itemToEdit ? itemToEdit.source : 'manual',
      agentGenerated: itemToEdit ? itemToEdit.agentGenerated : false,
      lastCompletedDate: itemToEdit ? itemToEdit.lastCompletedDate : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl backdrop-blur-xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin">
        <h3 className="text-base font-semibold text-white select-none">
          {itemToEdit && itemToEdit.id ? 'Edit Wellness Goal' : 'Track New Wellness Goal'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Goal Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none flex items-center gap-1">
              <Heart size={10} className="text-rose-400" />
              Goal Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Daily Hydration, Morning Running"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50 transition-all"
            />
          </div>

          {/* Category and Frequency Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none flex items-center gap-1">
                <Activity size={10} className="text-rose-400" />
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500/50 transition-all"
              >
                <option value="water">Water</option>
                <option value="exercise">Exercise</option>
                <option value="sleep">Sleep</option>
                <option value="meditation">Meditation</option>
                <option value="nutrition">Nutrition</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Frequency */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none flex items-center gap-1">
                <Compass size={10} className="text-rose-400" />
                Frequency <span className="text-rose-400">*</span>
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500/50 transition-all"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          {/* Target, Current, and Unit Row */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Target Value */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none flex items-center gap-1">
                <Award size={10} className="text-rose-400" />
                Target <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="any"
                placeholder="e.g., 8"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50 transition-all"
              />
            </div>

            {/* Current Value */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none flex items-center gap-1">
                <Hash size={10} className="text-rose-400" />
                Progress
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g., 0"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50 transition-all"
              />
            </div>

            {/* Unit */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                Unit
              </label>
              <input
                type="text"
                placeholder="e.g., glasses, hours, km"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50 transition-all"
              />
            </div>
          </div>

          {/* Status, Streak, and Reminders Grid */}
          <div className="grid grid-cols-3 gap-2.5 items-center pt-1.5">
            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500/50 transition-all"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            {/* Streak */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none flex items-center gap-1">
                <Flame size={10} className="text-amber-500" />
                Streak
              </label>
              <input
                type="number"
                min="0"
                value={streak}
                onChange={(e) => setStreak(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50 transition-all"
              />
            </div>

            {/* Reminder Toggle */}
            <div className="flex flex-col items-start gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                Reminders
              </label>
              <div className="flex items-center justify-between w-full p-2.5 rounded-xl border border-white/10 bg-slate-900/40 select-none">
                <span className="text-[9px] font-semibold text-slate-500">Alerts</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={reminderEnabled}
                  onClick={() => setReminderEnabled(!reminderEnabled)}
                  className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    reminderEnabled ? 'bg-rose-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      reminderEnabled ? 'translate-x-3' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none flex items-center gap-1">
              <FileText size={10} className="text-rose-400" />
              Notes
            </label>
            <textarea
              placeholder="Habit guidelines, why this matters, etc. (optional)"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500/50 resize-none transition-all"
            />
          </div>

          {/* Validation Warning Box */}
          {validationError && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-[10px] text-rose-300 animate-slide-down flex items-start gap-1.5">
              <AlertCircle size={12} className="shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Validation Error: </span>{validationError}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            {itemToEdit && itemToEdit.id ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(itemToEdit.id);
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
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all duration-150"
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

WellnessModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  itemToEdit: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default WellnessModal;

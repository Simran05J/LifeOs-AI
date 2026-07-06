import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { CalendarRange, Plus, CheckCircle2, Circle, Trash2, Calendar, AlertTriangle } from 'lucide-react';
import EmptyWidgetState from './EmptyWidgetState';
import { getFirebaseAuth } from '../../../services/authService';
import {
  fetchPlannerTasks,
  createPlannerTask,
  updatePlannerTask,
  deletePlannerTask,
} from '../../../services/plannerService';

function PlannerWidget({ data = null, isLoading = false }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal and Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);

  // Form Field States
  const [modalTitle, setModalTitle] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [modalStart, setModalStart] = useState('');
  const [modalEnd, setModalEnd] = useState('');

  // Helper to load tasks from Firestore
  const loadTasks = async (uid) => {
    setLoading(true);
    setError(null);
    try {
      const fetchedTasks = await fetchPlannerTasks(uid);
      setTasks(fetchedTasks);
    } catch (err) {
      console.error('Error fetching planner tasks:', err);
      setError('Unable to fetch tasks. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to auth state changes
  useEffect(() => {
    if (data) {
      setTasks(data);
      setLoading(isLoading);
      return;
    }

    const auth = getFirebaseAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        loadTasks(user.uid);
      } else {
        setTasks([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [data, isLoading]);

  // Open modal for creating a new task
  const openCreateModal = () => {
    setTaskToEdit(null);
    setModalTitle('');
    setModalDesc('');
    setModalStart('');
    setModalEnd('');
    setIsModalOpen(true);
  };

  // Open modal for editing an existing task
  const openEditModal = (task) => {
    const formatToPickerDate = (isoStr) => {
      if (!isoStr) return '';
      return isoStr.split('T')[0];
    };

    setTaskToEdit(task);
    setModalTitle(task.title);
    setModalDesc(task.description || '');
    setModalStart(formatToPickerDate(task.startDate));
    setModalEnd(formatToPickerDate(task.endDate));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTaskToEdit(null);
  };

  // Handle Complete/Incomplete Toggle (with Optimistic Updates)
  const handleToggleTask = async (task) => {
    if (!currentUser) return;
    const originalState = task.completed;

    // Optimistic UI state toggle
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
    );

    try {
      await updatePlannerTask(currentUser.uid, task.id, {
        completed: !originalState,
      });
    } catch (err) {
      console.error('Failed to update task status:', err);
      setError('Failed to update task status.');
      // Revert optimistic change
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: originalState } : t))
      );
    }
  };

  // Form submit handler (both Add & Edit)
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!modalTitle.trim() || !currentUser) return;

    const parsePickerDate = (dateStr) => {
      if (!dateStr) return null;
      return new Date(`${dateStr}T00:00:00`).toISOString();
    };

    const taskPayload = {
      title: modalTitle.trim(),
      description: modalDesc.trim(),
      completed: taskToEdit ? taskToEdit.completed : false,
      startDate: parsePickerDate(modalStart),
      endDate: parsePickerDate(modalEnd),
      source: taskToEdit ? taskToEdit.source : 'manual',
    };

    setError(null);
    closeModal();

    if (taskToEdit) {
      // Edit mode (optimistic update)
      const originalTasks = [...tasks];
      setTasks((prev) =>
        prev.map((t) => (t.id === taskToEdit.id ? { ...t, ...taskPayload } : t))
      );

      try {
        await updatePlannerTask(currentUser.uid, taskToEdit.id, taskPayload);
      } catch (err) {
        console.error('Failed to update planner task:', err);
        setError('Unable to update task. Please try again.');
        setTasks(originalTasks);
      }
    } else {
      // Create mode
      try {
        const newTask = await createPlannerTask(currentUser.uid, taskPayload);
        setTasks((prev) => [newTask, ...prev]);
      } catch (err) {
        console.error('Failed to create planner task:', err);
        setError('Unable to save task. Please try again.');
      }
    }
  };

  // Handle Delete Task (with Optimistic Updates)
  const handleDeleteTask = async (taskId) => {
    if (!currentUser) return;

    const originalTasks = [...tasks];
    // Optimistic UI state removal
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      await deletePlannerTask(currentUser.uid, taskId);
    } catch (err) {
      console.error('Failed to delete planner task:', err);
      setError('Failed to delete task.');
      // Revert optimistic change
      setTasks(originalTasks);
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Sort tasks in memory: Tasks with start dates sorted ascending, then rest by creation date desc
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.startDate && b.startDate) {
      const dateA = new Date(a.startDate).getTime();
      const dateB = new Date(b.startDate).getTime();
      if (dateA !== dateB) return dateA - dateB;
    } else if (a.startDate) {
      return -1;
    } else if (b.startDate) {
      return 1;
    }

    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  const formatDateRange = (startStr, endStr) => {
    if (!startStr && !endStr) return '';
    const options = { month: 'short', day: 'numeric' };

    if (startStr && endStr) {
      const start = new Date(startStr);
      const end = new Date(endStr);
      if (start.toDateString() === end.toDateString()) {
        return start.toLocaleDateString('en-US', options);
      }
      return `${start.toLocaleDateString('en-US', options)} → ${end.toLocaleDateString('en-US', options)}`;
    }

    const singleDate = new Date(startStr || endStr);
    return singleDate.toLocaleDateString('en-US', options);
  };

  const showLoading = loading || isLoading;

  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-glow flex flex-col">
      {/* Widget Header */}
      <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-3 select-none">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-xl bg-violet-500/10 text-violet-400">
            <CalendarRange size={14} />
          </span>
          <h3 className="text-sm font-semibold text-white">Today&apos;s Planner</h3>
        </div>
        <span className="text-[10px] text-slate-500">{today}</span>
      </div>

      {/* Error Alert Box */}
      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 text-[10px] text-red-300">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-white font-bold px-1 select-none">
            ✕
          </button>
        </div>
      )}

      {/* Widget Content */}
      {showLoading ? (
        <div className="space-y-2 py-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      ) : sortedTasks.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
            {sortedTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => openEditModal(task)}
                className={`group flex items-center justify-between gap-2.5 rounded-xl bg-white/3 p-2.5 hover:bg-white/5 border border-white/5 transition-all duration-150 cursor-pointer ${
                  task.completed ? 'opacity-50' : ''
                }`}
              >
                <div className="flex flex-1 items-start gap-2.5 text-left text-xs min-w-0">
                  {/* Complete Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTask(task);
                    }}
                    className="shrink-0 mt-0.5 text-violet-400 outline-none focus-visible:ring-1 focus-visible:ring-violet-500/30"
                  >
                    {task.completed ? (
                      <CheckCircle2 size={15} className="fill-violet-500/10" />
                    ) : (
                      <Circle size={15} />
                    )}
                  </button>

                  {/* Task details */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <span className={`leading-tight block font-medium ${
                      task.completed ? 'text-slate-500 line-through' : 'text-slate-200'
                    }`}>
                      {task.title}
                    </span>

                    {/* Date label */}
                    {(task.startDate || task.endDate) && (
                      <div className="flex items-center gap-1.5 text-[9px] font-medium text-slate-400 select-none">
                        <Calendar size={10} className="text-slate-500" />
                        <span>{formatDateRange(task.startDate, task.endDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 py-2 text-xs font-semibold text-slate-400 hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-violet-300 transition-all duration-150 select-none"
          >
            <Plus size={13} />
            Add Task
          </button>
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col gap-2">
          <EmptyWidgetState
            icon={CalendarRange}
            title="No tasks planned yet"
            description="Get started by scheduling your first task."
            ctaLabel="Add Task"
            onCta={openCreateModal}
          />
        </div>
      )}

      {/* ── Compact Creation / Editing Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <h3 className="text-base font-semibold text-white select-none">
              {taskToEdit ? 'Edit Task' : 'Add Task'}
            </h3>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                  Title <span className="text-violet-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="What needs to be done?"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
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
                  rows={3}
                  value={modalDesc}
                  onChange={(e) => setModalDesc(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-none transition-all"
                />
              </div>

              {/* Start & End Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={modalStart}
                    onChange={(e) => setModalStart(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={modalEnd}
                    onChange={(e) => setModalEnd(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                {taskToEdit ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteTask(taskToEdit.id);
                      closeModal();
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
                    onClick={closeModal}
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
      )}
    </div>
  );
}

PlannerWidget.propTypes = {
  data: PropTypes.array,
  isLoading: PropTypes.bool,
};

export default PlannerWidget;

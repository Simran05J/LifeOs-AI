import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Trash2, MapPin, Calendar, Compass, IndianRupee, FileText } from 'lucide-react';

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

function TravelModal({ isOpen, onClose, tripToEdit, onSave, onDelete }) {
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [transportation, setTransportation] = useState('flight');
  const [accommodation, setAccommodation] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('planned');

  // Validation State
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setValidationError('');
      if (tripToEdit) {
        setDestination(tripToEdit.destination || '');
        setStartDate(tripToEdit.startDate || '');
        setEndDate(tripToEdit.endDate || '');
        setTransportation(tripToEdit.transportation || 'flight');
        setAccommodation(tripToEdit.accommodation || '');
        setBudget(tripToEdit.budget !== undefined ? String(tripToEdit.budget) : '');
        setNotes(tripToEdit.notes || '');
        setStatus(tripToEdit.status || 'planned');
      } else {
        setDestination('');
        setStartDate(getTodayString());
        setEndDate(getTodayString());
        setTransportation('flight');
        setAccommodation('');
        setBudget('');
        setNotes('');
        setStatus('planned');
      }
    }
  }, [isOpen, tripToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!destination.trim()) {
      setValidationError('Destination is required.');
      return;
    }

    if (!startDate) {
      setValidationError('Start date is required.');
      return;
    }

    if (!endDate) {
      setValidationError('End date is required.');
      return;
    }

    // End date cannot be before start date
    const startD = new Date(startDate);
    const endD = new Date(endDate);
    if (endD < startD) {
      setValidationError('End date cannot be before start date.');
      return;
    }

    // Budget cannot be negative
    const numericBudget = budget === '' ? 0 : parseFloat(budget);
    if (isNaN(numericBudget) || numericBudget < 0) {
      setValidationError('Budget cannot be negative.');
      return;
    }

    if (!transportation) {
      setValidationError('Transportation must be selected.');
      return;
    }

    onSave({
      destination: destination.trim(),
      startDate,
      endDate,
      transportation,
      accommodation: accommodation.trim(),
      budget: numericBudget,
      notes: notes.trim(),
      status,
      source: tripToEdit ? tripToEdit.source : 'manual',
      agentGenerated: tripToEdit ? tripToEdit.agentGenerated : false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl backdrop-blur-xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin">
        <h3 className="text-base font-semibold text-white select-none">
          {tripToEdit ? 'Edit Trip' : 'Plan New Trip'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Destination */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none flex items-center gap-1">
              <MapPin size={10} className="text-cyan-400" />
              Destination <span className="text-cyan-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Paris, Tokyo, Goa"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none flex items-center gap-1">
                <Calendar size={10} className="text-cyan-400" />
                Start Date <span className="text-cyan-400">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none flex items-center gap-1">
                <Calendar size={10} className="text-cyan-400" />
                End Date <span className="text-cyan-400">*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>
          </div>

          {/* Transportation and Budget Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Transportation */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none flex items-center gap-1">
                <Compass size={10} className="text-cyan-400" />
                Transportation <span className="text-cyan-400">*</span>
              </label>
              <select
                value={transportation}
                onChange={(e) => setTransportation(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-all"
              >
                <option value="flight">Flight</option>
                <option value="train">Train</option>
                <option value="bus">Bus</option>
                <option value="car">Car</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Budget */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none flex items-center gap-1">
                <IndianRupee size={10} className="text-cyan-400" />
                Budget (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g., 50000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>
          </div>

          {/* Accommodation and Status Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Accommodation */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                Accommodation
              </label>
              <input
                type="text"
                placeholder="e.g., Hilton Hotel"
                value={accommodation}
                onChange={(e) => setAccommodation(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-all"
              >
                <option value="planned">Planned</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none flex items-center gap-1">
              <FileText size={10} className="text-cyan-400" />
              Notes
            </label>
            <textarea
              placeholder="Itinerary info, booking codes, places to visit (optional)"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none transition-all"
            />
          </div>

          {/* Validation Warning Box */}
          {validationError && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-[10px] text-rose-300 animate-slide-down">
              <span className="font-semibold">Validation Error: </span>{validationError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            {tripToEdit ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(tripToEdit.id);
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
                className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-700 shadow-lg shadow-cyan-600/20 transition-all duration-150"
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

TravelModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  tripToEdit: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default TravelModal;

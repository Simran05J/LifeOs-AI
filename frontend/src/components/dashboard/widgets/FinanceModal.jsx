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

function FinanceModal({ isOpen, onClose, transactionToEdit, onSave, onDelete }) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  // Validation State
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setValidationError('');
      if (transactionToEdit) {
        const formatToPickerDate = (isoStr) => {
          if (!isoStr) return '';
          return isoStr.split('T')[0];
        };

        setTitle(transactionToEdit.title);
        setAmount(String(transactionToEdit.amount));
        setType(transactionToEdit.type);
        setCategory(transactionToEdit.category || '');
        setDate(formatToPickerDate(transactionToEdit.transactionDate));
        setNotes(transactionToEdit.note || '');
      } else {
        setTitle('');
        setAmount('');
        setType('expense');
        setCategory('');
        setDate(getTodayString());
        setNotes('');
      }
    }
  }, [isOpen, transactionToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    if (!title.trim()) {
      setValidationError('Title is required.');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setValidationError('Amount must be a positive number.');
      return;
    }

    if (!date) {
      setValidationError('Date is required.');
      return;
    }

    onSave({
      title: title.trim(),
      amount: numericAmount,
      type,
      category: category.trim() || 'Other',
      transactionDate: new Date(`${date}T00:00:00`).toISOString(),
      note: notes.trim(),
      currency: 'INR',
      recurring: transactionToEdit ? transactionToEdit.recurring : false,
      agentGenerated: transactionToEdit ? transactionToEdit.agentGenerated : false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl backdrop-blur-xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin">
        <h3 className="text-base font-semibold text-white select-none">
          {transactionToEdit ? 'Edit Transaction' : 'Log Transaction'}
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
              placeholder="e.g., Grocery Shopping, Salary"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-all"
            />
          </div>

          {/* Amount and Type Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                Amount (₹) <span className="text-violet-400">*</span>
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-all"
              />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                Type <span className="text-violet-400">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50 transition-all"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
          </div>

          {/* Category and Date Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                Category
              </label>
              <input
                type="text"
                placeholder="e.g., Food, Salary, Rent"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-all"
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
                Date <span className="text-violet-400">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50 transition-all"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none">
              Notes
            </label>
            <textarea
              placeholder="Add payment method, store or extra details (optional)"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 resize-none transition-all"
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
            {transactionToEdit ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(transactionToEdit.id);
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

FinanceModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  transactionToEdit: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default FinanceModal;

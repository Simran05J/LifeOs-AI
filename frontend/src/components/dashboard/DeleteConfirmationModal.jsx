import PropTypes from 'prop-types';

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, isDeleting, conversationTitle }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      {/* Modal Container */}
      <div className="relative w-full max-w-md flex flex-col rounded-[24px] border border-white/10 bg-slate-950/95 shadow-[0_25px_80px_rgba(0,0,0,0.9)] p-6 overflow-hidden">
        
        <div className="space-y-3">
          <h3 className="text-base font-bold text-white leading-6">Delete Conversation?</h3>
          
          <div className="rounded-xl bg-white/5 border border-white/5 p-3">
            <p className="text-sm font-semibold text-slate-200 truncate">
              &ldquo;{conversationTitle || 'Untitled Chat'}&rdquo;
            </p>
          </div>
          
          <p className="text-xs text-slate-400 leading-5">
            This action cannot be undone.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-all duration-200 outline-none focus-visible:ring-1 focus-visible:ring-violet-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center justify-center min-w-[70px] rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-600/25 transition-all duration-200 outline-none focus-visible:ring-1 focus-visible:ring-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <span className="h-3 w-3 animate-spin rounded-full border border-white/20 border-t-white" />
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

DeleteConfirmationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  isDeleting: PropTypes.bool,
  conversationTitle: PropTypes.string,
};

/**
 * UpgradeCard — Reusable "Upgrade to Pro" card for the sidebar.
 *
 * Extracted from Sidebar.jsx for reusability and separation of concerns.
 * Design tokens preserved exactly from original Sidebar.jsx.
 *
 * Props:
 *   onUpgrade — () => void — future: navigate to billing / open upgrade modal
 */
import PropTypes from 'prop-types';

function UpgradeCard({ onUpgrade }) {
  return (
    <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/10 p-3 flex items-center justify-between gap-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-violet-200 select-none">
          <span className="text-xs">⭐</span>
          <p className="text-xs font-bold truncate">Upgrade to Pro</p>
        </div>
        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
          Unlock Premium AI
        </p>
      </div>
      <button
        type="button"
        onClick={onUpgrade}
        aria-label="Upgrade to Pro"
        className="shrink-0 rounded-xl bg-white/10 px-2.5 py-1.5 text-[10px] font-bold text-white transition-all duration-200 hover:bg-white/20 outline-none focus-visible:ring-1 focus-visible:ring-violet-500/30"
      >
        Get Pro
      </button>
    </div>
  );
}

UpgradeCard.propTypes = {
  onUpgrade: PropTypes.func,
};

export default UpgradeCard;

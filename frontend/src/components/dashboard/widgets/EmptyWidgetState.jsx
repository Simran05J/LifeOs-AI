/**
 * EmptyWidgetState — Shared empty state for all dashboard widgets.
 *
 * Props:
 *   icon        — Lucide icon component to display
 *   title       — Primary empty-state message
 *   description — Secondary helper text (optional)
 *   ctaLabel    — Call-to-action button label (optional)
 *   onCta       — CTA click handler; future: open modal / trigger AI agent
 *
 * Design: preserves existing violet/slate palette and border-radius tokens.
 */
import PropTypes from 'prop-types';

function EmptyWidgetState({ icon: Icon, title, description, ctaLabel, onCta }) {
  return (
    <div className="flex flex-col items-center justify-center py-5 px-2 text-center select-none">
      {Icon && (
        <div className="mb-3 grid h-10 w-10 place-items-center rounded-2xl bg-violet-500/10 text-violet-400">
          <Icon size={18} />
        </div>
      )}

      <p className="text-sm font-semibold text-slate-300">{title}</p>

      {description && (
        <p className="mt-1.5 max-w-[180px] text-xs leading-relaxed text-slate-500">
          {description}
        </p>
      )}

      {ctaLabel && (
        <button
          type="button"
          onClick={onCta}
          className="mt-3 rounded-full border border-violet-500/25 bg-violet-500/10 px-4 py-1.5 text-xs font-medium text-violet-300 transition-all duration-200 hover:bg-violet-500/20 outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

EmptyWidgetState.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  ctaLabel: PropTypes.string,
  onCta: PropTypes.func,
};

export default EmptyWidgetState;

import PropTypes from 'prop-types';

function TopNavigation({ title = 'Overview', subtitle = 'Your focused workspace' }) {
  return (
    <header className="flex items-center justify-between rounded-[24px] border border-white/10 bg-slate-900/70 px-5 py-4 shadow-[0_20px_50px_rgba(15,23,42,0.35)] backdrop-blur">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-400">LifeOS AI</p>
        <h1 className="mt-1 text-xl font-semibold text-white">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
          {subtitle}
        </div>
        <button type="button" className="rounded-full bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400">
          New briefing
        </button>
      </div>
    </header>
  );
}

TopNavigation.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
};

export default TopNavigation;

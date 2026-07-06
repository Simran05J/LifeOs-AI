import PropTypes from 'prop-types';

function DashboardGreeting({ displayName = null, greetingMessage = null }) {
  const hour = new Date().getHours();

  const greeting =
    hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const emoji = hour < 12 ? '☀️' : hour < 17 ? '👋' : '🌙';

  const name = displayName ?? 'LifeOS AI';

  return (
    <div className="hidden md:flex items-center select-none max-w-2xl">
      <h1 className="text-sm lg:text-base font-bold text-white tracking-tight flex items-center gap-2">
        <span aria-hidden="true" className="text-lg lg:text-xl shrink-0">{emoji}</span>
        <span className="leading-tight">{greetingMessage || `${greeting}, ${name}`}</span>
      </h1>
    </div>
  );
}

DashboardGreeting.propTypes = {
  displayName: PropTypes.string,
  greetingMessage: PropTypes.string,
};

export default DashboardGreeting;

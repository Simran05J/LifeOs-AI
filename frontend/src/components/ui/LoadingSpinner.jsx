import PropTypes from 'prop-types';

function LoadingSpinner({ size = 'md', label = 'Loading' }) {
  const classes = ['ui-spinner', `ui-spinner--${size}`].filter(Boolean).join(' ');

  return (
    <div className="ui-spinner-wrap" role="status" aria-live="polite" aria-label={label}>
      <span className={classes} aria-hidden="true" />
    </div>
  );
}

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  label: PropTypes.string,
};

export default LoadingSpinner;

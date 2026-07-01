import PropTypes from 'prop-types';

function Toast({ title, message, tone = 'neutral', open = true }) {
  if (!open) {
    return null;
  }

  return (
    <div className={['ui-toast', `ui-toast--${tone}`].filter(Boolean).join(' ')} role="status" aria-live="polite">
      <strong>{title}</strong>
      {message ? <p>{message}</p> : null}
    </div>
  );
}

Toast.propTypes = {
  title: PropTypes.string.isRequired,
  message: PropTypes.string,
  tone: PropTypes.oneOf(['neutral', 'success', 'warning', 'error']),
  open: PropTypes.bool,
};

export default Toast;

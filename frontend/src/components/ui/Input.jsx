import PropTypes from 'prop-types';

function Input({ label, error, className = '', ...props }) {
  const inputClasses = ['ui-input', error ? 'ui-input--error' : '', className].filter(Boolean).join(' ');

  return (
    <label className="ui-input-group">
      {label ? <span className="ui-input-label">{label}</span> : null}
      <input className={inputClasses} {...props} />
      {error ? <span className="ui-input-error">{error}</span> : null}
    </label>
  );
}

Input.propTypes = {
  label: PropTypes.string,
  error: PropTypes.string,
  className: PropTypes.string,
};

export default Input;

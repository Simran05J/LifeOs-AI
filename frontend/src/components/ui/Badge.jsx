import PropTypes from 'prop-types';

function Badge({ children, tone = 'neutral', className = '' }) {
  return <span className={['ui-badge', `ui-badge--${tone}`, className].filter(Boolean).join(' ')}>{children}</span>;
}

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  tone: PropTypes.oneOf(['neutral', 'success', 'warning', 'error']),
  className: PropTypes.string,
};

export default Badge;

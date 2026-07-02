import PropTypes from 'prop-types';

function Avatar({ name, size = 'md', src, fallback = 'LA', className = '' }) {
  const classes = ['ui-avatar', `ui-avatar--${size}`, className].filter(Boolean).join(' ');

  if (src) {
    return <img className={classes} src={src} alt={name || 'Avatar'} />;
  }

  return (
    <div className={classes} aria-label={name || 'Avatar'}>
      {fallback}
    </div>
  );
}

Avatar.propTypes = {
  name: PropTypes.string,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  src: PropTypes.string,
  fallback: PropTypes.string,
  className: PropTypes.string,
};

export default Avatar;

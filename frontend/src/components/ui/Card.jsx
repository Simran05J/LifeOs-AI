import PropTypes from 'prop-types';

function Card({ title, subtitle, children, className = '', ...props }) {
  return (
    <section className={['ui-card', className].filter(Boolean).join(' ')} {...props}>
      {(title || subtitle) ? (
        <div className="ui-card__header">
          {title ? <h3 className="ui-card__title">{title}</h3> : null}
          {subtitle ? <p className="ui-card__subtitle">{subtitle}</p> : null}
        </div>
      ) : null}
      <div className="ui-card__body">{children}</div>
    </section>
  );
}

Card.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  children: PropTypes.node,
  className: PropTypes.string,
};

export default Card;

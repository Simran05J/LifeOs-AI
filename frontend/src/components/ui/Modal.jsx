import PropTypes from 'prop-types';

function Modal({ open, title, children, onClose, actions }) {
  if (!open) {
    return null;
  }

  return (
    <div className="ui-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="ui-modal-title">
      <div className="ui-modal">
        <div className="ui-modal__header">
          <h3 id="ui-modal-title">{title}</h3>
          <button type="button" className="ui-modal__close" onClick={onClose} aria-label="Close modal">
            ×
          </button>
        </div>
        <div className="ui-modal__body">{children}</div>
        {actions ? <div className="ui-modal__actions">{actions}</div> : null}
      </div>
    </div>
  );
}

Modal.propTypes = {
  open: PropTypes.bool,
  title: PropTypes.string,
  children: PropTypes.node,
  onClose: PropTypes.func,
  actions: PropTypes.node,
};

export default Modal;

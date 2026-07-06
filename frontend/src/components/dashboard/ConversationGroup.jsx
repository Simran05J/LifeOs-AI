import PropTypes from 'prop-types';
import ConversationItem from './ConversationItem';

export default function ConversationGroup({ label, items, activeId, onSelect, onRename, onDelete }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-1">
      <h4 className="px-2.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest select-none">
        {label}
      </h4>
      <div className="space-y-0.5">
        {items.map((conv) => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isActive={conv.id === activeId}
            onSelect={onSelect}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

ConversationGroup.propTypes = {
  label: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      updatedAt: PropTypes.string.isRequired,
    })
  ).isRequired,
  activeId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  onRename: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

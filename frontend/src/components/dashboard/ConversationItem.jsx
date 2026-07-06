import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { MoreVertical } from 'lucide-react';

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (isNaN(date.getTime())) return dateString;

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function ConversationItem({ conversation, isActive, onSelect, onRename, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  
  // Close dropdown on click outside or Escape press
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(conversation.id)}
      aria-current={isActive ? 'true' : undefined}
      className={`group relative w-full rounded-xl px-3 py-1.5 text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 ${
        isActive
          ? 'bg-violet-500/15 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.3)]'
          : 'hover:bg-white/5'
      }`}
    >
      {/* Title + timestamp */}
      <div className="flex items-start justify-between gap-2 pr-1">
        <p
          className={`flex-1 truncate text-sm font-medium leading-snug ${
            isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'
          }`}
        >
          {conversation.title}
        </p>
        {/* Timestamp — hidden on hover, active state, or when menu is open so action icon can appear */}
        <span className={`shrink-0 text-[10px] text-slate-500 transition-opacity duration-150 ${
          isActive || menuOpen ? 'opacity-0' : 'group-hover:opacity-0'
        }`}>
          {formatRelativeTime(conversation.updatedAt)}
        </span>
      </div>

      {/* Hover/Active action icon — Three-dot context menu */}
      <div
        ref={menuRef}
        className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${
          isActive || menuOpen ? 'flex' : 'hidden group-hover:flex'
        } items-center`}
      >
        <button
          type="button"
          aria-label="Conversation actions"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((prev) => !prev);
          }}
          className={`rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white transition-all duration-150 ${
            menuOpen ? 'bg-white/10 text-white' : ''
          }`}
        >
          <MoreVertical size={14} />
        </button>

        {/* Dropdown Menu */}
        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 z-40 w-36 rounded-xl border border-white/10 bg-slate-900/95 p-1 shadow-xl backdrop-blur-md animate-fade-in">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onRename?.(conversation);
              }}
              className="w-full rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-all duration-150"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onDelete?.(conversation);
              }}
              className="w-full rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold text-red-400 hover:bg-red-500/10 transition-all duration-150"
            >
              Delete Conversation
            </button>
          </div>
        )}
      </div>
    </button>
  );
}

ConversationItem.propTypes = {
  conversation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    updatedAt: PropTypes.string.isRequired,
  }).isRequired,
  isActive: PropTypes.bool,
  onSelect: PropTypes.func,
  onRename: PropTypes.func,
  onDelete: PropTypes.func,
};

export default ConversationItem;


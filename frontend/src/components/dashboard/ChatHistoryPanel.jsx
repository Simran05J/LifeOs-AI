/**
 * ChatHistoryPanel — Viewport-aware list of grouped conversations.
 *
 * Groups conversations dynamically into relative temporal periods (Today, Yesterday,
 * Previous 7 Days, Previous 30 Days, Older) matching the design pattern of ChatGPT.
 */
import { useState } from 'react';
import PropTypes from 'prop-types';
import { MessageSquare } from 'lucide-react';
import ConversationGroup from './ConversationGroup';

const CATEGORIES = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Previous 7 Days' },
  { id: 'last30', label: 'Previous 30 Days' },
  { id: 'older', label: 'Older' },
];

function groupConversations(conversations) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const sevenDaysAgoStart = todayStart - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgoStart = todayStart - 30 * 24 * 60 * 60 * 1000;

  const groups = {
    'Today': [],
    'Yesterday': [],
    'Previous 7 Days': [],
    'Previous 30 Days': [],
    'Older': []
  };

  if (!conversations) return groups;

  conversations.forEach(conv => {
    const dateVal = new Date(conv.updatedAt).getTime();
    if (isNaN(dateVal)) {
      groups['Older'].push(conv);
      return;
    }

    if (dateVal >= todayStart) {
      groups['Today'].push(conv);
    } else if (dateVal >= yesterdayStart) {
      groups['Yesterday'].push(conv);
    } else if (dateVal >= sevenDaysAgoStart) {
      groups['Previous 7 Days'].push(conv);
    } else if (dateVal >= thirtyDaysAgoStart) {
      groups['Previous 30 Days'].push(conv);
    } else {
      groups['Older'].push(conv);
    }
  });

  return groups;
}

function ChatHistoryPanel({
  loading = false,
  conversations = [],
  activeId = null,
  onSelect,
  onRename,
  onDelete,
}) {
  const [localActiveId, setLocalActiveId] = useState(activeId);

  const handleSelect = (id) => {
    setLocalActiveId(id);
    onSelect?.(id);
  };

  const isEmpty = !conversations || conversations.length === 0;

  // Group conversations dynamically based on ISO date strings
  const grouped = groupConversations(conversations);

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Section Label: Pinned Top */}
      <div className="shrink-0 pb-2">
        <p className="px-1 text-[9px] font-bold uppercase tracking-[0.25em] text-slate-500 select-none">
          Recent search history
        </p>
      </div>

      {/* Scrollable conversation list / loading / empty states */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin space-y-3 pr-1 mt-1 scroll-smooth">
        {loading ? (
          /* Pulsing loading skeleton for history list */
          <div className="space-y-4 animate-pulse px-1 py-2 select-none">
            <div className="space-y-2">
              <div className="h-2 w-12 rounded bg-slate-800" />
              <div className="h-8 rounded-xl bg-slate-900/60" />
            </div>
            <div className="space-y-2">
              <div className="h-2 w-16 rounded bg-slate-800" />
              <div className="h-8 rounded-xl bg-slate-900/60" />
              <div className="h-8 rounded-xl bg-slate-900/60" />
            </div>
          </div>
        ) : isEmpty ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-8 text-center select-none animate-fade-in">
            <div className="mb-2.5 grid h-9 w-9 place-items-center rounded-2xl bg-white/5 text-slate-500">
              <MessageSquare size={16} />
            </div>
            <p className="text-xs font-semibold text-slate-500">No conversations yet</p>
            <p className="mt-1 text-[10px] text-slate-600">
              Launch a new chat to begin.
            </p>
          </div>
        ) : (
          CATEGORIES.map((cat) => {
            const items = grouped[cat.label] || [];
            if (items.length === 0) return null; // do not render empty temporal headers
            return (
              <ConversationGroup
                key={cat.id}
                label={cat.label}
                items={items}
                activeId={activeId ?? localActiveId}
                onSelect={handleSelect}
                onRename={onRename}
                onDelete={onDelete}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

ChatHistoryPanel.propTypes = {
  loading: PropTypes.bool,
  conversations: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      updatedAt: PropTypes.string.isRequired,
    })
  ),
  activeId: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  onRename: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default ChatHistoryPanel;

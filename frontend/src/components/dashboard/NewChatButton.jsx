import PropTypes from 'prop-types';
import { MessageSquarePlus } from 'lucide-react';

export default function NewChatButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Start a new chat"
      className="flex w-full items-center gap-2.5 rounded-2xl border border-dashed border-white/15 bg-white/3 px-3.5 py-2.5 text-xs font-semibold text-slate-400 transition-all duration-200 hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-violet-300 outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 select-none"
    >
      <MessageSquarePlus size={15} className="shrink-0" />
      New Chat
    </button>
  );
}

NewChatButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

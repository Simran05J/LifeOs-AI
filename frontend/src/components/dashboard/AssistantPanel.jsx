/**
 * AssistantPanel — Minimal Primary Workspace container for LifeOS AI.
 *
 * Renders the centered conversation flow (Chat.tsx) and forwards the active session.
 */
import PropTypes from 'prop-types';
import Chat from '../Chat/Chat';

function AssistantPanel({ sessionId = null, onConversationCreated }) {
  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0">
        <Chat sessionId={sessionId} onConversationCreated={onConversationCreated} />
      </div>
    </div>
  );
}

AssistantPanel.propTypes = {
  sessionId: PropTypes.string,
  onConversationCreated: PropTypes.func,
};

export default AssistantPanel;

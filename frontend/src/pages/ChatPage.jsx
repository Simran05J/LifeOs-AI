import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';

const initialMessages = [
  {
    id: 1,
    sender: 'ai',
    text: 'Hello! I am your LifeOS AI assistant. How can I help today?',
  },
  {
    id: 2,
    sender: 'user',
    text: 'Help me plan my day and keep track of reminders.',
  },
];

function ChatPage({ initialMessagesProp = initialMessages }) {
  const [messages, setMessages] = useState(initialMessagesProp);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing]);

  const handleSend = (event) => {
    event.preventDefault();
    const trimmed = draft.trim();

    if (!trimmed) {
      return;
    }

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: trimmed,
    };

    setMessages((current) => [...current, userMessage]);
    setDraft('');
    setTyping(true);

    window.setTimeout(() => {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: 'I am ready to help with that next step.',
        },
      ]);
      setTyping(false);
    }, 800);
  };

  const placeholder = useMemo(() => 'Ask LifeOS AI anything...', []);

  return (
    <div className="chat-page">
      <Card className="chat-card" title="Assistant chat" subtitle="Conversation-first interface">
        <div className="chat-thread" aria-live="polite">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-bubble chat-bubble--${message.sender}`}
            >
              <div className="chat-bubble__content">{message.text}</div>
            </div>
          ))}

          {typing ? (
            <div className="chat-bubble chat-bubble--ai">
              <div className="chat-bubble__content chat-bubble__content--typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        <form className="chat-composer" onSubmit={handleSend}>
          <Button type="button" variant="secondary" className="chat-icon-button" aria-label="Start voice input">
            🎤
          </Button>

          <Input
            className="chat-input"
            placeholder={placeholder}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />

          <Button type="submit" className="chat-send-button">Send</Button>
        </form>
      </Card>
    </div>
  );
}

ChatPage.propTypes = {
  initialMessagesProp: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      sender: PropTypes.oneOf(['user', 'ai']).isRequired,
      text: PropTypes.string.isRequired,
    }),
  ),
};

export default ChatPage;

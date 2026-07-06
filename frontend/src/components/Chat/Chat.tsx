/**
 * Chat.tsx — Conversation-first AI chat workspace for LifeOS AI.
 *
 * Implements a centered, clean layout inspired by ChatGPT/Claude:
 *   - Chat log messages permanently stored and loaded from Firestore
 *   - User messages saved immediately before AI call completes
 *   - AI responses saved upon successful API promise resolution
 */

import { useEffect, useRef, useState } from 'react';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseAuth } from '../../services/authService';
import {
  sendChatMessage,
  fetchChatMessages,
  saveChatMessage,
  updateChatSessionMetadata,
} from '../../services/chatService';
import type { ChatMessage } from '../../types/chat';
import MessageList from './MessageList';
import ChatComposer from './ChatComposer';
import { chatActionHandler } from '../../services/chatActionHandler';

function nowTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface ChatProps {
  initialMessages?: ChatMessage[];
  sessionId?: string | null;
  className?: string;
  onConversationCreated?: (newSessionId: string) => void;
}

const DEFAULT_MESSAGES: ChatMessage[] = [];

export default function Chat({
  initialMessages = DEFAULT_MESSAGES,
  sessionId = null,
  className = '',
  onConversationCreated,
}: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(sessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auth user state
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Sync ref with prop changes
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Load chat messages asynchronously from Firestore on selection
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && sessionId) {
        setLoadingMessages(true);
        setError(null);
        try {
          const msgs = await fetchChatMessages(user.uid, sessionId);
          setMessages(msgs);
        } catch (err) {
          console.error('Failed to load chat messages:', err);
          setError('Failed to load conversation history.');
        } finally {
          setLoadingMessages(false);
        }
      } else {
        setMessages([]);
        setLoadingMessages(false);
      }
    });
    return () => unsubscribe();
  }, [sessionId]);

  // Auto-scroll to the latest message
  useEffect(() => {
    if (!loadingMessages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, loadingMessages]);

  const handleSend = async (e?: React.FormEvent, promptValue?: string) => {
    e?.preventDefault();
    const finalVal = promptValue !== undefined ? promptValue : inputVal;
    const trimmed = finalVal.trim();
    if (!trimmed || isLoading || loadingMessages || !currentUser) return;

    setError(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      time: nowTime(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
    setIsLoading(true);

    const isFirstMessage = !sessionIdRef.current;

    try {
      // Save User message immediately to Firestore if session is active (non-blocking for AI call)
      if (!isFirstMessage) {
        const activeSessionId = sessionIdRef.current!;
        try {
          await saveChatMessage(currentUser.uid, activeSessionId, userMsg.id.toString(), 'user', trimmed);
          await updateChatSessionMetadata(currentUser.uid, activeSessionId, trimmed, 1);
        } catch (dbErr) {
          console.error('Failed to save user message to Firestore:', dbErr);
          // Don't crash the UI; keep trying to fetch the AI response
        }
      }

      // Send message to backend API to trigger AI processing and get session ID
      const chatResponse = await sendChatMessage(trimmed, sessionIdRef.current);
      
      // Process backend actions/side-effects reactively
      if (chatResponse.actions_executed) {
        chatActionHandler.processActions(currentUser.uid, chatResponse.actions_executed);
      }
      
      const aiMsg: ChatMessage = {
        id: chatResponse.response_id,
        sender: 'assistant',
        text: chatResponse.message,
        time: nowTime(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      // If this is the first message, create the Firestore session document and save both messages
      if (isFirstMessage) {
        const db = getFirestore();
        const sessionRef = doc(db, 'users', currentUser.uid, 'chat_sessions', chatResponse.session_id);
        const title = trimmed.length > 40 ? trimmed.substring(0, 37) + '...' : trimmed;

        // Save session document
        await setDoc(sessionRef, {
          title,
          started_at: serverTimestamp(),
          created_at: serverTimestamp(),
          createdAt: serverTimestamp(),
          last_message: chatResponse.message,
          lastMessage: chatResponse.message,
          updated_at: serverTimestamp(),
          updatedAt: serverTimestamp(),
          message_count: 2,
          messageCount: 2,
        });

        // Save both messages to the newly established session
        await saveChatMessage(currentUser.uid, chatResponse.session_id, userMsg.id.toString(), 'user', trimmed);
        await saveChatMessage(currentUser.uid, chatResponse.session_id, chatResponse.response_id, 'assistant', chatResponse.message);

        // Notify Dashboard to refresh sidebar and select the new session
        onConversationCreated?.(chatResponse.session_id);
      } else {
        // Save Assistant response and update session metadata
        const activeSessionId = sessionIdRef.current!;
        try {
          await saveChatMessage(currentUser.uid, activeSessionId, chatResponse.response_id, 'assistant', chatResponse.message);
          await updateChatSessionMetadata(currentUser.uid, activeSessionId, chatResponse.message, 1);
        } catch (dbErr) {
          console.error('Failed to save AI response to Firestore:', dbErr);
        }
      }

      // Update session ID reference
      sessionIdRef.current = chatResponse.session_id;

    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromptClick = (promptText: string) => {
    handleSend(undefined, promptText);
  };

  return (
    <div className={`flex flex-col h-full ${className}`} role="log" aria-label="Chat Area">
      {loadingMessages ? (
        /* Sleek Loading Spinner */
        <div className="flex-1 flex items-center justify-center select-none">
          <div className="flex flex-col items-center gap-3">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-violet-500/20 border-t-violet-500" />
            <span className="text-[11px] text-slate-500 font-semibold tracking-wider uppercase">Loading conversation…</span>
          </div>
        </div>
      ) : (
        <MessageList
          messages={messages}
          isLoading={isLoading}
          error={error}
          messagesEndRef={messagesEndRef}
          onPromptClick={handlePromptClick}
        />
      )}

      <ChatComposer
        inputVal={inputVal}
        setInputVal={setInputVal}
        onSubmit={handleSend}
        isLoading={isLoading || loadingMessages}
        onVoiceToggle={() => {
          /* Speech to Text trigger ready */
        }}
        onAttach={() => {
          /* File Attachment trigger ready */
        }}
      />
    </div>
  );
}
export type { ChatProps };
export { Chat };

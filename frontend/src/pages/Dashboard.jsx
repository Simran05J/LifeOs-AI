/**
 * Dashboard.jsx — Protected dashboard page for LifeOS AI.
 *
 * Layout: three-column (managed by AppLayout):
 *   Left   → Sidebar with ChatHistoryPanel (backed by Firestore)
 *   Center → AssistantPanel (full-height AI chat loading active session messages)
 *   Right  → RightWidgetColumn (Planner, Reminders, Finance, Travel, Wellness, Quick Actions)
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import AppLayout from '../layouts/AppLayout';
import AgentSidebar from '../components/dashboard/AgentSidebar';
import CommandBar from '../components/Chat/CommandBar';
import ChatPanel from '../components/Chat/ChatPanel';
import ToastManager from '../components/ui/ToastManager';
import ReminderAlertDialog from '../components/ui/ReminderAlertDialog';
import { getFirebaseAuth } from '../services/authService';
import { fetchChatSessions, deleteChatSession, saveChatMessage, updateChatSessionMetadata, sendChatMessage, fetchChatMessages } from '../services/chatService';
import { chatActionHandler } from '../services/chatActionHandler';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import DeleteConfirmationModal from '../components/dashboard/DeleteConfirmationModal';
import { subscribeDashboardData } from '../services/dashboardEngine';
import NotificationDrawer from '../components/notifications/NotificationDrawer';
import {
  subscribeNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  initNotificationListeners,
} from '../services/notificationService';
import { eventBus } from '../services/eventBus';

function Dashboard() {
  const [chatKey, setChatKey] = useState(0);
  const handleRefresh = () => setChatKey((k) => k + 1);

  // Authenticated user & Firestore conversations state
  const [currentUser, setCurrentUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [loadingChats, setLoadingChats] = useState(true);

  // Chat Conversation State (lifted from CommandBar)
  const [messages, setMessages] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [latestResponse, setLatestResponse] = useState(null);
  const sessionIdRef = useRef(activeConvId);

  // Sync activeConvId to sessionIdRef
  useEffect(() => {
    sessionIdRef.current = activeConvId;
    if (activeConvId && currentUser) {
      setLoadingHistory(true);
      fetchChatMessages(currentUser.uid, activeConvId)
        .then((msgs) => setMessages(msgs))
        .catch((err) => console.error('[Dashboard] Failed to load history:', err))
        .finally(() => setLoadingHistory(false));
    } else {
      setMessages([]);
    }
  }, [activeConvId, currentUser]);

  // Dashboard Aggregation State
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Notification State
  const [notifications, setNotifications]         = useState([]);
  const [notifDrawerOpen, setNotifDrawerOpen]     = useState(false);
  const notifListenerCleanupRef                   = useRef(null);

  // Deletion States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [convToDelete, setConvToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  // Active Reminder Alert (snooze/stop dialog)
  const [activeAlert, setActiveAlert] = useState(null);

  // Subscribe to central DashboardEngine
  useEffect(() => {
    if (!currentUser) {
      setDashboardData(null);
      setDashboardLoading(true);
      return;
    }

    const unsubscribe = subscribeDashboardData(
      currentUser.uid,
      currentUser.displayName,
      (data, isLoading) => {
        setDashboardData(data);
        setDashboardLoading(isLoading);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Subscribe to reminder:triggered events to show alert dialog
  useEffect(() => {
    if (!currentUser) return;
    const unsub = eventBus.subscribe('reminder:triggered', (payload) => {
      if (payload.userId !== currentUser.uid) return;
      // Only show one alert at a time (latest reminder wins)
      setActiveAlert(payload.reminder);
    });
    return () => unsub();
  }, [currentUser]);

  // Helper to query and refresh conversations list from Firestore
  const refreshConversations = async (userId, newActiveId = null) => {
    try {
      const sessions = await fetchChatSessions(userId);
      setConversations(sessions);
      if (newActiveId) {
        setActiveConvId(newActiveId);
      } else if (sessions.length > 0 && !activeConvId) {
        setActiveConvId(sessions[0].id);
      }
    } catch (err) {
      console.error('Failed to load user chat sessions from Firestore:', err);
    }
  };

  // Fetch user conversations on auth resolution
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);

      // Clean up previous notification listener when user changes
      if (notifListenerCleanupRef.current) {
        notifListenerCleanupRef.current();
        notifListenerCleanupRef.current = null;
      }

      if (user) {
        setLoadingChats(true);
        await refreshConversations(user.uid);
        setLoadingChats(false);

        // Initialise event-broker → Firestore notification listeners
        const cleanupEventListeners = initNotificationListeners(user.uid);

        // Subscribe to real-time Firestore notification stream
        const cleanupFirestoreStream = subscribeNotifications(user.uid, (notifs) => {
          setNotifications(notifs);
        });

        // Store combined cleanup
        notifListenerCleanupRef.current = () => {
          cleanupEventListeners();
          cleanupFirestoreStream();
        };
      } else {
        setConversations([]);
        setActiveConvId(null);
        setLoadingChats(false);
        setNotifications([]);
      }
    });
    return () => {
      unsubscribeAuth();
      if (notifListenerCleanupRef.current) {
        notifListenerCleanupRef.current();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toast Auto-Dismiss
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Handle New Chat: resets the active session to show the welcome screen
  const handleNewChat = () => {
    setActiveConvId(null);
    handleRefresh();
  };

  // Handle selecting an existing conversation
  const handleSelectConv = (id) => {
    setActiveConvId(id);
    handleRefresh();
  };

  // Triggered when a new conversation gets created on the first message
  const handleConversationCreated = async (newSessionId) => {
    if (!currentUser) return;
    await refreshConversations(currentUser.uid, newSessionId);
  };

  // Click on context menu delete
  const handleDeleteClick = (conversation) => {
    setConvToDelete(conversation);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete within the modal
  const handleConfirmDelete = async () => {
    if (!convToDelete) return;
    setIsDeleting(true);
    try {
      await deleteChatSession(convToDelete.id);

      // Instantly remove conversation from sidebar (prevent full reload)
      setConversations((prev) => prev.filter((c) => c.id !== convToDelete.id));

      // Handle active conversation cleanup if the deleted one was currently open
      if (activeConvId === convToDelete.id) {
        setActiveConvId(null);
        handleRefresh();
      }

      setToast({ type: 'success', message: 'Conversation deleted successfully.' });
      setIsDeleteModalOpen(false);
      setConvToDelete(null);
    } catch (err) {
      console.error('Failed to delete chat:', err);
      // Close the modal on failure and notify the user
      setIsDeleteModalOpen(false);
      setConvToDelete(null);
      setToast({ type: 'error', message: 'Unable to delete conversation. Please try again.' });
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Notification Handlers ────────────────────────────────────────────────
  const handleMarkRead = useCallback(async (notifId) => {
    if (!currentUser) return;
    try {
      await markNotificationRead(currentUser.uid, notifId);
    } catch (err) {
      console.error('[Dashboard] markNotificationRead failed:', err);
    }
  }, [currentUser]);

  const handleMarkAllRead = useCallback(async () => {
    if (!currentUser) return;
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    try {
      await markAllNotificationsRead(currentUser.uid, unreadIds);
    } catch (err) {
      console.error('[Dashboard] markAllNotificationsRead failed:', err);
    }
  }, [currentUser, notifications]);

  const handleDeleteNotif = useCallback(async (notifId) => {
    if (!currentUser) return;
    try {
      await deleteNotification(currentUser.uid, notifId);
    } catch (err) {
      console.error('[Dashboard] deleteNotification failed:', err);
    }
  }, [currentUser]);

  const handleBellClick = useCallback(() => {
    setNotifDrawerOpen((prev) => !prev);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Build the sidebar props bundle to pass down
  const sidebarProps = {
    conversations,
    activeConvId,
    loadingChats,
    onNewChat: handleNewChat,
    onSelectConv: handleSelectConv,
    onRenameConv: () => {
      /* Not implemented in this sprint task */
    },
    onDeleteConv: handleDeleteClick,
  };

  // ── Centralised Chat Logic ──────────────────────────────────────────────
  const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const extractConfirmation = (message, actionsExecuted) => {
    if (actionsExecuted && actionsExecuted.length > 0) {
      const labels = actionsExecuted.map((a) => {
        const emoji =
          a.entity_type === 'task' ? '📋' :
          a.entity_type === 'reminder' ? '⏰' :
          a.entity_type === 'expense' ? '💰' :
          a.entity_type === 'trip' ? '✈️' :
          a.entity_type === 'wellness' ? '🧘' : '✨';
        return `${emoji} ${a.title || a.entity_type}`;
      });
      return labels.join(' · ');
    }
    if (message && message.length > 120) {
      return message.substring(0, 117) + '…';
    }
    return message || '';
  };

  const handleSendMessage = async (trimmed) => {
    if (!currentUser) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      time: nowTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);
    setLatestResponse(null);

    const isFirstMessage = !sessionIdRef.current;

    try {
      // Save user message if session exists
      if (!isFirstMessage) {
        try {
          await saveChatMessage(currentUser.uid, sessionIdRef.current, userMsg.id, 'user', trimmed);
          await updateChatSessionMetadata(currentUser.uid, sessionIdRef.current, trimmed, 1);
        } catch (dbErr) {
          console.error('[Dashboard] Failed to save user message:', dbErr);
        }
      }

      // Send to AI backend
      const chatResponse = await sendChatMessage(trimmed, sessionIdRef.current);

      // Process backend actions
      if (chatResponse.actions_executed) {
        chatActionHandler.processActions(currentUser.uid, chatResponse.actions_executed);
        // Show toast for each action
        chatResponse.actions_executed.forEach((action) => {
          const label =
            action.entity_type === 'task' ? 'Task created' :
            action.entity_type === 'reminder' ? 'Reminder set' :
            action.entity_type === 'expense' ? 'Expense logged' :
            action.entity_type === 'trip' ? 'Trip planned' :
            action.entity_type === 'wellness' ? 'Activity logged' : 'Action completed';
          // Using global toast
          import('../components/ui/ToastManager').then(({ showToast }) => {
            showToast(`✓ ${label}: ${action.title || ''}`, 'success');
          });
        });
      }

      const aiMsg = {
        id: chatResponse.response_id,
        sender: 'assistant',
        text: chatResponse.message,
        time: nowTime(),
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Show latest response bubble
      const responseText = extractConfirmation(chatResponse.message, chatResponse.actions_executed);
      setLatestResponse({
        text: responseText,
        hasActions: !!(chatResponse.actions_executed && chatResponse.actions_executed.length > 0),
      });

      // Auto-dismiss response bubble
      setTimeout(() => setLatestResponse(null), 8000);

      // Firestore session handling
      if (isFirstMessage) {
        const db = getFirestore();
        const sessionRef = doc(db, 'users', currentUser.uid, 'chat_sessions', chatResponse.session_id);
        const title = trimmed.length > 40 ? trimmed.substring(0, 37) + '...' : trimmed;

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

        await saveChatMessage(currentUser.uid, chatResponse.session_id, userMsg.id, 'user', trimmed);
        await saveChatMessage(currentUser.uid, chatResponse.session_id, chatResponse.response_id, 'assistant', chatResponse.message);

        handleConversationCreated(chatResponse.session_id);
      } else {
        try {
          await saveChatMessage(currentUser.uid, sessionIdRef.current, chatResponse.response_id, 'assistant', chatResponse.message);
          await updateChatSessionMetadata(currentUser.uid, sessionIdRef.current, chatResponse.message, 1);
        } catch (dbErr) {
          console.error('[Dashboard] Failed to save AI response:', dbErr);
        }
      }

      sessionIdRef.current = chatResponse.session_id;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Something went wrong';
      import('../components/ui/ToastManager').then(({ showToast }) => showToast(errorMsg, 'error'));
      setLatestResponse({ text: `⚠ ${errorMsg}`, hasActions: false });
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <>
      {/* Reminder Alert Dialog — shown when a scheduled reminder fires */}
      {activeAlert && currentUser && (
        <ReminderAlertDialog
          reminder={activeAlert}
          userId={currentUser.uid}
          onDismiss={() => setActiveAlert(null)}
        />
      )}

      <AppLayout
        sidebarProps={sidebarProps}
        greetingMessage={dashboardData?.greetingMessage}
        unreadCount={unreadCount}
        onBellClick={handleBellClick}
        rightContent={
          <AgentSidebar
            tasks={dashboardData?.tasks}
            reminders={dashboardData?.reminders}
            transactions={dashboardData?.transactions}
            trips={dashboardData?.trips}
            wellnessItems={dashboardData?.wellnessItems}
            isLoading={dashboardLoading}
          />
        }
      >
        <div className="flex-1 flex flex-col min-h-0 relative h-full">
          {/* Chat History */}
          <ChatPanel messages={messages} loadingHistory={loadingHistory} />
          
          {/* Docked Command Bar */}
          <CommandBar
            key={`${activeConvId}-${chatKey}`}
            onSendMessage={handleSendMessage}
            isLoading={isChatLoading}
            latestResponse={latestResponse}
            onClearResponse={() => setLatestResponse(null)}
          />
          
          <ToastManager />
        </div>
      </AppLayout>

      {/* Notification Center Drawer */}
      <NotificationDrawer
        isOpen={notifDrawerOpen}
        onClose={() => setNotifDrawerOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onDelete={handleDeleteNotif}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setConvToDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        conversationTitle={convToDelete?.title}
      />

      {/* Toast Feedback notifications */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-300 animate-slide-up ${
          toast.type === 'success' 
            ? 'border-emerald-500/20 bg-slate-900/90 text-emerald-300' 
            : 'border-red-500/20 bg-slate-900/90 text-red-300'
        }`}>
          <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
          <div className="flex-1 space-y-0.5">
            <p className="text-xs font-semibold text-white">{toast.type === 'success' ? 'Deleted' : 'Delete Failed'}</p>
            <p className="text-[10px] text-slate-400">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-500 hover:text-white transition-colors duration-150 text-xs px-1.5 font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

export default Dashboard;


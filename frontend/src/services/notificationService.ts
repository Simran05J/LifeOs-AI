import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { Reminder } from '../types/reminder';
import { ReminderEngine } from './reminderEngine';
import { NotificationItem } from '../types/notification';
import { eventBus } from './eventBus';
import type { PlannerTask, FinanceTransaction, Trip, WellnessItem } from '../types/events';
import { getTransactions } from './financeService';

/**
 * Helper to get local date string YYYY-MM-DD.
 */
function getLocalDateString(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Maps Firestore document data to NotificationItem.
 */
function mapDocToNotification(docId: string, data: any): NotificationItem {
  const mapTimestamp = (val: any) => {
    if (val && typeof val.toDate === 'function') {
      return val.toDate().toISOString();
    }
    return val || new Date().toISOString();
  };

  return {
    id: docId,
    title: data.title || '',
    message: data.message || '',
    category: data.category || 'system',
    priority: data.priority || 'low',
    read: !!data.read,
    createdAt: mapTimestamp(data.createdAt),
    source: data.source || 'system',
  };
}

/**
 * Fetches all notifications for a user.
 */
export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  const db = getFirestore();
  const ref = collection(db, 'users', userId, 'notifications');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);

  const notifications: NotificationItem[] = [];
  snap.forEach((doc) => {
    notifications.push(mapDocToNotification(doc.id, doc.data()));
  });
  return notifications;
}

/**
 * Subscribes to real-time notification updates.
 */
export function subscribeNotifications(
  userId: string,
  callback: (notifications: NotificationItem[]) => void
): () => void {
  const db = getFirestore();
  const ref = collection(db, 'users', userId, 'notifications');
  const q = query(ref, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snap) => {
    const notifications: NotificationItem[] = [];
    snap.forEach((doc) => {
      notifications.push(mapDocToNotification(doc.id, doc.data()));
    });
    callback(notifications);
  }, (err) => {
    console.error('[NotificationService] Subscription error:', err);
  });
}

/**
 * Creates a notification in Firestore.
 */
export async function createNotification(
  userId: string,
  notification: Omit<NotificationItem, 'id' | 'createdAt'>
): Promise<NotificationItem> {
  const db = getFirestore();
  const ref = collection(db, 'users', userId, 'notifications');

  const docData = {
    title: notification.title,
    message: notification.message,
    category: notification.category,
    priority: notification.priority,
    read: !!notification.read,
    createdAt: serverTimestamp(),
    source: notification.source,
  };

  const docRef = await addDoc(ref, docData);

  return {
    id: docRef.id,
    ...notification,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Marks a notification as read.
 */
export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  const db = getFirestore();
  const docRef = doc(db, 'users', userId, 'notifications', notificationId);
  await updateDoc(docRef, { read: true });
}

/**
 * Marks all notifications as read.
 */
export async function markAllNotificationsRead(userId: string, notificationIds: string[]): Promise<void> {
  const db = getFirestore();
  const batch = writeBatch(db);

  notificationIds.forEach((id) => {
    const docRef = doc(db, 'users', userId, 'notifications', id);
    batch.update(docRef, { read: true });
  });

  await batch.commit();
}

/**
 * Deletes a notification.
 */
export async function deleteNotification(userId: string, notificationId: string): Promise<void> {
  const db = getFirestore();
  const docRef = doc(db, 'users', userId, 'notifications', notificationId);
  await deleteDoc(docRef);
}

/**
 * Subscribes to eventBroker events and generates notifications reactively.
 * Returns a cleanup function to unsubscribe.
 */
export function initNotificationListeners(userId: string): () => void {
  const cleanups: (() => void)[] = [];

  // Helper to check for existing unread notifications of same category/message today
  const checkDuplicateToday = async (category: string, message: string) => {
    const list = await getNotifications(userId);
    const todayStr = getLocalDateString();
    return list.some(
      (n) =>
        !n.read &&
        n.category === category &&
        n.message === message &&
        n.createdAt.startsWith(todayStr)
    );
  };

  // 1. Planner — task created or updated
  const unsubPlannerCreated = eventBus.on('planner:task:created', async (data: { userId: string; task: PlannerTask }) => {
    if (data.userId !== userId) return;
    const task = data.task;
    if (task.completed) return;

    const tomorrowStr = getLocalDateString(new Date(Date.now() + 86400000));
    const isDueTomorrow =
      (task.startDate && task.startDate.startsWith(tomorrowStr)) ||
      (task.endDate && task.endDate.startsWith(tomorrowStr));

    if (isDueTomorrow) {
      const msg = `Task "${task.title}" is due tomorrow.`;
      const duplicate = await checkDuplicateToday('planner', msg);
      if (!duplicate) {
        await createNotification(userId, {
          title: 'Task due tomorrow',
          message: msg,
          category: 'planner',
          priority: 'medium',
          read: false,
          source: 'system',
        });
      }
    }
  });
  cleanups.push(unsubPlannerCreated);

  const unsubPlannerUpdated = eventBus.on('planner:task:updated', async (data: { userId: string; task: PlannerTask }) => {
    if (data.userId !== userId) return;
    const task = data.task;
    if (task.completed) return;

    const tomorrowStr = getLocalDateString(new Date(Date.now() + 86400000));
    const isDueTomorrow =
      (task.startDate && task.startDate.startsWith(tomorrowStr)) ||
      (task.endDate && task.endDate.startsWith(tomorrowStr));

    if (isDueTomorrow) {
      const msg = `Task "${task.title}" is due tomorrow.`;
      const duplicate = await checkDuplicateToday('planner', msg);
      if (!duplicate) {
        await createNotification(userId, {
          title: 'Task due tomorrow',
          message: msg,
          category: 'planner',
          priority: 'medium',
          read: false,
          source: 'system',
        });
      }
    }
  });
  cleanups.push(unsubPlannerUpdated);

  // 2. Reminder Event
  const unsubReminder = eventBus.on('reminder:triggered', async (data: { userId: string; reminder: Reminder }) => {
    if (data.userId !== userId) return;
    const rem = data.reminder;

    const formatTimeTo12Hour = (timeStr: string) => {
      const [h, m] = timeStr.split(':');
      let hour = parseInt(h, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12;
      if (hour === 0) hour = 12;
      return `${hour}:${m} ${ampm}`;
    };

    const msg = `${rem.title} ${formatTimeTo12Hour(rem.time)}`;
    await createNotification(userId, {
      title: 'Reminder',
      message: msg,
      category: 'reminder',
      priority: 'medium',
      read: false,
      source: 'system',
    });
  });
  cleanups.push(unsubReminder);

  // 3. Finance — transaction created
  const unsubFinanceCreated = eventBus.on('finance:transaction:created', async (data: { userId: string; transaction: FinanceTransaction }) => {
    if (data.userId !== userId) return;
    const tx = data.transaction;
    if (tx.type !== 'expense') return;

    // Fetch all transactions to sum today's total expenses
    const txs = await getTransactions(userId);
    const todayStr = getLocalDateString();
    const totalSpent = txs
      .filter((t) => t.type === 'expense' && t.transactionDate.startsWith(todayStr))
      .reduce((sum, t) => sum + t.amount, 0);

    const message = `You spent ₹${totalSpent} today.`;

    // Check if there is an existing unread finance notification today to update it
    const allNotifications = await getNotifications(userId);
    const existingNotification = allNotifications.find(
      (n) =>
        !n.read &&
        n.category === 'finance' &&
        n.title === 'Finance' &&
        n.createdAt.startsWith(todayStr)
    );

    if (existingNotification && existingNotification.id) {
      const db = getFirestore();
      const docRef = doc(db, 'users', userId, 'notifications', existingNotification.id);
      await updateDoc(docRef, { message, createdAt: serverTimestamp() });
    } else {
      await createNotification(userId, {
        title: 'Finance',
        message,
        category: 'finance',
        priority: 'medium',
        read: false,
        source: 'system',
      });
    }
  });
  cleanups.push(unsubFinanceCreated);

  // 3b. Finance — transaction updated (re-tally today's total)
  const unsubFinanceUpdated = eventBus.on('finance:transaction:updated', async (data: { userId: string; transaction: FinanceTransaction }) => {
    if (data.userId !== userId) return;
    const tx = data.transaction;
    if (tx.type !== 'expense') return;

    const txs = await getTransactions(userId);
    const todayStr = getLocalDateString();
    const totalSpent = txs
      .filter((t: FinanceTransaction) => t.type === 'expense' && t.transactionDate.startsWith(todayStr))
      .reduce((sum: number, t: FinanceTransaction) => sum + t.amount, 0);

    const message = `You spent ₹${totalSpent} today.`;
    const allNotifications = await getNotifications(userId);
    const existingNotification = allNotifications.find(
      (n) => !n.read && n.category === 'finance' && n.title === 'Finance' && n.createdAt.startsWith(todayStr)
    );

    if (existingNotification && existingNotification.id) {
      const db = getFirestore();
      const docRef = doc(db, 'users', userId, 'notifications', existingNotification.id);
      await updateDoc(docRef, { message, createdAt: serverTimestamp() });
    } else {
      await createNotification(userId, {
        title: 'Finance',
        message,
        category: 'finance',
        priority: 'medium',
        read: false,
        source: 'system',
      });
    }
  });
  cleanups.push(unsubFinanceUpdated);

  // 4. Travel Event
  const unsubTravel = eventBus.on('travel:trip:created', async (data: { userId: string; trip: Trip }) => {
    if (data.userId !== userId) return;
    const trip = data.trip;
    if (trip.status !== 'planned') return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(`${trip.startDate}T00:00:00`);
    const diffDays = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 3) {
      const msg = `${trip.destination} trip starts in 3 days.`;
      const duplicate = await checkDuplicateToday('travel', msg);
      if (!duplicate) {
        await createNotification(userId, {
          title: 'Travel',
          message: msg,
          category: 'travel',
          priority: 'high',
          read: false,
          source: 'system',
        });
      }
    }
  });
  cleanups.push(unsubTravel);

  // 4b. Travel — trip updated (re-check days remaining)
  const unsubTravelUpdated = eventBus.on('travel:trip:updated', async (data: { userId: string; trip: Trip }) => {
    if (data.userId !== userId) return;
    const trip = data.trip;
    if (trip.status !== 'planned') return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(`${trip.startDate}T00:00:00`);
    const diffDays = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 3) {
      const msg = `${trip.destination} trip starts in 3 days.`;
      const duplicate = await checkDuplicateToday('travel', msg);
      if (!duplicate) {
        await createNotification(userId, {
          title: 'Travel',
          message: msg,
          category: 'travel',
          priority: 'high',
          read: false,
          source: 'system',
        });
      }
    }
  });
  cleanups.push(unsubTravelUpdated);

  // 5. Wellness Event
  const unsubWellness = eventBus.on('wellness:goal:completed', async (data: { userId: string; item: WellnessItem }) => {
    if (data.userId !== userId) return;
    const item = data.item;

    const msg = `${item.title} completed. Congratulations.`;
    const duplicate = await checkDuplicateToday('wellness', msg);
    if (!duplicate) {
      await createNotification(userId, {
        title: 'Wellness',
        message: msg,
        category: 'wellness',
        priority: 'low',
        read: false,
        source: 'system',
      });
    }
  });
  cleanups.push(unsubWellness);

  // 6. System Event
  const unsubSystem = eventBus.on('system:sync', async (data: { userId: string }) => {
    if (data.userId !== userId) return;

    const msg = 'Successfully synced with Firestore.';
    const duplicate = await checkDuplicateToday('system', msg);
    if (!duplicate) {
      await createNotification(userId, {
        title: 'System',
        message: msg,
        category: 'system',
        priority: 'low',
        read: false,
        source: 'system',
      });
    }
  });
  cleanups.push(unsubSystem);

  return () => {
    cleanups.forEach((unsub) => unsub());
  };
}

/**
 * NotificationService — Handles browser notification permissions,
 * immediate triggers, and bridges to the ReminderEngine for scheduled alerts.
 */
export class NotificationService {
  /**
   * Requests permission to send desktop notifications.
   */
  static async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('This browser does not support desktop notifications.');
      return 'denied';
    }

    if (Notification.permission === 'default') {
      try {
        return await Notification.requestPermission();
      } catch (err) {
        return new Promise((resolve) => {
          Notification.requestPermission(resolve);
        });
      }
    }

    return Notification.permission;
  }

  /**
   * Returns current notification permission state.
   */
  static getPermissionStatus(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Dispatches an immediate browser notification.
   */
  static sendNotification(title: string, options?: NotificationOptions): Notification | null {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return null;
    }

    if (Notification.permission !== 'granted') {
      console.warn('[NotificationService] Blocked: Permission is not granted.');
      return null;
    }

    try {
      return new Notification(title, {
        icon: '/favicon.ico',
        ...options,
      });
    } catch (err) {
      console.error('[NotificationService] Failed to construct Notification:', err);
      return null;
    }
  }

  /**
   * Scheduling interface bridge. Schedules a reminder using the ReminderEngine.
   */
  static scheduleNotification(
    reminderId: string,
    title: string,
    fireAt: Date,
    options?: NotificationOptions
  ): void {
    const dateStr = fireAt.toISOString().split('T')[0];
    const timeStr = `${String(fireAt.getHours()).padStart(2, '0')}:${String(fireAt.getMinutes()).padStart(2, '0')}`;
    
    const mockReminder: Reminder = {
      id: reminderId,
      title: title,
      description: options?.body || '',
      date: dateStr,
      time: timeStr,
      completed: false,
      notificationEnabled: true,
      browserNotification: true,
      voiceNotification: false,
      repeat: 'none',
      repeatForever: false,
      source: 'manual',
      voiceCreated: false,
      agentGenerated: false,
    };

    ReminderEngine.scheduleReminder(mockReminder);
  }

  /**
   * Cancels a scheduled notification by reminder ID.
   */
  static cancelScheduledNotification(reminderId: string): void {
    ReminderEngine.cancelReminder(reminderId);
  }
}

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
} from 'firebase/firestore';
import { Reminder } from '../types/reminder';

/**
 * Migration helper to translate legacy repeat settings into the redesigned repeatMode types.
 */
function getMigratedRepeatMode(
  rawRepeatMode: string | undefined,
  rawRepeat: string | undefined
): 'none' | 'minutes' | 'hours' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly' {
  const mode = rawRepeatMode || rawRepeat || 'none';
  if (
    mode === 'none' ||
    mode === 'minutes' ||
    mode === 'hours' ||
    mode === 'daily' ||
    mode === 'weekdays' ||
    mode === 'weekly' ||
    mode === 'monthly' ||
    mode === 'yearly'
  ) {
    return mode;
  }
  if (mode === 'custom') {
    return 'daily'; // Migrate legacy custom repeat to daily recurrence
  }
  return 'none';
}

/**
 * Exponential backoff retry utility for Firestore operations.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) {
      console.error(`[ReminderService] Action failed after all retries.`, err);
      throw err;
    }
    console.warn(`[ReminderService] Operation failed. Retrying in ${delay}ms... (Retries left: ${retries})`, err);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

/**
 * Maps Firestore document data to the local Reminder interface.
 * Handles Firestore Timestamps, Python ISO datetime strings, and plain date strings.
 */
function mapDocToReminder(docId: string, data: any): Reminder {
  const mapTimestamp = (val: any): string | null => {
    if (!val) return null;
    // Firestore Timestamp
    if (typeof val.toDate === 'function') return val.toDate().toISOString();
    // Python ISO datetime string (e.g. "2026-07-06T17:30:00")
    if (typeof val === 'string') return val;
    // JS Date
    if (val instanceof Date) return val.toISOString();
    return null;
  };

  const browserNotification = data.browserNotification !== undefined
    ? !!data.browserNotification
    : !!data.notificationEnabled;

  const repeatMode = getMigratedRepeatMode(data.repeatMode, data.repeat);
  const interval = data.interval !== undefined ? Number(data.interval) : 1;

  // startDate: prefer camelCase startDate, fall back to snake_case or plain date field
  const startDate =
    mapTimestamp(data.startDate) ||
    mapTimestamp(data.start_date) ||
    mapTimestamp(data.date) ||
    mapTimestamp(data.remindAt) ||
    mapTimestamp(data.remind_at) ||
    '';

  // time: prefer explicit time string, otherwise extract from remindAt ISO
  const time = data.time || (startDate ? startDate.substring(11, 16) : '12:00');

  return {
    id: docId,
    title: data.title || '',
    description: data.description || '',
    date: startDate,
    time,
    completed: !!data.completed,
    notificationEnabled: !!data.notificationEnabled,
    createdAt: mapTimestamp(data.createdAt) || mapTimestamp(data.created_at) || new Date().toISOString(),
    updatedAt: mapTimestamp(data.updatedAt) || mapTimestamp(data.updated_at) || new Date().toISOString(),
    source: data.source || 'manual',
    voiceCreated: !!data.voiceCreated,
    agentGenerated: !!data.agentGenerated,
    browserNotification,
    voiceNotification: !!data.voiceNotification,
    repeat: data.repeat || 'none',
    repeatForever: !!data.repeatForever,
    endDate: mapTimestamp(data.endDate),

    // New Scheduling model fields
    repeatMode,
    interval,
    startDate,
  };
}

/**
 * Loads all reminders for the authenticated user from Firestore.
 */
export async function getReminders(userId: string): Promise<Reminder[]> {
  return withRetry(async () => {
    const db = getFirestore();
    const remindersRef = collection(db, 'users', userId, 'reminders');
    const q = query(remindersRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const reminders: Reminder[] = [];
    querySnapshot.forEach((doc) => {
      reminders.push(mapDocToReminder(doc.id, doc.data()));
    });

    return reminders;
  });
}

/**
 * Creates a new reminder in Firestore.
 */
export async function createReminder(
  userId: string,
  reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Reminder> {
  return withRetry(async () => {
    const db = getFirestore();
    const remindersRef = collection(db, 'users', userId, 'reminders');

    const startVal = reminder.startDate || reminder.date;
    const repMode = reminder.repeatMode || getMigratedRepeatMode(undefined, reminder.repeat);
    const intervalVal = reminder.interval !== undefined ? Number(reminder.interval) : 1;

    const docData = {
      title: reminder.title.trim(),
      description: (reminder.description || '').trim(),
      date: startVal ? Timestamp.fromDate(new Date(startVal)) : serverTimestamp(),
      time: reminder.time || '12:00',
      completed: !!reminder.completed,
      notificationEnabled: !!reminder.notificationEnabled,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      source: reminder.source || 'manual',
      voiceCreated: !!reminder.voiceCreated,
      agentGenerated: !!reminder.agentGenerated,
      browserNotification: reminder.browserNotification !== undefined ? !!reminder.browserNotification : !!reminder.notificationEnabled,
      voiceNotification: !!reminder.voiceNotification,
      repeat: reminder.repeat || 'none',
      repeatForever: !!reminder.repeatForever,
      endDate: reminder.endDate ? Timestamp.fromDate(new Date(reminder.endDate)) : null,
      
      // New Scheduling Fields
      startDate: startVal ? Timestamp.fromDate(new Date(startVal)) : serverTimestamp(),
      repeatMode: repMode,
      interval: intervalVal,
    };

    const docRef = await addDoc(remindersRef, docData);

    return {
      id: docRef.id,
      ...reminder,
      startDate: startVal ? new Date(startVal).toISOString() : new Date().toISOString(),
      date: startVal ? new Date(startVal).toISOString() : new Date().toISOString(),
      repeatMode: repMode,
      interval: intervalVal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

/**
 * Updates an existing reminder in Firestore.
 */
export async function updateReminder(
  userId: string,
  reminderId: string,
  updates: Partial<Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  return withRetry(async () => {
    const db = getFirestore();
    const docRef = doc(db, 'users', userId, 'reminders', reminderId);

    const docData: any = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    if (updates.date !== undefined || updates.startDate !== undefined) {
      const targetDate = updates.startDate || updates.date;
      docData.date = targetDate ? Timestamp.fromDate(new Date(targetDate)) : null;
      docData.startDate = targetDate ? Timestamp.fromDate(new Date(targetDate)) : null;
    }

    if (updates.endDate !== undefined) {
      docData.endDate = updates.endDate ? Timestamp.fromDate(new Date(updates.endDate)) : null;
    }

    await updateDoc(docRef, docData);
  });
}

/**
 * Deletes a reminder from Firestore.
 */
export async function deleteReminder(userId: string, reminderId: string): Promise<void> {
  return withRetry(async () => {
    const db = getFirestore();
    const docRef = doc(db, 'users', userId, 'reminders', reminderId);
    await deleteDoc(docRef);
  });
}

/**
 * Toggles the completed status of an existing reminder.
 */
export async function toggleReminder(
  userId: string,
  reminderId: string,
  currentCompleted: boolean
): Promise<void> {
  await updateReminder(userId, reminderId, {
    completed: !currentCompleted,
  });
}

/**
 * Subscribes to real-time updates for reminders.
 * Uses 'createdAt' ordering. Falls back to client-side sort if the index is missing
 * (e.g. backend-written docs that only have snake_case created_at).
 */
export function subscribeReminders(
  userId: string,
  callback: (reminders: Reminder[]) => void
): () => void {
  const db = getFirestore();
  const remindersRef = collection(db, 'users', userId, 'reminders');
  const q = query(remindersRef, orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const reminders: Reminder[] = [];
    querySnapshot.forEach((doc) => {
      reminders.push(mapDocToReminder(doc.id, doc.data()));
    });
    callback(reminders);
  }, (err) => {
    console.warn('[ReminderService] Ordered snapshot failed, falling back to unordered:', err.message);
    // Fallback: listen without ordering, sort client-side
    onSnapshot(remindersRef, (snap) => {
      const reminders: Reminder[] = [];
      snap.forEach((doc) => reminders.push(mapDocToReminder(doc.id, doc.data())));
      reminders.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
      callback(reminders);
    });
  });

  return unsubscribe;
}

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
import { WellnessItem } from '../types/wellness';
import { eventBus } from './eventBus';

/**
 * Exponential backoff retry utility for Firestore operations.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) {
      console.error(`[WellnessService] Action failed after all retries.`, err);
      throw err;
    }
    console.warn(`[WellnessService] Operation failed. Retrying in ${delay}ms... (Retries left: ${retries})`, err);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

/**
 * Maps Firestore document data to the local WellnessItem interface with support
 * for Firebase Timestamps, ISO strings, and snake_case database fields.
 */
function mapDocToWellnessItem(docId: string, data: any): WellnessItem {
  const parseDate = (val: any) => {
    if (!val) return new Date().toISOString();
    if (val instanceof Timestamp) return val.toDate().toISOString();
    if (typeof val === 'string') return new Date(val).toISOString();
    return new Date().toISOString();
  };

  const getVal = (keys: string[]) => {
    for (const key of keys) {
      if (data[key] !== undefined) return data[key];
    }
    return undefined;
  };

  return {
    id: docId,
    title: data.title || '',
    category: data.category || 'custom',
    target: Number(getVal(['target', 'goal_target']) ?? 0),
    current: Number(getVal(['current', 'current_value']) ?? 0),
    unit: data.unit || '',
    frequency: data.frequency || 'daily',
    reminderEnabled: !!(data.reminderEnabled ?? data.reminder_enabled),
    notes: data.notes || '',
    status: data.status || 'active',
    source: data.source || 'manual',
    createdAt: parseDate(data.createdAt ?? data.created_at),
    updatedAt: parseDate(data.updatedAt ?? data.updated_at),
    agentGenerated: !!(data.agentGenerated ?? data.agent_generated),
  };
}

/**
 * Loads all wellness items for the authenticated user from Firestore.
 */
export async function getWellnessItems(userId: string): Promise<WellnessItem[]> {
  return withRetry(async () => {
    const db = getFirestore();
    const ref = collection(db, 'users', userId, 'wellness');
    const q = query(ref, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    const items: WellnessItem[] = [];
    querySnapshot.forEach((doc) => {
      items.push(mapDocToWellnessItem(doc.id, doc.data()));
    });

    return items;
  });
}

/**
 * Creates a new wellness item in Firestore.
 */
export async function createWellnessItem(
  userId: string,
  item: Omit<WellnessItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<WellnessItem> {
  return withRetry(async () => {
    const db = getFirestore();
    const ref = collection(db, 'users', userId, 'wellness');

    const docData = {
      title: item.title.trim(),
      category: item.category,
      target: Number(item.target),
      current: Number(item.current),
      unit: (item.unit || '').trim(),
      frequency: item.frequency,
      reminderEnabled: !!item.reminderEnabled,
      notes: (item.notes || '').trim(),
      status: item.status || 'active',
      source: item.source || 'manual',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      agentGenerated: !!item.agentGenerated,
    };

    const docRef = await addDoc(ref, docData);

    return {
      id: docRef.id,
      ...item,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

/**
 * Updates an existing wellness item in Firestore.
 */
export async function updateWellnessItem(
  userId: string,
  itemId: string,
  updates: Partial<Omit<WellnessItem, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  return withRetry(async () => {
    const db = getFirestore();
    const docRef = doc(db, 'users', userId, 'wellness', itemId);

    const docData: any = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    if (updates.title !== undefined) {
      docData.title = updates.title.trim();
    }
    if (updates.unit !== undefined) {
      docData.unit = updates.unit.trim();
    }
    if (updates.notes !== undefined) {
      docData.notes = updates.notes.trim();
    }

    await updateDoc(docRef, docData);

    const updatedItem: WellnessItem = { id: itemId, title: updates.title || '', ...updates } as WellnessItem;

    // Always publish a goal-updated event for the dashboard / AI agent
    eventBus.publish('wellness:goal:updated', { userId, item: updatedItem }, { source: 'wellnessService' });

    // Additionally publish goal-completed when status transitions to 'completed'
    if (updates.status === 'completed') {
      eventBus.publish('wellness:goal:completed', { userId, item: updatedItem }, { source: 'wellnessService' });
    }
  });
}

/**
 * Deletes a wellness item from Firestore.
 */
export async function deleteWellnessItem(userId: string, itemId: string): Promise<void> {
  return withRetry(async () => {
    const db = getFirestore();
    const docRef = doc(db, 'users', userId, 'wellness', itemId);
    await deleteDoc(docRef);
  });
}

/**
 * Subscribes to real-time updates for wellness items.
 */
/**
 * Subscribes to real-time updates for wellness items.
 * Uses 'createdAt' ordering. Falls back to client-side sort if the index is missing.
 */
export function subscribeWellnessItems(
  userId: string,
  callback: (items: WellnessItem[]) => void
): () => void {
  const db = getFirestore();
  const ref = collection(db, 'users', userId, 'wellness');
  const q = query(ref, orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const items: WellnessItem[] = [];
    querySnapshot.forEach((doc) => {
      items.push(mapDocToWellnessItem(doc.id, doc.data()));
    });
    callback(items);
  }, (err) => {
    console.warn('[WellnessService] Ordered snapshot failed, falling back to unordered:', err.message);
    // Fallback: listen without ordering, sort client-side by createdAt descending
    onSnapshot(ref, (snap) => {
      const items: WellnessItem[] = [];
      snap.forEach((doc) => items.push(mapDocToWellnessItem(doc.id, doc.data())));
      items.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime; // desc order
      });
      callback(items);
    });
  });

  return unsubscribe;
}

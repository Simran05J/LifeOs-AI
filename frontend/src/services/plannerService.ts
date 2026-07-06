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
import { eventBus } from './eventBus';

export interface PlannerTask {
  id?: string;
  title: string;
  description: string;
  completed: boolean;
  startDate: string | null; // ISO string format
  endDate: string | null;   // ISO string format
  createdAt?: string;
  updatedAt?: string;
  source: 'manual' | 'ai' | 'voice';
}

/**
 * Maps Firestore document data to the local PlannerTask interface.
 * Handles Firestore Timestamps, Python ISO datetime strings, and plain date strings.
 */
function mapDocToTask(docId: string, data: any): PlannerTask {
  const mapTimestamp = (val: any): string | null => {
    if (!val) return null;
    // Firestore Timestamp
    if (typeof val.toDate === 'function') {
      return val.toDate().toISOString();
    }
    // Python datetime ISO string (e.g. "2026-07-06T17:30:00")
    if (typeof val === 'string') return val;
    // JS Date
    if (val instanceof Date) return val.toISOString();
    return null;
  };

  // startDate: prefer camelCase, fall back to snake_case or due_date
  const startDate =
    mapTimestamp(data.startDate) ||
    mapTimestamp(data.start_date) ||
    mapTimestamp(data.due_date) ||
    null;

  // endDate: prefer camelCase, fall back to snake_case or due_date
  const endDate =
    mapTimestamp(data.endDate) ||
    mapTimestamp(data.end_date) ||
    mapTimestamp(data.due_date) ||
    null;

  return {
    id: docId,
    title: data.title || '',
    description: data.description || '',
    completed: !!data.completed,
    startDate,
    endDate,
    createdAt: mapTimestamp(data.createdAt) || mapTimestamp(data.created_at) || new Date().toISOString(),
    updatedAt: mapTimestamp(data.updatedAt) || mapTimestamp(data.updated_at) || new Date().toISOString(),
    source: data.source || 'manual',
  };
}

/**
 * Loads all planner tasks for the authenticated user from Firestore.
 */
export async function fetchPlannerTasks(userId: string): Promise<PlannerTask[]> {
  const db = getFirestore();
  const plannerRef = collection(db, 'users', userId, 'planner');
  const q = query(plannerRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);

  const tasks: PlannerTask[] = [];
  querySnapshot.forEach((doc) => {
    tasks.push(mapDocToTask(doc.id, doc.data()));
  });

  return tasks;
}

/**
 * Creates a new planner task in Firestore.
 */
export async function createPlannerTask(
  userId: string,
  task: Omit<PlannerTask, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PlannerTask> {
  const db = getFirestore();
  const plannerRef = collection(db, 'users', userId, 'planner');

  const docData = {
    title: task.title.trim(),
    description: (task.description || '').trim(),
    completed: !!task.completed,
    startDate: task.startDate ? Timestamp.fromDate(new Date(task.startDate)) : null,
    endDate: task.endDate ? Timestamp.fromDate(new Date(task.endDate)) : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    source: task.source || 'manual',
  };

  const docRef = await addDoc(plannerRef, docData);

  const created: PlannerTask = {
    id: docRef.id,
    ...task,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
    eventBus.publish('planner:task:created', { userId, task: created }, { source: 'plannerService' });
  return created;
}

/**
 * Updates an existing planner task in Firestore.
 */
export async function updatePlannerTask(
  userId: string,
  taskId: string,
  updates: Partial<Omit<PlannerTask, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const db = getFirestore();
  const docRef = doc(db, 'users', userId, 'planner', taskId);

  const docData: any = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  if (updates.startDate !== undefined) {
    docData.startDate = updates.startDate ? Timestamp.fromDate(new Date(updates.startDate)) : null;
  }
  if (updates.endDate !== undefined) {
    docData.endDate = updates.endDate ? Timestamp.fromDate(new Date(updates.endDate)) : null;
  }

  await updateDoc(docRef, docData);
    eventBus.publish('planner:task:updated', { userId, task: { id: taskId, title: '', ...updates } }, { source: 'plannerService' });
}

/**
 * Deletes a planner task from Firestore.
 */
export async function deletePlannerTask(userId: string, taskId: string): Promise<void> {
  const db = getFirestore();
  const docRef = doc(db, 'users', userId, 'planner', taskId);
  await deleteDoc(docRef);
}

/**
 * Subscribes to real-time updates for planner tasks.
 * Uses 'createdAt' ordering. Falls back to collection-wide snapshot (no ordering)
 * if a Firestore index error occurs (e.g. for AI-written docs with snake_case fields).
 */
export function subscribePlannerTasks(
  userId: string,
  callback: (tasks: PlannerTask[]) => void
): () => void {
  const db = getFirestore();
  const plannerRef = collection(db, 'users', userId, 'planner');
  const q = query(plannerRef, orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const tasks: PlannerTask[] = [];
    querySnapshot.forEach((doc) => {
      tasks.push(mapDocToTask(doc.id, doc.data()));
    });
    callback(tasks);
  }, (err) => {
    console.warn('[PlannerService] Ordered snapshot failed, falling back to unordered:', err.message);
    // Fallback: listen to all documents without ordering
    onSnapshot(plannerRef, (snap) => {
      const tasks: PlannerTask[] = [];
      snap.forEach((doc) => tasks.push(mapDocToTask(doc.id, doc.data())));
      // Sort client-side: newest first using createdAt or updatedAt
      tasks.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
      callback(tasks);
    });
  });

  return unsubscribe;
}


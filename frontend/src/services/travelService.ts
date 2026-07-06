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
import { Trip } from '../types/travel';
import { eventBus } from './eventBus';

/**
 * Exponential backoff retry utility for Firestore operations.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) {
      console.error(`[TravelService] Action failed after all retries.`, err);
      throw err;
    }
    console.warn(`[TravelService] Operation failed. Retrying in ${delay}ms... (Retries left: ${retries})`, err);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

/**
 * Maps Firestore document data to the local Trip interface.
 * Handles Firestore Timestamps, Python ISO datetime strings, and plain date strings.
 */
function mapDocToTrip(docId: string, data: any): Trip {
  const mapTimestamp = (val: any): string | null => {
    if (!val) return null;
    // Firestore Timestamp
    if (typeof val.toDate === 'function') {
      const dateObj = val.toDate();
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(dateObj.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    // Python ISO datetime string or plain date string
    if (typeof val === 'string') return val.split('T')[0];
    // JS Date
    if (val instanceof Date) {
      const yyyy = val.getFullYear();
      const mm = String(val.getMonth() + 1).padStart(2, '0');
      const dd = String(val.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return null;
  };

  const mapFullTimestamp = (val: any): string | null => {
    if (!val) return null;
    if (typeof val.toDate === 'function') return val.toDate().toISOString();
    if (typeof val === 'string') return val;
    if (val instanceof Date) return val.toISOString();
    return null;
  };

  // startDate / endDate: prefer camelCase, fall back to snake_case
  const startDate =
    mapTimestamp(data.startDate) ||
    mapTimestamp(data.start_date) ||
    '';

  const endDate =
    mapTimestamp(data.endDate) ||
    mapTimestamp(data.end_date) ||
    '';

  return {
    id: docId,
    destination: data.destination || '',
    startDate,
    endDate,
    transportation: data.transportation || 'other',
    accommodation: data.accommodation || '',
    budget: data.budget !== undefined ? Number(data.budget) : 0,
    notes: data.notes || '',
    status: data.status || 'planned',
    source: data.source || 'manual',
    createdAt: mapFullTimestamp(data.createdAt) || mapFullTimestamp(data.created_at) || new Date().toISOString(),
    updatedAt: mapFullTimestamp(data.updatedAt) || mapFullTimestamp(data.updated_at) || new Date().toISOString(),
    agentGenerated: !!data.agentGenerated,
  };
}

/**
 * Loads all trips for the authenticated user from Firestore.
 */
export async function getTrips(userId: string): Promise<Trip[]> {
  return withRetry(async () => {
    const db = getFirestore();
    const ref = collection(db, 'users', userId, 'travel');
    const q = query(ref, orderBy('startDate', 'asc'));
    const querySnapshot = await getDocs(q);

    const trips: Trip[] = [];
    querySnapshot.forEach((doc) => {
      trips.push(mapDocToTrip(doc.id, doc.data()));
    });

    return trips;
  });
}

/**
 * Creates a new trip in Firestore.
 */
export async function createTrip(
  userId: string,
  trip: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Trip> {
  return withRetry(async () => {
    const db = getFirestore();
    const ref = collection(db, 'users', userId, 'travel');

    // Parse date safely to Date objects at start of the day in local time
    const startD = new Date(`${trip.startDate}T00:00:00`);
    const endD = new Date(`${trip.endDate}T00:00:00`);

    const docData = {
      destination: trip.destination.trim(),
      startDate: Timestamp.fromDate(startD),
      endDate: Timestamp.fromDate(endD),
      transportation: trip.transportation,
      accommodation: (trip.accommodation || '').trim(),
      budget: Number(trip.budget),
      notes: (trip.notes || '').trim(),
      status: trip.status || 'planned',
      source: trip.source || 'manual',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      agentGenerated: !!trip.agentGenerated,
    };

    const docRef = await addDoc(ref, docData);

    const created: Trip = {
      id: docRef.id,
      ...trip,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    eventBus.publish('travel:trip:created', { userId, trip: created }, { source: 'travelService' });
    return created;
  });
}

/**
 * Updates an existing trip in Firestore.
 */
export async function updateTrip(
  userId: string,
  tripId: string,
  updates: Partial<Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  return withRetry(async () => {
    const db = getFirestore();
    const docRef = doc(db, 'users', userId, 'travel', tripId);

    const docData: any = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    if (updates.startDate !== undefined) {
      docData.startDate = updates.startDate
        ? Timestamp.fromDate(new Date(`${updates.startDate}T00:00:00`))
        : null;
    }

    if (updates.endDate !== undefined) {
      docData.endDate = updates.endDate
        ? Timestamp.fromDate(new Date(`${updates.endDate}T00:00:00`))
        : null;
    }

    await updateDoc(docRef, docData);
    eventBus.publish('travel:trip:updated', { userId, trip: { id: tripId, destination: '', startDate: '', ...updates } }, { source: 'travelService' });
  });
}

/**
 * Deletes a trip from Firestore.
 */
export async function deleteTrip(userId: string, tripId: string): Promise<void> {
  return withRetry(async () => {
    const db = getFirestore();
    const docRef = doc(db, 'users', userId, 'travel', tripId);
    await deleteDoc(docRef);
  });
}

/**
 * Subscribes to real-time updates for trips.
 * Uses 'startDate' ordering. Falls back to client-side sort if the index is missing.
 */
export function subscribeTrips(
  userId: string,
  callback: (trips: Trip[]) => void
): () => void {
  const db = getFirestore();
  const ref = collection(db, 'users', userId, 'travel');
  const q = query(ref, orderBy('startDate', 'asc'));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const trips: Trip[] = [];
    querySnapshot.forEach((doc) => {
      trips.push(mapDocToTrip(doc.id, doc.data()));
    });
    callback(trips);
  }, (err) => {
    console.warn('[TravelService] Ordered snapshot failed, falling back to unordered:', err.message);
    // Fallback: listen without ordering, sort client-side by startDate
    onSnapshot(ref, (snap) => {
      const trips: Trip[] = [];
      snap.forEach((doc) => trips.push(mapDocToTrip(doc.id, doc.data())));
      trips.sort((a, b) => {
        const aTime = a.startDate ? new Date(a.startDate).getTime() : 0;
        const bTime = b.startDate ? new Date(b.startDate).getTime() : 0;
        return aTime - bTime; // ascending for trips
      });
      callback(trips);
    });
  });

  return unsubscribe;
}

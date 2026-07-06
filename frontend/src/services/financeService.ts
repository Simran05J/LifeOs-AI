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
import { FinanceTransaction, FinanceSummary } from '../types/finance';
import { eventBus } from './eventBus';

/**
 * Exponential backoff retry utility for Firestore operations.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) {
      console.error(`[FinanceService] Action failed after all retries.`, err);
      throw err;
    }
    console.warn(`[FinanceService] Operation failed. Retrying in ${delay}ms... (Retries left: ${retries})`, err);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

/**
 * Maps Firestore document data to the local FinanceTransaction interface.
 * Handles Firestore Timestamps, Python ISO datetime strings, and plain date strings.
 */
function mapDocToTransaction(docId: string, data: any): FinanceTransaction {
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

  // transactionDate: prefer camelCase, fall back to snake_case
  const transactionDate =
    mapTimestamp(data.transactionDate) ||
    mapTimestamp(data.transaction_date) ||
    new Date().toISOString().split('T')[0];

  return {
    id: docId,
    title: data.title || data.description || '',
    amount: data.amount !== undefined ? Number(data.amount) : 0,
    type: data.type || 'expense',
    category: data.category || '',
    note: data.note || data.description || '',
    transactionDate,
    createdAt: mapTimestamp(data.createdAt) || mapTimestamp(data.created_at) || new Date().toISOString(),
    updatedAt: mapTimestamp(data.updatedAt) || mapTimestamp(data.updated_at) || new Date().toISOString(),
    source: data.source || 'manual',
    recurring: !!data.recurring,
    currency: data.currency || 'INR',
    agentGenerated: !!data.agentGenerated,
  };
}

/**
 * Loads all finance transactions for the authenticated user from Firestore.
 */
export async function getTransactions(userId: string): Promise<FinanceTransaction[]> {
  return withRetry(async () => {
    const db = getFirestore();
    const ref = collection(db, 'users', userId, 'finance');
    const q = query(ref, orderBy('transactionDate', 'desc'));
    const querySnapshot = await getDocs(q);

    const txs: FinanceTransaction[] = [];
    querySnapshot.forEach((doc) => {
      txs.push(mapDocToTransaction(doc.id, doc.data()));
    });

    return txs;
  });
}

/**
 * Creates a new transaction in Firestore.
 */
export async function createTransaction(
  userId: string,
  tx: Omit<FinanceTransaction, 'id' | 'createdAt' | 'updatedAt'>
): Promise<FinanceTransaction> {
  return withRetry(async () => {
    const db = getFirestore();
    const ref = collection(db, 'users', userId, 'finance');

    const docData = {
      title: tx.title.trim(),
      amount: Number(tx.amount),
      type: tx.type,
      category: (tx.category || '').trim(),
      note: (tx.note || '').trim(),
      transactionDate: tx.transactionDate ? Timestamp.fromDate(new Date(tx.transactionDate)) : serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      source: tx.source || 'manual',
      recurring: !!tx.recurring,
      currency: tx.currency || 'INR',
      agentGenerated: !!tx.agentGenerated,
    };

    const docRef = await addDoc(ref, docData);

    const created: FinanceTransaction = {
      id: docRef.id,
      ...tx,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    eventBus.publish('finance:transaction:created', { userId, transaction: created }, { source: 'financeService' });
    return created;
  });
}

/**
 * Updates an existing transaction in Firestore.
 */
export async function updateTransaction(
  userId: string,
  transactionId: string,
  updates: Partial<Omit<FinanceTransaction, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  return withRetry(async () => {
    const db = getFirestore();
    const docRef = doc(db, 'users', userId, 'finance', transactionId);

    const docData: any = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    if (updates.transactionDate !== undefined) {
      docData.transactionDate = updates.transactionDate
        ? Timestamp.fromDate(new Date(updates.transactionDate))
        : null;
    }

    await updateDoc(docRef, docData);
    eventBus.publish('finance:transaction:updated', { userId, transaction: { id: transactionId, amount: 0, type: 'expense', transactionDate: '', ...updates } }, { source: 'financeService' });
  });
}

/**
 * Deletes a transaction from Firestore.
 */
export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
  return withRetry(async () => {
    const db = getFirestore();
    const docRef = doc(db, 'users', userId, 'finance', transactionId);
    await deleteDoc(docRef);
  });
}

/**
 * Aggregates summary info for the given transactions list.
 */
export function calculateSummary(transactions: FinanceTransaction[]): FinanceSummary {
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach((tx) => {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else if (tx.type === 'expense') {
      totalExpense += tx.amount;
    }
  });

  return {
    totalIncome,
    totalExpense,
    totalBalance: totalIncome - totalExpense,
  };
}

/**
 * Triggers a client-side CSV export of transaction data.
 */
export function exportToCSV(transactions: FinanceTransaction[]): void {
  const headers = ['Title', 'Amount', 'Type', 'Category', 'Date', 'Note', 'Source', 'Currency', 'Agent Generated'];
  const rows = transactions.map((tx) => [
    tx.title,
    tx.amount,
    tx.type,
    tx.category,
    tx.transactionDate.split('T')[0],
    tx.note || '',
    tx.source,
    tx.currency,
    tx.agentGenerated ? 'YES' : 'NO',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `finance_report_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Prepares mock/future layout requirements for PDF export.
 */
export function exportToPDF(transactions: FinanceTransaction[]): void {
  console.log('[FinanceService] exportToPDF called. Transactions count:', transactions.length);
  alert('PDF export architecture prepared. The PDF will compile all monthly balances, category breakdowns, and transaction tables.');
}

/**
 * Subscribes to real-time updates for transactions.
 * Uses 'transactionDate' ordering. Falls back to client-side sort if the index is missing.
 */
export function subscribeTransactions(
  userId: string,
  callback: (transactions: FinanceTransaction[]) => void
): () => void {
  const db = getFirestore();
  const ref = collection(db, 'users', userId, 'finance');
  const q = query(ref, orderBy('transactionDate', 'desc'));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const txs: FinanceTransaction[] = [];
    querySnapshot.forEach((doc) => {
      txs.push(mapDocToTransaction(doc.id, doc.data()));
    });
    callback(txs);
  }, (err) => {
    console.warn('[FinanceService] Ordered snapshot failed, falling back to unordered:', err.message);
    // Fallback: listen without ordering, sort client-side by transactionDate
    onSnapshot(ref, (snap) => {
      const txs: FinanceTransaction[] = [];
      snap.forEach((doc) => txs.push(mapDocToTransaction(doc.id, doc.data())));
      txs.sort((a, b) => {
        const aTime = a.transactionDate ? new Date(a.transactionDate).getTime() : 0;
        const bTime = b.transactionDate ? new Date(b.transactionDate).getTime() : 0;
        return bTime - aTime;
      });
      callback(txs);
    });
  });

  return unsubscribe;
}

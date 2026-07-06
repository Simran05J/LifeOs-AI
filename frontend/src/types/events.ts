/**
 * events.ts — LifeOS AI Central Event Catalog
 *
 * Every event that flows through the EventBus is declared here as a
 * discriminated union. Publishers and subscribers both import from this
 * file, giving end-to-end TypeScript safety: wrong payloads are
 * compile-time errors, not runtime surprises.
 *
 * Convention: domain:entity:verb
 *   e.g.  planner:task:created
 *         finance:transaction:updated
 *         system:sync
 */

// ─── Domain Payload Types ────────────────────────────────────────────────────

export interface PlannerTask {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  completed?: boolean;
  status?: string;
  tags?: string[];
  [key: string]: unknown;
}

import { Reminder as BaseReminder } from './reminder';

export interface Reminder extends BaseReminder {
  id: string;
}

export interface FinanceTransaction {
  id: string;
  title?: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category?: string;
  transactionDate: string;
  [key: string]: unknown;
}

export interface Trip {
  id: string;
  destination: string;
  startDate: string;
  endDate?: string;
  status?: 'planned' | 'ongoing' | 'completed' | 'cancelled';
  [key: string]: unknown;
}

export interface WellnessItem {
  id: string;
  title: string;
  category?: string;
  status?: 'active' | 'completed';
  current?: number;
  target?: number;
  [key: string]: unknown;
}

export interface SystemError {
  message: string;
  code?: string;
  stack?: string;
}

// ─── Event Map ───────────────────────────────────────────────────────────────
// Maps every event key to its exact payload shape.

export interface LifeOSEventMap {
  // ── Planner ────────────────────────────────────────────────────────────────
  'planner:task:created':  { userId: string; task: PlannerTask };
  'planner:task:updated':  { userId: string; task: PlannerTask };
  'planner:task:deleted':  { userId: string; taskId: string };

  // ── Reminder ───────────────────────────────────────────────────────────────
  'reminder:triggered':    { userId: string; reminder: Reminder };
  'reminder:snoozed':      { userId: string; reminder: Reminder; snoozeMinutes: number };

  // ── Finance ────────────────────────────────────────────────────────────────
  'finance:transaction:created': { userId: string; transaction: FinanceTransaction };
  'finance:transaction:updated': { userId: string; transaction: Partial<FinanceTransaction> & { id: string } };
  'finance:transaction:deleted': { userId: string; transactionId: string };

  // ── Travel ─────────────────────────────────────────────────────────────────
  'travel:trip:created':   { userId: string; trip: Trip };
  'travel:trip:updated':   { userId: string; trip: Partial<Trip> & { id: string } };
  'travel:trip:deleted':   { userId: string; tripId: string };

  // ── Wellness ───────────────────────────────────────────────────────────────
  'wellness:goal:updated':   { userId: string; item: WellnessItem };
  'wellness:goal:completed': { userId: string; item: WellnessItem };

  // ── Dashboard ──────────────────────────────────────────────────────────────
  'dashboard:refresh':     { userId: string };

  // ── System ─────────────────────────────────────────────────────────────────
  'system:sync':           { userId: string };
  'system:error':          { userId: string; error: SystemError; source: string };

  // ── AI / Future Gemini Agent ───────────────────────────────────────────────
  'ai:context:update':     { userId: string; context: Record<string, unknown> };
}

/** All valid event keys in the system. */
export type EventKey = keyof LifeOSEventMap;

/** Extracts the payload type for a given event key. */
export type EventPayload<K extends EventKey> = LifeOSEventMap[K];

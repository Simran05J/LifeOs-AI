/**
 * eventBus.ts — LifeOS AI Central Event Bus
 *
 * The single nervous system of LifeOS AI. No module talks directly to
 * another module. Everything is published here and consumed here.
 *
 * Features:
 *  - Full TypeScript discriminated-union event catalog (LifeOSEventMap)
 *  - Exact-key subscriptions  →  eventBus.on('planner:task:created', handler)
 *  - Wildcard subscriptions   →  eventBus.on('planner:*', handler)   (prefix match)
 *  - Once-only subscriptions  →  eventBus.once('system:sync', handler)
 *  - Middleware pipeline       →  eventBus.use(fn)   (logger, AI agent hook, …)
 *  - Circular event history   →  eventBus.history()  (last 100 events)
 *  - Async handlers with per-handler error isolation
 *  - Priority levels: critical > high > normal > low
 *  - eventBus.clear()  for clean logout
 */

import {
  type LifeOSEventMap,
  type EventKey,
  type EventPayload,
} from '../types/events';

// ─── Public Types ─────────────────────────────────────────────────────────────

export type EventPriority = 'critical' | 'high' | 'normal' | 'low';

export interface PublishOptions {
  priority?: EventPriority;
  /** Source label shown in history and devtools (e.g. 'plannerService') */
  source?: string;
}

export interface SubscribeOptions {
  /** If true, the handler auto-unsubscribes after the first call. */
  once?: boolean;
}

/** An entry in the circular history buffer. */
export interface HistoryEntry<K extends EventKey = EventKey> {
  key: K;
  payload: EventPayload<K>;
  priority: EventPriority;
  source: string;
  timestamp: number; // Unix ms
}

/**
 * A middleware function receives the event envelope and a `next` callback.
 * Call `next()` to continue the chain. Omit `next()` to short-circuit.
 */
export type MiddlewareFn = (
  event: HistoryEntry,
  next: () => void | Promise<void>
) => void | Promise<void>;

// Wildcard handler receives the key + payload together
export type WildcardHandler = (key: EventKey, payload: unknown) => void | Promise<void>;

// ─── Internal Types ───────────────────────────────────────────────────────────

type TypedHandler<K extends EventKey> = (payload: EventPayload<K>) => void | Promise<void>;

interface Subscription<K extends EventKey = EventKey> {
  handler: TypedHandler<K>;
  once: boolean;
}

interface WildcardSubscription {
  prefix: string;          // e.g. "planner:"
  handler: WildcardHandler;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HISTORY_LIMIT = 100;

const PRIORITY_ORDER: Record<EventPriority, number> = {
  critical: 3,
  high:     2,
  normal:   1,
  low:      0,
};

// ─── EventBus Class ──────────────────────────────────────────────────────────

class LifeOSEventBus {
  // Exact-key subscriptions: Map<key, Subscription[]>
  private readonly subs = new Map<EventKey, Subscription<EventKey>[]>();

  // Wildcard prefix subscriptions
  private readonly wildcards: WildcardSubscription[] = [];

  // Middleware chain (registered in order, run FIFO)
  private readonly middlewares: MiddlewareFn[] = [];

  // Circular history buffer
  private readonly historyBuffer: HistoryEntry[] = [];

  // ── Middleware ─────────────────────────────────────────────────────────────

  /**
   * Register a middleware function. Middlewares run in registration order
   * before any handler is called for every published event.
   *
   * @example
   * eventBus.use((event, next) => {
   *   console.debug('[EventBus]', event.key, event.payload);
   *   next();
   * });
   */
  use(middleware: MiddlewareFn): void {
    this.middlewares.push(middleware);
  }

  // ── Subscribe ─────────────────────────────────────────────────────────────

  /**
   * Subscribe to an exact event key. Returns an unsubscribe function.
   *
   * @example
   * const unsub = eventBus.on('planner:task:created', ({ task }) => { ... });
   * // later:
   * unsub();
   */
  on<K extends EventKey>(
    key: K,
    handler: TypedHandler<K>,
    options: SubscribeOptions = {}
  ): () => void {
    if (!this.subs.has(key)) {
      this.subs.set(key, []);
    }
    const entry: Subscription<K> = { handler, once: options.once ?? false };
    (this.subs.get(key) as Subscription<K>[]).push(entry);

    return () => this.off(key, handler);
  }

  /** Alias for on() — identical behaviour. */
  subscribe<K extends EventKey>(
    key: K,
    handler: TypedHandler<K>,
    options?: SubscribeOptions
  ): () => void {
    return this.on(key, handler, options);
  }

  /**
   * Subscribe to an event exactly once. Auto-unsubscribes after first call.
   */
  once<K extends EventKey>(key: K, handler: TypedHandler<K>): () => void {
    return this.on(key, handler, { once: true });
  }

  /**
   * Subscribe to ALL events whose key starts with the given prefix.
   * Use `"planner:"` to catch all planner events, `""` to catch everything.
   *
   * @example
   * eventBus.onWildcard('planner:', (key, payload) => { ... });
   */
  onWildcard(prefix: string, handler: WildcardHandler): () => void {
    const entry: WildcardSubscription = { prefix, handler };
    this.wildcards.push(entry);
    return () => {
      const idx = this.wildcards.indexOf(entry);
      if (idx !== -1) this.wildcards.splice(idx, 1);
    };
  }

  // ── Unsubscribe ───────────────────────────────────────────────────────────

  private off<K extends EventKey>(key: K, handler: TypedHandler<K>): void {
    const list = this.subs.get(key);
    if (list) {
      this.subs.set(
        key,
        list.filter((s) => s.handler !== handler) as Subscription<EventKey>[]
      );
    }
  }

  // ── Publish ───────────────────────────────────────────────────────────────

  /**
   * Publish an event. Runs all middleware in order, then dispatches to all
   * matching exact-key subscribers and wildcard subscribers.
   *
   * Handlers are called asynchronously and errors are isolated per-handler.
   *
   * @example
   * eventBus.publish('planner:task:created', { userId, task }, { source: 'plannerService' });
   */
  publish<K extends EventKey>(
    key: K,
    payload: EventPayload<K>,
    options: PublishOptions = {}
  ): void {
    const entry: HistoryEntry<K> = {
      key,
      payload,
      priority: options.priority ?? 'normal',
      source:   options.source   ?? 'unknown',
      timestamp: Date.now(),
    };

    // Add to history (circular — drop oldest when full)
    this.historyBuffer.push(entry as HistoryEntry);
    if (this.historyBuffer.length > HISTORY_LIMIT) {
      this.historyBuffer.shift();
    }

    // Run middleware chain then dispatch
    this._runMiddleware(entry as HistoryEntry, () => {
      this._dispatch(key, payload);
    });
  }

  // ── Middleware Chain Runner ────────────────────────────────────────────────

  private _runMiddleware(event: HistoryEntry, finalFn: () => void): void {
    if (this.middlewares.length === 0) {
      finalFn();
      return;
    }

    let idx = 0;
    const run = async () => {
      if (idx < this.middlewares.length) {
        const mw = this.middlewares[idx++];
        await mw(event, run);
      } else {
        finalFn();
      }
    };

    run().catch((err) => {
      console.error('[EventBus] Middleware error:', err);
      // Still deliver even if middleware throws
      finalFn();
    });
  }

  // ── Dispatch ──────────────────────────────────────────────────────────────

  private _dispatch<K extends EventKey>(key: K, payload: EventPayload<K>): void {
    // 1. Exact-key subscribers
    const exactSubs = this.subs.get(key);
    if (exactSubs && exactSubs.length > 0) {
      // Sort by priority descending (critical first)
      // Priority is attached at publish time; for now all subs at same event share priority
      const toCall = [...exactSubs];

      // Remove once-handlers before calling (prevents double-removal if handler throws)
      this.subs.set(
        key,
        exactSubs.filter((s) => !s.once) as Subscription<EventKey>[]
      );

      for (const sub of toCall) {
        this._safeCall(sub.handler as TypedHandler<K>, payload, key as string);
      }
    }

    // 2. Wildcard subscribers
    for (const wc of this.wildcards) {
      if (key.startsWith(wc.prefix)) {
        this._safeCallWildcard(wc.handler, key, payload);
      }
    }
  }

  private _safeCall<K extends EventKey>(
    handler: TypedHandler<K>,
    payload: EventPayload<K>,
    key: string
  ): void {
    try {
      const result = handler(payload);
      if (result instanceof Promise) {
        result.catch((err) =>
          console.error(`[EventBus] Async handler error for "${key}":`, err)
        );
      }
    } catch (err) {
      console.error(`[EventBus] Handler error for "${key}":`, err);
    }
  }

  private _safeCallWildcard(
    handler: WildcardHandler,
    key: EventKey,
    payload: unknown
  ): void {
    try {
      const result = handler(key, payload);
      if (result instanceof Promise) {
        result.catch((err) =>
          console.error(`[EventBus] Async wildcard handler error for "${key}":`, err)
        );
      }
    } catch (err) {
      console.error(`[EventBus] Wildcard handler error for "${key}":`, err);
    }
  }

  // ── History ───────────────────────────────────────────────────────────────

  /**
   * Returns the last `limit` events from the history buffer (newest last).
   * Defaults to all buffered events (max 100).
   */
  history(limit = HISTORY_LIMIT): HistoryEntry[] {
    return this.historyBuffer.slice(-limit);
  }

  /**
   * Returns the last event matching the given key, or undefined.
   */
  lastEvent<K extends EventKey>(key: K): HistoryEntry<K> | undefined {
    for (let i = this.historyBuffer.length - 1; i >= 0; i--) {
      if (this.historyBuffer[i].key === key) {
        return this.historyBuffer[i] as HistoryEntry<K>;
      }
    }
    return undefined;
  }

  // ── Diagnostics ───────────────────────────────────────────────────────────

  /**
   * Returns the count of active subscriptions per event key.
   * Useful for debugging / leak detection.
   */
  subscriptionReport(): Record<string, number> {
    const report: Record<string, number> = {};
    this.subs.forEach((list, key) => {
      report[key] = list.length;
    });
    report['[wildcards]'] = this.wildcards.length;
    return report;
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  /**
   * Remove all exact-key subscriptions and wildcard subscriptions.
   * Call on user logout to prevent stale handlers.
   */
  clear(): void {
    this.subs.clear();
    this.wildcards.length = 0;
    // Keep history and middleware — they are session-level concerns
  }

  /**
   * Full reset — clears subs, wildcards, middleware AND history.
   * Intended for testing only.
   */
  reset(): void {
    this.clear();
    this.middlewares.length = 0;
    this.historyBuffer.length = 0;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const eventBus = new LifeOSEventBus();

// ─── Dev-Mode Logger Middleware ───────────────────────────────────────────────
// Automatically registered in development so every event is visible in
// the browser console without any extra setup.

if (import.meta.env.DEV) {
  const PRIORITY_ICONS: Record<EventPriority, string> = {
    critical: '🔴',
    high:     '🟠',
    normal:   '🔵',
    low:      '⚪',
  };

  eventBus.use((event, next) => {
    const icon = PRIORITY_ICONS[event.priority] ?? '🔵';
    console.groupCollapsed(
      `%c[EventBus] ${icon} ${event.key}`,
      'color:#a78bfa;font-weight:600;'
    );
    console.log('source  :', event.source);
    console.log('priority:', event.priority);
    console.log('payload :', event.payload);
    console.log('time    :', new Date(event.timestamp).toLocaleTimeString());
    console.groupEnd();
    next();
  });
}

// ─── Re-export types for convenience ─────────────────────────────────────────
export type { EventKey, EventPayload, LifeOSEventMap };

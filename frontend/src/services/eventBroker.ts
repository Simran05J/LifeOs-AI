/**
 * eventBroker.ts — DEPRECATED shim (Sprint 8C)
 *
 * This file is a backward-compatibility alias. All new code should import
 * directly from './eventBus'. This shim will be removed in Sprint 9.
 *
 * The old untyped `publish` / `subscribe` API is bridged through the new
 * typed EventBus so nothing breaks at runtime during the migration window.
 */
import { eventBus } from './eventBus';
import type { EventKey, EventPayload } from '../types/events';

export type EventCallback = (data: unknown) => void;

/**
 * Legacy bridge object. Wraps the new eventBus with the old untyped API.
 * @deprecated Use `eventBus` from './eventBus' instead.
 */
export const eventBroker = {
  /** @deprecated Use eventBus.on() */
  subscribe(event: string, callback: EventCallback): () => void {
    // Route through eventBus using the wildcard mechanism so any key works
    return eventBus.onWildcard(event, (_key, payload) => {
      callback(payload);
    });
  },

  /** @deprecated Use eventBus.publish() */
  publish(event: string, data: unknown): void {
    // Best-effort: cast to a known key if possible, else use 'system:sync'
    try {
      eventBus.publish(event as EventKey, data as EventPayload<EventKey>, {
        source: 'eventBroker(legacy)',
      });
    } catch {
      console.warn(`[eventBroker] Unknown event key "${event}" — event dropped.`);
    }
  },
};

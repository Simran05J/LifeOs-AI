import { eventBus } from './eventBus';
import type { EventKey } from '../types/events';

export const chatActionHandler = {
  /**
   * Process actions returned from backend chat message execution.
   * Publishes corresponding EventBus events to trigger notifications and side-effects.
   */
  processActions(userId: string, actions?: any[]): void {
    if (!actions || actions.length === 0) return;

    actions.forEach((action) => {
      console.log('[chatActionHandler] Processing remote action:', action);
      
      switch (action.entity_type) {
        case 'reminder': {
          const reminder = {
            id: action.entity_id,
            title: action.title,
            time: new Date(action.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            date: action.time.split('T')[0],
            source: 'ai'
          };
          eventBus.publish('reminder:triggered', { userId, reminder }, { source: 'chatActionHandler' });
          break;
        }

        case 'task': {
          const task = {
            id: action.entity_id,
            title: action.title,
            source: 'ai',
            completed: false
          };
          eventBus.publish('planner:task:created', { userId, task }, { source: 'chatActionHandler' });
          break;
        }

        case 'expense': {
          const transaction = {
            id: action.entity_id,
            title: action.title,
            amount: action.amount,
            type: 'expense' as const,
            category: action.category,
            transactionDate: new Date().toISOString()
          };
          eventBus.publish('finance:transaction:created', { userId, transaction }, { source: 'chatActionHandler' });
          break;
        }

        case 'trip': {
          const trip = {
            id: action.entity_id,
            destination: action.title,
            startDate: new Date().toISOString().split('T')[0],
            status: 'planned' as const
          };
          eventBus.publish('travel:trip:created', { userId, trip }, { source: 'chatActionHandler' });
          break;
        }

        case 'wellness': {
          const item = {
            id: action.entity_id,
            title: action.title,
            category: 'wellness',
            status: 'completed' as const
          };
          eventBus.publish('wellness:goal:completed', { userId, item }, { source: 'chatActionHandler' });
          break;
        }

        default:
          console.warn('[chatActionHandler] Unknown entity_type:', action.entity_type);
      }
    });

    // Final refresh trigger
    eventBus.publish('dashboard:refresh', { userId }, { source: 'chatActionHandler' });
  }
};

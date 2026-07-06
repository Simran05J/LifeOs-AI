import { Reminder } from '../types/reminder';
import { NotificationService } from './notificationService';
import { voiceAnnouncementService } from './VoiceAnnouncementService';
import { updateReminder } from './reminderService';
import { eventBus } from './eventBus';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';

/**
 * Helper to parse a YYYY-MM-DD date and HH:MM time into a local Date object.
 */
export function parseDateTimeLocal(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/**
 * Formats HH:MM time string to a user-friendly spoken 12-hour format (e.g. 6:30 PM).
 */
export function formatTimeTo12Hour(timeStr: string): string {
  if (!timeStr) return '12:00 PM';
  const [hourStr, minStr] = timeStr.split(':');
  let hour = parseInt(hourStr, 10);
  const minute = minStr || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${ampm}`;
}

/**
 * Calculates the FIRST occurrence of a reminder.
 * Used only when the reminder is created or restored after refresh.
 * Returns null if the reminder has already expired.
 */
export function getFirstOccurrence(reminder: Reminder): Date | null {
  const startDateVal = reminder.startDate || reminder.date;
  if (!startDateVal || !reminder.time) return null;

  const now = new Date();
  let occurrence = parseDateTimeLocal(startDateVal, reminder.time);
  const repeatMode = reminder.repeatMode || reminder.repeat || 'none';

  // For weekdays: adjust start date if it initially lands on Saturday or Sunday
  if (repeatMode === 'weekdays') {
    while (occurrence.getDay() === 0 || occurrence.getDay() === 6) {
      occurrence.setDate(occurrence.getDate() + 1);
    }
  }

  // One-time reminders must strictly be in the future
  if (repeatMode === 'none') {
    return occurrence > now ? occurrence : null;
  }

  // If start occurrence is already in the future, that is the first occurrence
  if (occurrence > now) {
    if (!reminder.repeatForever && reminder.endDate) {
      const [endYear, endMonth, endDay] = reminder.endDate.split('T')[0].split('-').map(Number);
      const [hour, minute] = reminder.time.split(':').map(Number);
      const endOccurrenceLimit = new Date(endYear, endMonth - 1, endDay, hour, minute, 59, 999);
      if (occurrence > endOccurrenceLimit) {
        return null;
      }
    }
    return occurrence;
  }

  // If start occurrence is in the past, calculate first future occurrence:
  const interval = reminder.interval !== undefined ? Number(reminder.interval) : 1;

  if (repeatMode === 'minutes') {
    const diffMs = now.getTime() - occurrence.getTime();
    const intervalMs = interval * 60 * 1000;
    const intervalsPassed = Math.floor(diffMs / intervalMs) + 1;
    occurrence = new Date(occurrence.getTime() + intervalsPassed * intervalMs);
  } else if (repeatMode === 'hours') {
    const diffMs = now.getTime() - occurrence.getTime();
    const intervalMs = interval * 60 * 60 * 1000;
    const intervalsPassed = Math.floor(diffMs / intervalMs) + 1;
    occurrence = new Date(occurrence.getTime() + intervalsPassed * intervalMs);
  } else {
    // Calendar scheduling path (daily, weekdays, weekly, monthly, yearly)
    let attempts = 0;
    const maxAttempts = 1000; // safety threshold to prevent infinite loops

    while (occurrence <= now && attempts < maxAttempts) {
      attempts++;
      if (repeatMode === 'daily') {
        occurrence.setDate(occurrence.getDate() + 1);
      } else if (repeatMode === 'weekdays') {
        occurrence.setDate(occurrence.getDate() + 1);
        while (occurrence.getDay() === 0 || occurrence.getDay() === 6) {
          occurrence.setDate(occurrence.getDate() + 1);
        }
      } else if (repeatMode === 'weekly') {
        occurrence.setDate(occurrence.getDate() + 7);
      } else if (repeatMode === 'monthly') {
        occurrence.setMonth(occurrence.getMonth() + 1);
      } else if (repeatMode === 'yearly') {
        occurrence.setFullYear(occurrence.getFullYear() + 1);
      } else {
        break;
      }
    }

    if (attempts >= maxAttempts) {
      console.error('[ReminderEngine] Max attempts reached in getFirstOccurrence calendar lookup.');
      return null;
    }
  }

  // Check end date bounds (if not repeatForever and endDate exists)
  if (!reminder.repeatForever && reminder.endDate) {
    const [endYear, endMonth, endDay] = reminder.endDate.split('T')[0].split('-').map(Number);
    const [hour, minute] = reminder.time.split(':').map(Number);
    const endOccurrenceLimit = new Date(endYear, endMonth - 1, endDay, hour, minute, 59, 999);
    if (occurrence > endOccurrenceLimit) {
      return null;
    }
  }

  return occurrence;
}

/**
 * Calculates the NEXT occurrence of a reminder relative to the previous scheduled occurrence.
 */
export function getNextOccurrence(reminder: Reminder, previousOccurrence: Date): Date | null {
  const repeatMode = reminder.repeatMode || reminder.repeat || 'none';
  if (repeatMode === 'none') {
    return null; // One-time reminders have no next occurrence
  }

  const interval = reminder.interval !== undefined ? Number(reminder.interval) : 1;
  let occurrence = new Date(previousOccurrence.getTime());

  if (repeatMode === 'minutes') {
    occurrence.setMinutes(occurrence.getMinutes() + interval);
  } else if (repeatMode === 'hours') {
    occurrence.setHours(occurrence.getHours() + interval);
  } else if (repeatMode === 'daily') {
    occurrence.setDate(occurrence.getDate() + 1);
  } else if (repeatMode === 'weekdays') {
    occurrence.setDate(occurrence.getDate() + 1);
    while (occurrence.getDay() === 0 || occurrence.getDay() === 6) {
      occurrence.setDate(occurrence.getDate() + 1);
    }
  } else if (repeatMode === 'weekly') {
    occurrence.setDate(occurrence.getDate() + 7);
  } else if (repeatMode === 'monthly') {
    occurrence.setMonth(occurrence.getMonth() + 1);
  } else if (repeatMode === 'yearly') {
    occurrence.setFullYear(occurrence.getFullYear() + 1);
  } else {
    return null;
  }

  // Check end date bounds (if not repeatForever and endDate exists)
  if (!reminder.repeatForever && reminder.endDate) {
    const [endYear, endMonth, endDay] = reminder.endDate.split('T')[0].split('-').map(Number);
    const [hour, minute] = reminder.time.split(':').map(Number);
    const endOccurrenceLimit = new Date(endYear, endMonth - 1, endDay, hour, minute, 59, 999);
    if (occurrence > endOccurrenceLimit) {
      return null;
    }
  }

  return occurrence;
}

export class ReminderEngine {
  private static activeTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private static lastTriggeredOccurrence: Map<string, Date> = new Map();
  private static currentUserId: string | null = null;
  private static globalVoiceEnabled: boolean = false;
  private static settingsUnsubscribe: (() => void) | null = null;
  // Kill-list: once a reminder ID is added here (via cancelReminder/delete),
  // no stale closure can ever reschedule or trigger it again.
  private static cancelledIds: Set<string> = new Set();

  /**
   * Schedules a reminder timer. Cancels any existing active timers first.
   */
  static scheduleReminder(reminder: Reminder): void {
    if (!reminder.id) return;

    // GUARD: If this reminder was explicitly cancelled (deleted by user),
    // refuse to schedule — even if a stale triggerReminder closure calls us.
    if (this.cancelledIds.has(reminder.id)) {
      console.log(`[ReminderEngine] BLOCKED schedule for cancelled reminder "${reminder.title}" (ID: ${reminder.id}).`);
      return;
    }

    // Log loaded document to verify schema values loaded from Firestore
    console.log('[ReminderEngine] Loaded Reminder Doc:', JSON.stringify(reminder, null, 2));

    // 1. Clear any duplicate/previous timer
    const existingTimer = this.activeTimers.get(reminder.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.activeTimers.delete(reminder.id);
    }

    // 2. Completed reminders are not scheduled
    if (reminder.completed) {
      return;
    }

    // 3. Compute next fire date relative to previous scheduled occurrence, or get first occurrence
    const previousOccurrence = this.lastTriggeredOccurrence.get(reminder.id);
    let nextDate: Date | null = null;

    if (previousOccurrence) {
      nextDate = getNextOccurrence(reminder, previousOccurrence);
    } else {
      nextDate = getFirstOccurrence(reminder);
    }

    // 6. Debug log before every scheduling decision
    console.log({
      reminderId: reminder.id,
      repeatMode: reminder.repeatMode || reminder.repeat || 'none',
      interval: reminder.interval !== undefined ? reminder.interval : 1,
      previousOccurrence: previousOccurrence ? previousOccurrence.toISOString() : 'none (first schedule)',
      nextOccurrence: nextDate ? nextDate.toISOString() : 'null',
      repeatForever: !!reminder.repeatForever,
      endDate: reminder.endDate
    });

    if (!nextDate) {
      console.log(`[ReminderEngine] Reminder "${reminder.title}" (ID: ${reminder.id}) has no upcoming occurrences.`);
      // Clean up maps since scheduler has finished
      this.lastTriggeredOccurrence.delete(reminder.id);
      return;
    }

    const delayMs = nextDate.getTime() - Date.now();
    if (delayMs <= 0) {
      // Loop safety fallback: if nextDate lands in the past, loop forward
      this.lastTriggeredOccurrence.set(reminder.id, nextDate);
      this.scheduleReminder(reminder);
      return;
    }

    console.log(`[ReminderEngine] Scheduled "${reminder.title}" (ID: ${reminder.id}) to trigger in ${Math.round(delayMs / 1000)}s at: ${nextDate.toString()}`);

    // 4. Handle JS setTimeout 32-bit signed int overflow (approx 24.8 days)
    const MAX_TIMEOUT_MS = 2147483647;
    // Capture the scheduled occurrence for this timer so triggerReminder knows its anchor
    const scheduledOccurrence = nextDate;
    if (delayMs > MAX_TIMEOUT_MS) {
      // Store occurrence so partial reschedule picks up from here
      this.lastTriggeredOccurrence.set(reminder.id, scheduledOccurrence);
      const timer = setTimeout(() => {
        this.scheduleReminder(reminder);
      }, MAX_TIMEOUT_MS);
      this.activeTimers.set(reminder.id, timer);
      return;
    }

    // 5. Create final timeout — store occurrence just before firing
    const timer = setTimeout(() => {
      // Mark this occurrence so rescheduling uses it as the anchor for the NEXT slot
      this.lastTriggeredOccurrence.set(reminder.id, scheduledOccurrence);
      this.triggerReminder(reminder);
    }, delayMs);

    this.activeTimers.set(reminder.id, timer);
  }

  /**
   * Triggers the notification events for a reminder when its time arrives.
   */
  private static triggerReminder(reminder: Reminder): void {
    // GUARD: If user deleted this reminder while the timer was in-flight,
    // abort immediately — do NOT play voice, do NOT reschedule.
    if (reminder.id && this.cancelledIds.has(reminder.id)) {
      console.log(`[ReminderEngine] BLOCKED trigger for cancelled reminder "${reminder.title}" (ID: ${reminder.id}).`);
      return;
    }

    const triggerTime = new Date();
    console.log(`[ReminderEngine][Stage 1] Triggering alert for reminder:`, {
      id: reminder.id,
      title: reminder.title,
      currentTime: new Date().toISOString(),
      triggerTime: triggerTime.toISOString()
    });

    // Remove active timer from state
    if (reminder.id) {
      this.activeTimers.delete(reminder.id);
    }

    let bodyText = reminder.title.trim();
    const lower = bodyText.toLowerCase();

    if (
      !lower.startsWith('time to') &&
      !lower.startsWith('time for') &&
      !lower.startsWith('it\'s time') &&
      !lower.startsWith('meeting') &&
      !lower.startsWith('appointment') &&
      !lower.startsWith('class') &&
      !lower.startsWith('call')
    ) {
      const firstChar = bodyText.charAt(0);
      const remaining = bodyText.slice(1);
      bodyText = `Time to ${firstChar.toLowerCase()}${remaining}`;
    }

    if (!bodyText.endsWith('.') && !bodyText.endsWith('!') && !bodyText.endsWith('?')) {
      bodyText = `${bodyText}.`;
    }

    const showBrowser = reminder.browserNotification !== undefined
      ? reminder.browserNotification
      : reminder.notificationEnabled;

    // Trigger Browser Notification
    if (showBrowser) {
      console.log(`[ReminderEngine][Stage 9] Browser notification condition met: showBrowser=${showBrowser}, notificationEnabled=${reminder.notificationEnabled}`);
      NotificationService.sendNotification('LifeOS AI Reminder', {
        body: bodyText,
        tag: reminder.id,
      });
    } else {
      console.log(`[ReminderEngine][Stage 9] Browser notification SKIPPED: showBrowser=${showBrowser}, notificationEnabled=${reminder.notificationEnabled}`);
    }

    // Trigger Voice Reminder
    console.log(`[ReminderEngine][Stage 9] Voice check: globalVoiceEnabled=${this.globalVoiceEnabled}, voiceNotification=${reminder.voiceNotification}`);
    if (reminder.voiceNotification) {
      console.log(`[ReminderEngine][Stage 2] Calling voiceAnnouncementService.announce()`);
      const triggerTime = new Date();

      if (showBrowser) {
        // Delay speech slightly to let browser notification display first
        setTimeout(() => {
          voiceAnnouncementService.announce({
            title: reminder.title,
            message: bodyText,
            triggerTime,
          });
        }, 300);
      } else {
        voiceAnnouncementService.announce({
          title: reminder.title,
          message: bodyText,
          triggerTime,
        });
      }
    }

    // Publish to in-app notification system
    if (this.currentUserId) {
      eventBus.publish('reminder:triggered', { userId: this.currentUserId, reminder }, { source: 'reminderEngine' });
    }

    // 6. Handle repeats or auto-completion
    const repeatMode = reminder.repeatMode || reminder.repeat || 'none';
    if (repeatMode === 'none') {
      // Clean up occurrence state
      if (reminder.id) {
        this.lastTriggeredOccurrence.delete(reminder.id);
      }
      // Mark completed in Firestore
      if (this.currentUserId && reminder.id) {
        updateReminder(this.currentUserId, reminder.id, { completed: true })
          .then(() => {
            console.log(`[ReminderEngine] One-time reminder auto-completed successfully in database: ${reminder.id}`);
          })
          .catch((err) => {
            console.error(`[ReminderEngine] Failed to auto-complete one-time reminder in database: ${reminder.id}`, err);
          });
      }
    } else {
      // Schedule NEXT occurrence. lastTriggeredOccurrence was already set to the
      // current slot just before this function was called (inside the setTimeout closure),
      // so getNextOccurrence will advance past it correctly.
      console.log(`[ReminderEngine] Rescheduling repeating reminder "${reminder.title}" for next occurrence...`);
      this.scheduleReminder(reminder);
    }
  }

  /**
   * Cancels a scheduled reminder by its ID.
   */
  static cancelReminder(reminderId: string): void {
    // Add to permanent kill-list FIRST — before clearing the timer.
    // This ensures that even if a triggerReminder closure is running
    // concurrently, it will see the cancellation and abort.
    this.cancelledIds.add(reminderId);

    const timer = this.activeTimers.get(reminderId);
    if (timer) {
      clearTimeout(timer);
      this.activeTimers.delete(reminderId);
    }
    this.lastTriggeredOccurrence.delete(reminderId);

    // Also kill any in-progress speech for this reminder
    voiceAnnouncementService.clearAndStop();

    console.log(`[ReminderEngine] Cancelled and permanently blocked reminder (ID: ${reminderId})`);
  }

  /**
   * Reschedules a reminder by cancelling and scheduling again.
   */
  static rescheduleReminder(reminder: Reminder): void {
    if (reminder.id) {
      // Remove from kill-list since user is explicitly re-scheduling
      this.cancelledIds.delete(reminder.id);
      this.lastTriggeredOccurrence.delete(reminder.id);
    }
    this.scheduleReminder(reminder);
  }

  /**
   * Restores active reminder schedules upon app refresh or login.
   */
  static restoreSchedules(userId: string, reminders: Reminder[]): void {
    console.log(`[ReminderEngine] Restoring active schedules for User: ${userId}. Total Loaded Reminders: ${reminders.length}`);
    this.currentUserId = userId;

    if (this.settingsUnsubscribe) {
      this.settingsUnsubscribe();
    }
    const db = getFirestore();
    this.settingsUnsubscribe = onSnapshot(doc(db, 'users', userId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        this.globalVoiceEnabled = data.preferences?.voice === true;
      }
    });

    // Clear all existing timeouts to prevent duplication
    this.activeTimers.forEach((timer) => clearTimeout(timer));
    this.activeTimers.clear();
    this.lastTriggeredOccurrence.clear();

    // Un-cancel any reminder IDs that are back in the active list from Firestore.
    // Keep cancelled IDs for reminders NOT in this list (they were truly deleted).
    const activeIds = new Set(reminders.map(r => r.id).filter(Boolean));
    for (const id of activeIds) {
      this.cancelledIds.delete(id as string);
    }

    // Schedule each uncompleted reminder starting from its first occurrence
    reminders.forEach((reminder) => {
      this.scheduleReminder(reminder);
    });
  }

  /**
   * Snoozes a reminder by a specific number of minutes.
   * Cancels the voice announcement and updates the reminder in Firestore for current_time + minutes.
   */
  static async snoozeReminder(userId: string, reminder: Reminder, minutes: number = 5): Promise<void> {
    console.log(`[ReminderEngine] Snoozing reminder "${reminder.title}" (ID: ${reminder.id}) for ${minutes} minutes.`);
    
    // Stop voice synthesis
    voiceAnnouncementService.clearAndStop();

    if (!reminder.id) return;

    // Calculate new local trigger time
    const now = new Date();
    const futureDate = new Date(now.getTime() + minutes * 60 * 1000);

    const pad = (num: number) => String(num).padStart(2, '0');
    
    // Format YYYY-MM-DD and HH:MM
    const dateStr = `${futureDate.getFullYear()}-${pad(futureDate.getMonth() + 1)}-${pad(futureDate.getDate())}`;
    const timeStr = `${pad(futureDate.getHours())}:${pad(futureDate.getMinutes())}:00`;

    try {
      await updateReminder(userId, reminder.id, {
        completed: false,
        date: dateStr,
        time: timeStr,
        startDate: dateStr,
        start_date: dateStr,
        updatedAt: new Date().toISOString()
      } as any);
      console.log(`[ReminderEngine] Successfully snoozed reminder in Firestore to ${dateStr} ${timeStr}`);
    } catch (err) {
      console.error(`[ReminderEngine] Failed to update reminder in database for snooze:`, err);
    }
  }
}

import { subscribePlannerTasks, PlannerTask } from './plannerService';
import { subscribeReminders } from './reminderService';
import { subscribeTransactions } from './financeService';
import { subscribeTrips } from './travelService';
import { subscribeWellnessItems } from './wellnessService';
import { Reminder } from '../types/reminder';
import { FinanceTransaction } from '../types/finance';
import { Trip } from '../types/travel';
import { WellnessItem } from '../types/wellness';
import { DashboardSummary, DashboardData } from '../types/dashboard';

/**
 * Formats a Date object to local YYYY-MM-DD string.
 */
function getLocalDateString(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Checks if a date string starts with the given prefix (used for YYYY-MM-DD comparison).
 */
function isSameDate(dateStr: string | null | undefined, targetDateStr: string): boolean {
  if (!dateStr) return false;
  return dateStr.startsWith(targetDateStr);
}

/**
 * Checks if a trip's start date is within the next 7 days.
 */
function startsInNext7Days(startDateStr: string): boolean {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${startDateStr}T00:00:00`);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7;
  } catch (err) {
    return false;
  }
}

/**
 * Checks if a transaction date falls in the current calendar month.
 */
function isCurrentMonthAndYear(dateStr: string): boolean {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  } catch (err) {
    return false;
  }
}

/**
 * Calculates the dashboard summary metrics.
 */
export function calculateDashboardSummary(
  tasks: PlannerTask[],
  reminders: Reminder[],
  transactions: FinanceTransaction[],
  trips: Trip[],
  wellnessItems: WellnessItem[]
): DashboardSummary {
  const todayStr = getLocalDateString();

  // 1. Today's Tasks: Incomplete and scheduled/due today
  const todayTasks = tasks.filter(
    (t) => !t.completed && (isSameDate(t.startDate, todayStr) || isSameDate(t.endDate, todayStr))
  );

  // 2. Today's Reminders: Incomplete and scheduled for today
  const todayReminders = reminders.filter(
    (r) => !r.completed && (isSameDate(r.date, todayStr) || isSameDate(r.startDate, todayStr))
  );

  // 3. Upcoming Trips: Status 'planned' and starting in the next 7 days
  const upcomingTrips = trips.filter(
    (t) => t.status === 'planned' && startsInNext7Days(t.startDate)
  );

  // 4. Finance Summaries: Current calendar month totals
  let monthlyIncome = 0;
  let monthlyExpense = 0;
  transactions.forEach((tx) => {
    if (isCurrentMonthAndYear(tx.transactionDate)) {
      if (tx.type === 'income') {
        monthlyIncome += tx.amount;
      } else if (tx.type === 'expense') {
        monthlyExpense += tx.amount;
      }
    }
  });
  const balance = monthlyIncome - monthlyExpense;

  // 5. Wellness Progress: Percentage completion of daily wellness goals
  const dailyGoals = wellnessItems.filter((item) => item.frequency === 'daily');
  const totalDailyTarget = dailyGoals.reduce((sum, item) => sum + item.target, 0);
  const totalDailyCurrent = dailyGoals.reduce(
    (sum, item) => sum + Math.min(item.current, item.target),
    0
  );
  const wellnessProgress =
    totalDailyTarget > 0 ? Math.round((totalDailyCurrent / totalDailyTarget) * 100) : 0;

  // 6. Completed Goals: Count of completed wellness goals
  const completedGoals = wellnessItems.filter((item) => item.status === 'completed').length;

  // 7. Pending Tasks: Count of all incomplete tasks
  const pendingTasksCount = tasks.filter((t) => !t.completed).length;

  // 8. Workspace Focus: Dynamic context-aware focus message
  let workspaceFocus = 'Stay healthy and productive';
  const ongoingTrip = trips.find(
    (t) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(`${t.startDate}T00:00:00`);
      const end = new Date(`${t.endDate}T00:00:00`);
      return today >= start && today <= end;
    }
  );

  if (ongoingTrip) {
    workspaceFocus = `Ongoing Trip to ${ongoingTrip.destination} ✈️`;
  } else if (todayTasks.length > 0) {
    workspaceFocus = `Focus on ${todayTasks.length} task${todayTasks.length === 1 ? '' : 's'} due today`;
  } else if (todayReminders.length > 0) {
    workspaceFocus = `Complete ${todayReminders.length} reminder${todayReminders.length === 1 ? '' : 's'} today`;
  } else if (wellnessProgress < 100 && dailyGoals.length > 0) {
    workspaceFocus = `Track wellness: ${wellnessProgress}% completed today`;
  }

  return {
    todayTasks,
    todayReminders,
    upcomingTrips,
    monthlyIncome,
    monthlyExpense,
    balance,
    wellnessProgress,
    completedGoals,
    pendingTasksCount,
    workspaceFocus,
  };
}

/**
 * Generates a dynamic greeting message incorporating current summary statistics.
 */
export function generateGreetingMessage(displayName: string | null, summary: DashboardSummary): string {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const name = displayName || 'Simran'; // Default to Simran per specification

  const tasksVal = summary.todayTasks.length;
  const tasksText = `${tasksVal} task${tasksVal === 1 ? '' : 's'}`;

  const remindersVal = summary.todayReminders.length;
  const remindersText = `${remindersVal} reminder${remindersVal === 1 ? '' : 's'}`;

  const tripsVal = summary.upcomingTrips.length;
  const tripsText = `${tripsVal} trip${tripsVal === 1 ? '' : 's'}`;

  return `${timeGreeting}, ${name} · ${tasksText} · ${remindersText} · ${tripsText}`;
}

/**
 * Generates custom workspace insights based on current aggregates.
 */
export function generateWorkspaceInsights(summary: DashboardSummary): string[] {
  const insights: string[] = [];

  if (summary.todayTasks.length > 0) {
    insights.push(`You have ${summary.todayTasks.length} pending tasks to focus on today.`);
  } else {
    insights.push('Great job! No pending tasks left for today.');
  }

  if (summary.wellnessProgress < 50) {
    insights.push('Remember to stay hydrated and complete your wellness goals today.');
  } else if (summary.wellnessProgress >= 80) {
    insights.push('Excellent wellness progress today! Keep it up.');
  }

  if (summary.monthlyExpense > summary.monthlyIncome) {
    insights.push('Warning: Monthly expenses have exceeded your monthly income.');
  }

  return insights;
}

/**
 * Subscribes to all dashboard dependencies and runs calculations reactively.
 * Combines 5 streams using a callback function.
 */
export function subscribeDashboardData(
  userId: string,
  userDisplayName: string | null,
  onUpdate: (data: DashboardData, isLoading: boolean) => void
): () => void {
  let tasks: PlannerTask[] = [];
  let reminders: Reminder[] = [];
  let transactions: FinanceTransaction[] = [];
  let trips: Trip[] = [];
  let wellnessItems: WellnessItem[] = [];

  const emitted = {
    tasks: false,
    reminders: false,
    transactions: false,
    trips: false,
    wellness: false,
  };

  const checkAndEmit = () => {
    const isLoading = !(
      emitted.tasks &&
      emitted.reminders &&
      emitted.transactions &&
      emitted.trips &&
      emitted.wellness
    );

    const summary = calculateDashboardSummary(tasks, reminders, transactions, trips, wellnessItems);
    const greetingMessage = generateGreetingMessage(userDisplayName, summary);

    onUpdate(
      {
        tasks,
        reminders,
        transactions,
        trips,
        wellnessItems,
        summary,
        greetingMessage,
      },
      isLoading
    );
  };

  const unsubPlanner = subscribePlannerTasks(userId, (data) => {
    tasks = data;
    emitted.tasks = true;
    checkAndEmit();
  });

  const unsubReminders = subscribeReminders(userId, (data) => {
    reminders = data;
    emitted.reminders = true;
    checkAndEmit();
  });

  const unsubFinance = subscribeTransactions(userId, (data) => {
    transactions = data;
    emitted.transactions = true;
    checkAndEmit();
  });

  const unsubTravel = subscribeTrips(userId, (data) => {
    trips = data;
    emitted.trips = true;
    checkAndEmit();
  });

  const unsubWellness = subscribeWellnessItems(userId, (data) => {
    wellnessItems = data;
    emitted.wellness = true;
    checkAndEmit();
  });

  // Return a combined cleanup function
  return () => {
    unsubPlanner();
    unsubReminders();
    unsubFinance();
    unsubTravel();
    unsubWellness();
  };
}

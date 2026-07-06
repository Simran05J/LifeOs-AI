import { PlannerTask } from '../services/plannerService';
import { Reminder } from './reminder';
import { FinanceTransaction } from './finance';
import { Trip } from './travel';
import { WellnessItem } from './wellness';

export interface DashboardSummary {
  todayTasks: PlannerTask[];
  todayReminders: Reminder[];
  upcomingTrips: Trip[];
  monthlyIncome: number;
  monthlyExpense: number;
  balance: number;
  wellnessProgress: number; // Completion percentage of daily goals (0 - 100)
  completedGoals: number; // Count of completed wellness goals today
  pendingTasksCount: number; // Count of all incomplete tasks
  workspaceFocus: string; // Brief description of workspace focus/summary
}

export interface DashboardData {
  tasks: PlannerTask[];
  reminders: Reminder[];
  transactions: FinanceTransaction[];
  trips: Trip[];
  wellnessItems: WellnessItem[];
  summary: DashboardSummary;
  greetingMessage: string;
}

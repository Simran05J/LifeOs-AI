import { WellnessItem } from '../types/wellness';

/**
 * Calculates current progress of a wellness goal.
 */
export function calculateProgress(item: WellnessItem): number {
  return item.current;
}

/**
 * Calculates completion percentage of a wellness goal (capped at 100).
 */
export function calculateCompletionPercentage(item: WellnessItem): number {
  if (item.target <= 0) return 0;
  return Math.min(Math.round((item.current / item.target) * 100), 100);
}

/**
 * Filters a list of wellness goals to return only daily ones.
 */
export function calculateDailyGoals(items: WellnessItem[]): WellnessItem[] {
  return items.filter((item) => item.frequency === 'daily');
}

/**
 * Filters a list of wellness goals to return only weekly ones.
 */
export function calculateWeeklyGoals(items: WellnessItem[]): WellnessItem[] {
  return items.filter((item) => item.frequency === 'weekly');
}

/**
 * Filters a list of wellness goals to return only monthly ones.
 */
export function calculateMonthlyGoals(items: WellnessItem[]): WellnessItem[] {
  return items.filter((item) => item.frequency === 'monthly');
}

/**
 * [AI Prep] Returns total water intake progress for today.
 */
export function getTodayWaterIntake(items: WellnessItem[]): number {
  return items
    .filter((item) => item.category === 'water' && item.frequency === 'daily')
    .reduce((sum, item) => sum + item.current, 0);
}

/**
 * [AI Prep] Returns whether the user has completed at least one workout today.
 */
export function isWorkoutCompleted(items: WellnessItem[]): boolean {
  return items.some(
    (item) => item.category === 'exercise' && item.frequency === 'daily' && item.status === 'completed'
  );
}

/**
 * [AI Prep] Returns count of goals that are currently pending.
 */
export function getPendingGoalsCount(items: WellnessItem[]): number {
  return items.filter((item) => item.status === 'active').length;
}

/**
 * [AI Prep] Returns details about meditation progress.
 */
export function getMeditationProgress(
  items: WellnessItem[]
): { current: number; target: number; unit: string; percentage: number } | null {
  const meditationGoal = items.find((item) => item.category === 'meditation');
  if (!meditationGoal) return null;

  return {
    current: meditationGoal.current,
    target: meditationGoal.target,
    unit: meditationGoal.unit,
    percentage: calculateCompletionPercentage(meditationGoal),
  };
}

/**
 * [AI Prep] Generates a comprehensive summary text of wellness stats.
 */
export function getWellnessSummaryText(items: WellnessItem[]): string {
  const activeCount = getPendingGoalsCount(items);
  const completedCount = items.filter((i) => i.status === 'completed').length;
  const waterIntake = getTodayWaterIntake(items);
  const exercised = isWorkoutCompleted(items);

  let summary = `You have completed ${completedCount} goals, with ${activeCount} active tasks remaining. `;
  
  if (waterIntake > 0) {
    summary += `You have logged ${waterIntake.toFixed(1).replace(/\.0$/, '')} units of daily water intake. `;
  } else {
    summary += `You haven't logged water intake yet today. `;
  }

  if (exercised) {
    summary += `Daily exercise goal has been successfully completed! `;
  } else {
    summary += `No daily exercise goals are completed yet. `;
  }

  return summary;
}

/**
 * Calculates a wellness score (0-100) based on completed goals vs total goals.
 */
export function calculateHealthScore(items: WellnessItem[]): number {
  if (items.length === 0) return 0;
  const completed = items.filter((item) => item.status === 'completed').length;
  return Math.round((completed / items.length) * 100);
}

/**
 * Generates habit recommendations based on current tracking trends.
 */
export function recommendHabits(items: WellnessItem[]): any[] {
  const existingCategories = items.map((i) => i.category);
  const recommendations: any[] = [];

  if (!existingCategories.includes('water')) {
    recommendations.push({
      title: 'Hydration Target',
      category: 'water',
      target: 2,
      unit: 'L',
      notes: 'Drink water regularly to stay active.',
    });
  }
  if (!existingCategories.includes('meditation')) {
    recommendations.push({
      title: 'Daily Mindfulness',
      category: 'meditation',
      target: 10,
      unit: 'min',
      notes: 'Take 10 minutes to breathe and focus.',
    });
  }

  return recommendations;
}

/**
 * Detects goals that are active but missed their progress targets.
 */
export function detectMissedGoals(items: WellnessItem[]): any[] {
  return items.filter((item) => item.status === 'active' && item.current < item.target);
}

/**
 * Generates a written summaries of user health accomplishments.
 */
export function generateWellnessSummary(items: WellnessItem[]): string {
  return getWellnessSummaryText(items);
}

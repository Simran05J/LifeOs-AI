import { FinanceTransaction } from '../types/finance';

export interface MonthlySummaryData {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  monthlyNetBalance: number;
}

export interface MonthlyHistoryPoint {
  monthLabel: string;
  expense: number;
  income: number;
}

/**
 * Checks if a transaction date falls into the same month and year as a target date.
 */
function isSameMonthAndYear(dateStr: string, targetDate: Date): boolean {
  try {
    const d = new Date(dateStr);
    return d.getFullYear() === targetDate.getFullYear() && d.getMonth() === targetDate.getMonth();
  } catch (err) {
    console.error('[FinanceEngine] Error parsing transactionDate:', dateStr, err);
    return false;
  }
}

/**
 * Calculates current calendar month summaries for income, expenses, savings, and net balance.
 */
export function monthlySummary(transactions: FinanceTransaction[]): MonthlySummaryData {
  const now = new Date();
  let monthlyIncome = 0;
  let monthlyExpenses = 0;

  transactions.forEach((tx) => {
    if (isSameMonthAndYear(tx.transactionDate, now)) {
      if (tx.type === 'income') {
        monthlyIncome += tx.amount;
      } else if (tx.type === 'expense') {
        monthlyExpenses += tx.amount;
      }
    }
  });

  const monthlySavings = monthlyIncome - monthlyExpenses;
  const monthlyNetBalance = monthlyIncome - monthlyExpenses;

  return {
    monthlyIncome,
    monthlyExpenses,
    monthlySavings,
    monthlyNetBalance,
  };
}

/**
 * Summarises expense amounts by category for the current calendar month.
 */
export function categoryBreakdown(transactions: FinanceTransaction[]): Record<string, number> {
  const now = new Date();
  const breakdown: Record<string, number> = {};

  transactions.forEach((tx) => {
    if (tx.type === 'expense' && isSameMonthAndYear(tx.transactionDate, now)) {
      const cat = tx.category.trim() || 'Other';
      breakdown[cat] = (breakdown[cat] || 0) + tx.amount;
    }
  });

  return breakdown;
}

/**
 * Calculates the spending trend compared with the previous calendar month.
 */
export function spendingTrend(transactions: FinanceTransaction[]): {
  trendText: string;
  trendPercentage: number | null;
  isUp: boolean;
} {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  let currentExpenses = 0;
  let prevExpenses = 0;

  transactions.forEach((tx) => {
    if (tx.type === 'expense') {
      if (isSameMonthAndYear(tx.transactionDate, now)) {
        currentExpenses += tx.amount;
      } else if (isSameMonthAndYear(tx.transactionDate, prevMonth)) {
        prevExpenses += tx.amount;
      }
    }
  });

  if (prevExpenses === 0) {
    return {
      trendText: 'No comparison data for last month',
      trendPercentage: null,
      isUp: false,
    };
  }

  const diff = currentExpenses - prevExpenses;
  const pct = Number(((diff / prevExpenses) * 100).toFixed(1));

  if (pct > 0) {
    return {
      trendText: `+${pct}% vs last month`,
      trendPercentage: pct,
      isUp: true,
    };
  } else if (pct < 0) {
    return {
      trendText: `${pct}% vs last month`,
      trendPercentage: Math.abs(pct),
      isUp: false,
    };
  } else {
    return {
      trendText: 'Same as last month',
      trendPercentage: 0,
      isUp: false,
    };
  }
}

/**
 * Groups historical transaction aggregates for a sequence of calendar months.
 * Useful for rendering trends and sparklines.
 */
export function getMonthlyHistory(
  transactions: FinanceTransaction[],
  monthsCount = 4
): MonthlyHistoryPoint[] {
  const points: MonthlyHistoryPoint[] = [];
  const now = new Date();

  for (let i = monthsCount - 1; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = targetDate.toLocaleDateString('en-US', { month: 'short' });

    let monthlyExp = 0;
    let monthlyInc = 0;

    transactions.forEach((tx) => {
      try {
        const d = new Date(tx.transactionDate);
        if (d.getFullYear() === targetDate.getFullYear() && d.getMonth() === targetDate.getMonth()) {
          if (tx.type === 'expense') {
            monthlyExp += tx.amount;
          } else if (tx.type === 'income') {
            monthlyInc += tx.amount;
          }
        }
      } catch (err) {
        // ignore date parsing failures
      }
    });

    points.push({
      monthLabel,
      expense: monthlyExp,
      income: monthlyInc,
    });
  }

  return points;
}

/**
 * Analyzes transactions to return simple rule-based insights.
 */
export function calculateInsights(transactions: FinanceTransaction[]): string[] {
  const insights: string[] = [];
  const summary = monthlySummary(transactions);
  const breakdown = categoryBreakdown(transactions);

  // Find highest expense category
  let highestCat = '';
  let maxAmount = 0;
  Object.entries(breakdown).forEach(([cat, amt]) => {
    if (amt > maxAmount) {
      maxAmount = amt;
      highestCat = cat;
    }
  });

  if (highestCat) {
    insights.push(`Your highest expense category is "${highestCat}".`);
  }

  if (summary.monthlyIncome > 0) {
    const expenseRatio = summary.monthlyExpenses / summary.monthlyIncome;
    if (expenseRatio > 0.8) {
      insights.push(`Warning: You have spent ${(expenseRatio * 100).toFixed(0)}% of your income this month.`);
    } else {
      const savingsRatio = summary.monthlySavings / summary.monthlyIncome;
      if (savingsRatio > 0.2) {
        insights.push(`Great job! You saved ${(savingsRatio * 100).toFixed(0)}% of your income this month.`);
      }
    }
  }

  return insights;
}

// ============================================================================
// Future AI Natural Language Queries (Architecture prep)
// ============================================================================

/**
 * Natural language helper: "How much did I spend on food?"
 */
export function getFoodExpenses(transactions: FinanceTransaction[]): number {
  let sum = 0;
  transactions.forEach((tx) => {
    if (
      tx.type === 'expense' &&
      (tx.category.toLowerCase().includes('food') || tx.title.toLowerCase().includes('food'))
    ) {
      sum += tx.amount;
    }
  });
  return sum;
}

/**
 * Natural language helper: "What was my biggest expense this month?"
 */
export function getBiggestExpense(transactions: FinanceTransaction[]): FinanceTransaction | null {
  const now = new Date();
  let biggest: FinanceTransaction | null = null;

  transactions.forEach((tx) => {
    if (tx.type === 'expense') {
      try {
        const txDate = new Date(tx.transactionDate);
        if (txDate.getFullYear() === now.getFullYear() && txDate.getMonth() === now.getMonth()) {
          if (!biggest || tx.amount > biggest.amount) {
            biggest = tx;
          }
        }
      } catch (err) {
        // ignore date errors
      }
    }
  });

  return biggest;
}

/**
 * Natural language helper: "How much did I save?"
 */
export function getSavings(transactions: FinanceTransaction[]): number {
  return monthlySummary(transactions).monthlySavings;
}

/**
 * Natural language helper: "Show my monthly report."
 */
export interface MonthlyReportData {
  summary: MonthlySummaryData;
  breakdown: Record<string, number>;
  trend: { trendText: string; trendPercentage: number | null; isUp: boolean };
  biggestExpense: FinanceTransaction | null;
  savingsRate: number;
}

export function getMonthlyReport(transactions: FinanceTransaction[]): MonthlyReportData {
  const sum = monthlySummary(transactions);
  const brk = categoryBreakdown(transactions);
  const trnd = spendingTrend(transactions);
  const biggest = getBiggestExpense(transactions);
  const savingsRate = sum.monthlyIncome > 0 ? (sum.monthlySavings / sum.monthlyIncome) * 100 : 0;

  return {
    summary: sum,
    breakdown: brk,
    trend: trnd,
    biggestExpense: biggest,
    savingsRate,
  };
}

// ============================================================================
// Future AI Hooks (Architecture preparation)
// ============================================================================

/**
 * Future Gemini hook for generating complete AI insights.
 */
export async function generateInsights(
  userId: string,
  transactions: FinanceTransaction[]
): Promise<string[]> {
  console.log(`[FinanceEngine] generateInsights stub called for user ${userId}. Transactions count: ${transactions.length}`);
  return Promise.resolve([
    'AI Suggestion: Consider shifting some of your shopping expenses to savings.',
    'AI Alert: Subscriptions are 15% higher than last month.',
  ]);
}

/**
 * Future Gemini hook for detecting overspending.
 */
export function detectOverspending(transactions: FinanceTransaction[]): string[] {
  console.log(`[FinanceEngine] detectOverspending stub called. Transactions count: ${transactions.length}`);
  return [];
}

/**
 * Future Gemini hook for predicting budget warning flags.
 */
export function budgetWarnings(transactions: FinanceTransaction[]): string[] {
  console.log(`[FinanceEngine] budgetWarnings stub called. Transactions count: ${transactions.length}`);
  return [];
}

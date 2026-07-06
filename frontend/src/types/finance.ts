export interface FinanceTransaction {
  id?: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  note: string;
  transactionDate: string; // ISO date string (YYYY-MM-DD or full ISO, mapped from/to Firestore Timestamp)
  createdAt?: string; // ISO date-time string
  updatedAt?: string; // ISO date-time string
  source: 'manual' | 'voice' | 'ai';
  recurring: boolean;
  currency: 'INR';
  agentGenerated: boolean;
}

export interface FinanceSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
}

export interface FinanceFilter {
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
  type: 'all' | 'income' | 'expense';
  category: string;
  searchQuery: string;
}

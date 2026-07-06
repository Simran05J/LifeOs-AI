import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Wallet, Plus, AlertTriangle, TrendingUp, TrendingDown, PiggyBank, BarChart3, Search, Share2 } from 'lucide-react';
import EmptyWidgetState from './EmptyWidgetState';
import FinanceModal from './FinanceModal';
import { getFirebaseAuth } from '../../../services/authService';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  exportToCSV,
  exportToPDF,
} from '../../../services/financeService';
import {
  monthlySummary,
  categoryBreakdown,
  spendingTrend,
  getMonthlyHistory,
} from '../../../services/financeEngine';

function FinanceWidget({ data = null, isLoading = false }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Tabs and Modal States
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'history' | 'analytics'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);

  // Advanced Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('all'); // 'all' | 'today' | 'week' | 'month' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'income' | 'expense'
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Toast Auto-Dismiss
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Fetch transactions helper
  const loadTransactions = async (uid) => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await getTransactions(uid);
      setTransactions(fetched);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Unable to fetch transaction history. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Auth subscription
  useEffect(() => {
    if (data) {
      setTransactions(data);
      setLoading(isLoading);
      return;
    }

    const auth = getFirebaseAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        loadTransactions(user.uid);
      } else {
        setTransactions([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [data, isLoading]);

  const openCreateModal = () => {
    setTransactionToEdit(null);
    setIsModalOpen(true);
  };

  const openEditModal = (transaction) => {
    setTransactionToEdit(transaction);
    setIsModalOpen(true);
  };

  const handleModalSave = async (fields) => {
    if (!currentUser) return;

    setError(null);
    setIsModalOpen(false);

    const payload = {
      ...fields,
      source: transactionToEdit ? transactionToEdit.source : 'manual',
    };

    if (transactionToEdit) {
      // Edit mode (optimistic update)
      const original = [...transactions];
      setTransactions((prev) =>
        prev.map((t) => (t.id === transactionToEdit.id ? { ...t, ...payload } : t))
      );

      try {
        await updateTransaction(currentUser.uid, transactionToEdit.id, payload);
        setToast({ type: 'success', title: 'Updated', message: `Transaction "${payload.title}" updated.` });
      } catch (err) {
        console.error('Failed to update transaction:', err);
        setError('Unable to update transaction. Please try again.');
        setToast({ type: 'error', title: 'Error', message: 'Failed to update transaction.' });
        setTransactions(original);
      }
    } else {
      // Create mode (optimistic update with temporary ID)
      const tempId = `temp-${Date.now()}`;
      const tempTx = {
        id: tempId,
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const original = [...transactions];
      setTransactions((prev) => [tempTx, ...prev]);

      try {
        const newTx = await createTransaction(currentUser.uid, payload);
        setTransactions((prev) =>
          prev.map((t) => (t.id === tempId ? newTx : t))
        );
        setToast({ type: 'success', title: 'Logged', message: `Transaction "${payload.title}" logged.` });
      } catch (err) {
        console.error('Failed to create transaction:', err);
        setError('Unable to save transaction. Please try again.');
        setToast({ type: 'error', title: 'Error', message: 'Failed to save transaction.' });
        setTransactions(original);
      }
    }
    setTransactionToEdit(null);
  };

  const handleDeleteTransaction = async (txId) => {
    if (!currentUser) return;

    const original = [...transactions];
    const targetTx = transactions.find((t) => t.id === txId);
    setTransactions((prev) => prev.filter((t) => t.id !== txId));

    try {
      await deleteTransaction(currentUser.uid, txId);
      setToast({ type: 'success', title: 'Deleted', message: `Transaction "${targetTx?.title || ''}" deleted.` });
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      setError('Failed to delete transaction.');
      setToast({ type: 'error', title: 'Error', message: 'Failed to delete transaction.' });
      setTransactions(original);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Helper to filter transactions based on user parameters
  const getFilteredTransactions = () => {
    return transactions.filter((tx) => {
      // 1. Search Query filter (checks title, category, note)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const inTitle = tx.title.toLowerCase().includes(query);
        const inCategory = tx.category.toLowerCase().includes(query);
        const inNote = tx.note.toLowerCase().includes(query);
        if (!inTitle && !inCategory && !inNote) return false;
      }

      // 2. Transaction Type filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      // 3. Category filter
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;

      // 4. Date Range filter
      if (dateRange !== 'all') {
        const txDate = new Date(tx.transactionDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (dateRange === 'today') {
          const todayStr = now.toISOString().split('T')[0];
          if (tx.transactionDate.split('T')[0] !== todayStr) return false;
        } else if (dateRange === 'week') {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (txDate < oneWeekAgo) return false;
        } else if (dateRange === 'month') {
          if (txDate.getFullYear() !== now.getFullYear() || txDate.getMonth() !== now.getMonth()) return false;
        } else if (dateRange === 'custom') {
          if (startDate) {
            const startLimit = new Date(`${startDate}T00:00:00`);
            if (txDate < startLimit) return false;
          }
          if (endDate) {
            const endLimit = new Date(`${endDate}T23:59:59`);
            if (txDate > endLimit) return false;
          }
        }
      }

      return true;
    });
  };

  const showLoading = loading || isLoading;

  // Intelligence derivations
  const summary = monthlySummary(transactions);
  const breakdown = categoryBreakdown(transactions);
  const trend = spendingTrend(transactions);

  // Compute unique categories for dropdown filter
  const uniqueCategories = Array.from(
    new Set(transactions.map((tx) => tx.category).filter(Boolean))
  );

  // Filtered transactions for list & exports
  const filteredTransactions = getFilteredTransactions();

  // Find the highest expense category in the current month
  let highestCategory = 'None';
  let highestAmount = 0;
  Object.entries(breakdown).forEach(([cat, amt]) => {
    if (amt > highestAmount) {
      highestAmount = amt;
      highestCategory = cat;
    }
  });

  // Analytics - last 4 months history calculations
  const historyPoints = getMonthlyHistory(transactions, 4);
  const maxExpenseHistory = Math.max(...historyPoints.map((h) => h.expense), 1000);

  // Calculate coordinates for custom SVG Line chart sparkline
  const sparklinePoints = historyPoints.map((pt, index) => {
    const x = 8 + (index * 84) / (historyPoints.length - 1);
    const y = 32 - (pt.expense / maxExpenseHistory) * 22;
    return { x, y, label: pt.monthLabel, value: pt.expense };
  });

  const pathD = sparklinePoints.reduce(
    (acc, pt, index) => `${acc}${index === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`,
    ''
  );
  const areaD = sparklinePoints.length > 0
    ? `${pathD} L ${sparklinePoints[sparklinePoints.length - 1].x} 36 L ${sparklinePoints[0].x} 36 Z`
    : '';

  // Income vs Expense Ratio calculations
  const totalVolume = summary.monthlyIncome + summary.monthlyExpenses;
  const incomePct = totalVolume > 0 ? (summary.monthlyIncome / totalVolume) * 100 : 50;
  const expensePct = totalVolume > 0 ? (summary.monthlyExpenses / totalVolume) * 100 : 50;

  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-glow flex flex-col relative transition-all duration-300">
      {/* Widget Header */}
      <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-3 select-none">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <Wallet size={14} />
          </span>
          <h3 className="text-sm font-semibold text-white">Finance Summary</h3>
        </div>
        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-300">
          Premium
        </span>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-white/5 mb-3.5 select-none">
        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          className={`flex-1 pb-2 text-[10px] font-bold text-center border-b transition-all duration-150 ${
            activeTab === 'summary'
              ? 'text-violet-400 border-violet-500'
              : 'text-slate-500 border-transparent hover:text-slate-300'
          }`}
        >
          Summary
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 pb-2 text-[10px] font-bold text-center border-b transition-all duration-150 ${
            activeTab === 'history'
              ? 'text-violet-400 border-violet-500'
              : 'text-slate-500 border-transparent hover:text-slate-300'
          }`}
        >
          History ({filteredTransactions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 pb-2 text-[10px] font-bold text-center border-b transition-all duration-150 ${
            activeTab === 'analytics'
              ? 'text-violet-400 border-violet-500'
              : 'text-slate-500 border-transparent hover:text-slate-300'
          }`}
        >
          Analytics
        </button>
      </div>

      {/* Error Alert Box */}
      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 text-[10px] text-red-300">
          <AlertTriangle size={12} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-white font-bold px-1 select-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* Widget Content */}
      {showLoading ? (
        <div className="space-y-3 py-2">
          {/* Skeleton cards */}
          <div className="grid grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
          {/* Skeleton list */}
          <div className="space-y-1.5">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        </div>
      ) : transactions.length > 0 ? (
        <div className="flex flex-col gap-3">
          
          {/* SUMMARY TAB */}
          {activeTab === 'summary' && (
            <div className="flex flex-col gap-3 animate-fade-in">
              {/* 2x2 Smart Summary Grid */}
              <div className="grid grid-cols-2 gap-2 select-none">
                {/* Monthly Balance */}
                <div className="rounded-xl border border-white/5 bg-slate-900/40 p-2.5 flex flex-col justify-between hover:bg-slate-900/65 transition-all">
                  <span className="flex items-center gap-1 text-[8px] font-bold text-slate-500 uppercase tracking-wide">
                    <Wallet size={10} className="text-violet-400" />
                    Monthly Balance
                  </span>
                  <span className={`text-[11px] font-extrabold mt-1 truncate ${summary.monthlyNetBalance >= 0 ? 'text-violet-400' : 'text-rose-400'}`}>
                    {formatCurrency(summary.monthlyNetBalance)}
                  </span>
                </div>

                {/* Highest Category */}
                <div className="rounded-xl border border-white/5 bg-slate-900/40 p-2.5 flex flex-col justify-between hover:bg-slate-900/65 transition-all">
                  <span className="flex items-center gap-1 text-[8px] font-bold text-slate-500 uppercase tracking-wide">
                    <BarChart3 size={10} className="text-rose-400" />
                    Highest Category
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-200 mt-1 truncate">
                    {highestCategory !== 'None' ? `${highestCategory}: ${formatCurrency(highestAmount)}` : 'None'}
                  </span>
                </div>

                {/* Monthly Savings */}
                <div className="rounded-xl border border-white/5 bg-slate-900/40 p-2.5 flex flex-col justify-between hover:bg-slate-900/65 transition-all">
                  <span className="flex items-center gap-1 text-[8px] font-bold text-slate-500 uppercase tracking-wide">
                    <PiggyBank size={10} className="text-emerald-400" />
                    Monthly Savings
                  </span>
                  <span className="text-[11px] font-extrabold text-emerald-400 mt-1 truncate">
                    {formatCurrency(summary.monthlySavings)}
                  </span>
                </div>

                {/* Monthly Trend */}
                <div className="rounded-xl border border-white/5 bg-slate-900/40 p-2.5 flex flex-col justify-between hover:bg-slate-900/65 transition-all">
                  <span className="flex items-center gap-1 text-[8px] font-bold text-slate-500 uppercase tracking-wide">
                    {trend.isUp ? (
                      <TrendingUp size={10} className="text-rose-400" />
                    ) : (
                      <TrendingDown size={10} className="text-emerald-400" />
                    )}
                    Monthly Trend
                  </span>
                  <span className={`text-[10px] font-bold mt-1 truncate ${trend.trendPercentage === null ? 'text-slate-400' : (trend.isUp ? 'text-rose-400' : 'text-emerald-400')}`}>
                    {trend.trendText}
                  </span>
                </div>
              </div>

              {/* Recent Spending (Show 3 for cleaner summary look) */}
              <div className="border-t border-white/5 pt-2 flex flex-col gap-1.5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5 select-none">Recent Spending</span>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                  {transactions.slice(0, 3).map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => openEditModal(tx)}
                      className="group flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/30 px-3 py-2 hover:bg-white/5 cursor-pointer transition-all duration-150"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 pr-2 select-none">
                        <span className="text-[11px] font-semibold text-slate-200 truncate group-hover:text-white transition-colors duration-150">
                          {tx.title}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-medium text-slate-400 bg-white/5 px-1.5 py-0.5 rounded capitalize">
                            {tx.category || 'Other'}
                          </span>
                          <span className="text-[8px] text-slate-500 font-medium">
                            {new Date(tx.transactionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 select-none">
                        <span className={`text-[11px] font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Add button */}
              <button
                type="button"
                onClick={openCreateModal}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 py-2 text-xs font-semibold text-slate-400 hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-violet-300 transition-all duration-150 select-none mt-1"
              >
                <Plus size={13} />
                Log Transaction
              </button>
            </div>
          )}

          {/* HISTORY & FILTERS TAB */}
          {activeTab === 'history' && (
            <div className="flex flex-col gap-3 animate-fade-in">
              {/* Filters panel */}
              <div className="rounded-xl border border-white/5 bg-white/3 p-3 space-y-2 select-none">
                {/* Search */}
                <div className="relative">
                  <Search size={11} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg bg-white/5 border border-white/10 pl-8 pr-3 py-1.5 text-[10px] text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
                  />
                </div>

                {/* Filter selects row */}
                <div className="grid grid-cols-3 gap-1.5">
                  {/* Date range picker selector */}
                  <div className="space-y-0.5">
                    <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider">Date</span>
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-white/10 px-1 py-1 text-[9px] text-slate-300 focus:outline-none"
                    >
                      <option value="all">All time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="custom">Custom...</option>
                    </select>
                  </div>

                  {/* Type */}
                  <div className="space-y-0.5">
                    <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider">Type</span>
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-white/10 px-1 py-1 text-[9px] text-slate-300 focus:outline-none"
                    >
                      <option value="all">All types</option>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>

                  {/* Category */}
                  <div className="space-y-0.5">
                    <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider">Category</span>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-white/10 px-1 py-1 text-[9px] text-slate-300 focus:outline-none capitalize"
                    >
                      <option value="all">All</option>
                      {uniqueCategories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Conditional Custom Date Fields */}
                {dateRange === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-white/5 animate-slide-down">
                    <div className="space-y-0.5">
                      <span className="text-[7px] text-slate-400">Start Date</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full rounded-lg bg-slate-900 border border-white/10 px-2 py-1 text-[9px] text-slate-300 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[7px] text-slate-400">End Date</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full rounded-lg bg-slate-900 border border-white/10 px-2 py-1 text-[9px] text-slate-300 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Transactions List */}
              <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => openEditModal(tx)}
                      className="group flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/30 px-3 py-2 hover:bg-white/5 cursor-pointer transition-all duration-150"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 pr-2 select-none">
                        <span className="text-[11px] font-semibold text-slate-200 truncate group-hover:text-white transition-colors duration-150">
                          {tx.title}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-medium text-slate-400 bg-white/5 px-1.5 py-0.5 rounded capitalize">
                            {tx.category || 'Other'}
                          </span>
                          <span className="text-[8px] text-slate-500 font-medium">
                            {new Date(tx.transactionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 select-none">
                        <span className={`text-[11px] font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-500 text-[10px] select-none">
                    No transactions match these filters.
                  </div>
                )}
              </div>

              {/* Export Panel */}
              <div className="flex gap-2 border-t border-white/5 pt-2">
                <button
                  type="button"
                  onClick={() => exportToCSV(filteredTransactions)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white/3 border border-white/5 text-[9px] font-bold text-slate-300 hover:bg-white/7 hover:text-white transition-all select-none"
                >
                  <Share2 size={10} />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => exportToPDF(filteredTransactions)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white/3 border border-white/5 text-[9px] font-bold text-slate-300 hover:bg-white/7 hover:text-white transition-all select-none"
                >
                  <Share2 size={10} />
                  Export PDF
                </button>
              </div>
            </div>
          )}

          {/* ANALYTICS (CHARTS) TAB */}
          {activeTab === 'analytics' && (
            <div className="flex flex-col gap-4.5 animate-fade-in select-none">
              
              {/* Chart 1: Income vs Expense Comparative Slider */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Income vs Expense</span>
                <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-emerald-400 font-bold">
                      Income: {formatCurrency(summary.monthlyIncome)} ({incomePct.toFixed(0)}%)
                    </span>
                    <span className="text-rose-400 font-bold">
                      Expense: {formatCurrency(summary.monthlyExpenses)} ({expensePct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-white/5 flex overflow-hidden">
                    {totalVolume > 0 ? (
                      <>
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                          style={{ width: `${incomePct}%` }}
                        />
                        <div
                          className="h-full bg-gradient-to-r from-rose-500 to-red-400 transition-all duration-300"
                          style={{ width: `${expensePct}%` }}
                        />
                      </>
                    ) : (
                      <div className="h-full w-full bg-white/10" />
                    )}
                  </div>
                </div>
              </div>

              {/* Chart 2: Expense by Category (Premium Horizontal Progress Bars) */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Expense by Category</span>
                <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 space-y-2.5 max-h-[140px] overflow-y-auto scrollbar-thin">
                  {Object.keys(breakdown).length > 0 ? (
                    Object.entries(breakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([cat, amt]) => {
                        const pct = summary.monthlyExpenses > 0 ? (amt / summary.monthlyExpenses) * 100 : 0;
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex justify-between text-[9px] text-slate-300">
                              <span className="font-semibold capitalize">{cat}</span>
                              <span className="font-bold text-slate-400">
                                {formatCurrency(amt)} ({pct.toFixed(0)}%)
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="text-center py-4 text-slate-500 text-[10px]">
                      No monthly expense breakdown available.
                    </div>
                  )}
                </div>
              </div>

              {/* Chart 3: Monthly Spending Trend (Custom SVG Sparkline Curve) */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Monthly Spending Trend</span>
                <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3">
                  <div className="text-[10px] text-slate-400 font-medium mb-1">
                    Expenses over the last 4 months
                  </div>
                  
                  {/* Custom SVG Line Chart */}
                  <svg viewBox="0 0 100 42" className="w-full h-20 mt-1 select-none overflow-visible">
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Background Grid Line */}
                    <line x1="2" y1="36" x2="98" y2="36" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                    <line x1="2" y1="20" x2="98" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" strokeDasharray="1 1" />
                    <line x1="2" y1="4" x2="98" y2="4" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" strokeDasharray="1 1" />

                    {/* Gradient Shaded Area */}
                    {sparklinePoints.length > 0 && (
                      <path d={areaD} fill="url(#trendGrad)" className="transition-all duration-300" />
                    )}

                    {/* Connecting Stroke Curve */}
                    {sparklinePoints.length > 0 && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#a78bfa"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-all duration-300"
                      />
                    )}

                    {/* Nodes and Labels */}
                    {sparklinePoints.map((pt, i) => (
                      <g key={i} className="group/node">
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="1.8"
                          fill="#8b5cf6"
                          stroke="#ffffff"
                          strokeWidth="0.4"
                          className="cursor-pointer transition-all duration-150 hover:r-2.5"
                        />
                        <text
                          x={pt.x}
                          y="41"
                          textAnchor="middle"
                          fill="#64748b"
                          fontSize="4"
                          fontWeight="bold"
                        >
                          {pt.label}
                        </text>
                        {/* Shaded hover value label */}
                        <text
                          x={pt.x}
                          y={pt.y - 3.5}
                          textAnchor="middle"
                          fill="#a78bfa"
                          fontSize="4.2"
                          fontWeight="extrabold"
                        >
                          {formatCurrency(pt.value)}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

            </div>
          )}

        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col gap-2">
          <EmptyWidgetState
            icon={Wallet}
            title="No transactions logged"
            description="Log income or expenses to see your balance."
            ctaLabel="Log Transaction"
            onCta={openCreateModal}
          />
        </div>
      )}

      {/* Modal Dialog */}
      <FinanceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTransactionToEdit(null);
        }}
        transactionToEdit={transactionToEdit}
        onSave={handleModalSave}
        onDelete={handleDeleteTransaction}
      />

      {/* Toast Feedback notifications */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-300 animate-slide-up ${
          toast.type === 'success' 
            ? 'border-emerald-500/20 bg-slate-900/90 text-emerald-300' 
            : 'border-red-500/20 bg-slate-900/90 text-red-300'
        }`}>
          <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
          <div className="flex-1 space-y-0.5 min-w-[150px]">
            <p className="text-xs font-semibold text-white">{toast.title || (toast.type === 'success' ? 'Success' : 'Error')}</p>
            <p className="text-[10px] text-slate-400">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-500 hover:text-white transition-colors duration-150 text-xs px-1.5 font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

FinanceWidget.propTypes = {
  data: PropTypes.array,
  isLoading: PropTypes.bool,
};

export default FinanceWidget;

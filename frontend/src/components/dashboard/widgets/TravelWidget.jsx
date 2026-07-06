import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Plane, Plus, AlertTriangle, Train, Bus, Car, Compass, Clock, MapPin, Search, BarChart3 } from 'lucide-react';
import EmptyWidgetState from './EmptyWidgetState';
import TravelModal from './TravelModal';
import { getFirebaseAuth } from '../../../services/authService';
import {
  getTrips,
  createTrip,
  updateTrip,
  deleteTrip
} from '../../../services/travelService';
import {
  calculateTripStatus,
  upcomingTrips,
  currentTrips,
  completedTrips,
  calculateDaysRemaining,
  calculateTripDuration,
  calculateTripProgress,
  getTravelSummary
} from '../../../services/travelEngine';

function TravelWidget({ data = null, isLoading = false }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Main Tabs: 'trips' | 'insights'
  const [activeMainTab, setActiveMainTab] = useState('trips');
  // List category tabs: 'upcoming' | 'current' | 'completed'
  const [activeListTab, setActiveListTab] = useState('upcoming');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tripToEdit, setTripToEdit] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [transportFilter, setTransportFilter] = useState('all');
  const [dateFilterType, setDateFilterType] = useState('all'); // 'all' | 'custom'
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Toast Auto-Dismiss
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Fetch trips helper
  const loadTrips = async (uid) => {
    setLoading(true);
    setError(null);
    try {
      const fetched = await getTrips(uid);
      setTrips(fetched);
    } catch (err) {
      console.error('Error fetching trips:', err);
      setError('Unable to fetch travel itinerary. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Auth subscription
  useEffect(() => {
    if (data) {
      setTrips(data);
      setLoading(isLoading);
      return;
    }

    const auth = getFirebaseAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        loadTrips(user.uid);
      } else {
        setTrips([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [data, isLoading]);

  const openCreateModal = () => {
    setTripToEdit(null);
    setIsModalOpen(true);
  };

  const openEditModal = (trip) => {
    setTripToEdit(trip);
    setIsModalOpen(true);
  };

  const handleModalSave = async (fields) => {
    if (!currentUser) return;

    setError(null);
    setIsModalOpen(false);

    const payload = {
      ...fields,
      source: tripToEdit ? tripToEdit.source : 'manual',
    };

    if (tripToEdit) {
      // Edit mode (optimistic update)
      const original = [...trips];
      setTrips((prev) =>
        prev.map((t) => (t.id === tripToEdit.id ? { ...t, ...payload } : t))
      );

      try {
        await updateTrip(currentUser.uid, tripToEdit.id, payload);
        setToast({ type: 'success', title: 'Updated', message: `Trip to "${payload.destination}" updated.` });
      } catch (err) {
        console.error('Failed to update trip:', err);
        setError('Unable to update trip. Please try again.');
        setToast({ type: 'error', title: 'Error', message: 'Failed to update trip.' });
        setTrips(original);
      }
    } else {
      // Create mode (optimistic update with temporary ID)
      const tempId = `temp-${Date.now()}`;
      const tempTrip = {
        id: tempId,
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const original = [...trips];
      setTrips((prev) => [...prev, tempTrip]);

      try {
        const newTrip = await createTrip(currentUser.uid, payload);
        setTrips((prev) =>
          prev.map((t) => (t.id === tempId ? newTrip : t))
        );
        setToast({ type: 'success', title: 'Planned', message: `Trip to "${payload.destination}" saved.` });
      } catch (err) {
        console.error('Failed to create trip:', err);
        setError('Unable to save trip. Please try again.');
        setToast({ type: 'error', title: 'Error', message: 'Failed to save trip.' });
        setTrips(original);
      }
    }
    setTripToEdit(null);
  };

  const handleDeleteTrip = async (tripId) => {
    if (!currentUser) return;

    const original = [...trips];
    const targetTrip = trips.find((t) => t.id === tripId);
    setTrips((prev) => prev.filter((t) => t.id !== tripId));

    try {
      await deleteTrip(currentUser.uid, tripId);
      setToast({ type: 'success', title: 'Deleted', message: `Trip to "${targetTrip?.destination || ''}" deleted.` });
    } catch (err) {
      console.error('Failed to delete trip:', err);
      setError('Failed to delete trip.');
      setToast({ type: 'error', title: 'Error', message: 'Failed to delete trip.' });
      setTrips(original);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getTransportationIcon = (type) => {
    switch (type) {
      case 'flight':
        return <Plane size={11} />;
      case 'train':
        return <Train size={11} />;
      case 'bus':
        return <Bus size={11} />;
      case 'car':
        return <Car size={11} />;
      case 'other':
      default:
        return <Compass size={11} />;
    }
  };

  // Group raw lists using TravelEngine
  const upcomingList = upcomingTrips(trips);
  const currentList = currentTrips(trips);
  const completedList = completedTrips(trips);
  const summary = getTravelSummary(trips);

  // Apply filters on lists
  const getFilteredTrips = (tripsList) => {
    return tripsList.filter((trip) => {
      // 1. Search Query (destination or accommodation/notes)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const destMatch = trip.destination.toLowerCase().includes(query);
        const notesMatch = (trip.notes || '').toLowerCase().includes(query);
        const stayMatch = (trip.accommodation || '').toLowerCase().includes(query);
        if (!destMatch && !notesMatch && !stayMatch) return false;
      }

      // 2. Transportation Filter
      if (transportFilter !== 'all' && trip.transportation !== transportFilter) {
        return false;
      }

      // 3. Date Filters
      if (dateFilterType === 'custom') {
        const tripStart = new Date(trip.startDate);
        const tripEnd = new Date(trip.endDate);

        if (filterStartDate) {
          const limitStart = new Date(`${filterStartDate}T00:00:00`);
          if (tripEnd < limitStart) return false;
        }
        if (filterEndDate) {
          const limitEnd = new Date(`${filterEndDate}T23:59:59`);
          if (tripStart > limitEnd) return false;
        }
      }

      return true;
    });
  };

  const activeRawList = activeListTab === 'current' 
    ? currentList 
    : activeListTab === 'completed' 
    ? completedList 
    : upcomingList;

  const filteredActiveList = getFilteredTrips(activeRawList);
  const showLoading = loading || isLoading;

  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-glow flex flex-col relative transition-all duration-300">
      {/* Widget Header */}
      <div className="mb-3 flex items-center justify-between border-b border-white/5 pb-3 select-none">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-xl bg-cyan-500/10 text-cyan-400">
            <Plane size={14} />
          </span>
          <h3 className="text-sm font-semibold text-white">Premium Travel Planner</h3>
        </div>
        <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-medium text-cyan-300">
          Premium
        </span>
      </div>

      {/* Main Mode Tabs */}
      {trips.length > 0 && !showLoading && (
        <div className="flex border-b border-white/5 mb-3.5 select-none">
          <button
            type="button"
            onClick={() => setActiveMainTab('trips')}
            className={`flex-1 pb-2 text-[10px] font-bold text-center border-b transition-all duration-150 ${
              activeMainTab === 'trips'
                ? 'text-cyan-400 border-cyan-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            Workspace
          </button>
          <button
            type="button"
            onClick={() => setActiveMainTab('insights')}
            className={`flex-1 pb-2 text-[10px] font-bold text-center border-b transition-all duration-150 ${
              activeMainTab === 'insights'
                ? 'text-cyan-400 border-cyan-500'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            Budget Insights
          </button>
        </div>
      )}

      {/* Error Alert Box */}
      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 text-[10px] text-red-300 animate-slide-down">
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

      {/* Content Rendering */}
      {showLoading ? (
        <div className="space-y-2.5 py-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <EmptyWidgetState
          icon={Plane}
          title="No trips planned yet"
          description="Plan your next adventure by adding a new trip itinerary."
          ctaLabel="Plan a Trip"
          onCta={openCreateModal}
        />
      ) : activeMainTab === 'trips' ? (
        <div className="flex flex-col gap-3">
          {/* Advanced Filters Panel */}
          <div className="rounded-xl border border-white/5 bg-slate-900/20 p-2.5 space-y-2 select-none">
            {/* Search destination */}
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-2 text-slate-500" />
              <input
                type="text"
                placeholder="Search destinations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 pl-7 pr-2.5 py-1 text-[9px] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Transportation & Dates Range Filters */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wide">Transport</span>
                <select
                  value={transportFilter}
                  onChange={(e) => setTransportFilter(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-white/10 px-1 py-0.5 text-[8.5px] text-slate-300 focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="all">All</option>
                  <option value="flight">Flight</option>
                  <option value="train">Train</option>
                  <option value="bus">Bus</option>
                  <option value="car">Car</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-0.5">
                <span className="text-[7px] font-bold text-slate-500 uppercase tracking-wide">Date Filter</span>
                <select
                  value={dateFilterType}
                  onChange={(e) => setDateFilterType(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-white/10 px-1 py-0.5 text-[8.5px] text-slate-300 focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="all">All Dates</option>
                  <option value="custom">Custom...</option>
                </select>
              </div>
            </div>

            {/* Custom Date Inputs */}
            {dateFilterType === 'custom' && (
              <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-white/5 animate-slide-down">
                <div className="space-y-0.5">
                  <span className="text-[7px] text-slate-400">Start Date</span>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-white/10 px-1.5 py-0.5 text-[8.5px] text-slate-300 focus:outline-none"
                  />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[7px] text-slate-400">End Date</span>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-white/10 px-1.5 py-0.5 text-[8.5px] text-slate-300 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sub Tab Categories Selector */}
          <div className="flex border-b border-white/5 select-none text-[9.5px]">
            <button
              type="button"
              onClick={() => setActiveListTab('upcoming')}
              className={`flex-1 pb-1.5 font-bold text-center border-b transition-all duration-150 ${
                activeListTab === 'upcoming'
                  ? 'text-cyan-400 border-cyan-500/60'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              Upcoming ({upcomingList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveListTab('current')}
              className={`flex-1 pb-1.5 font-bold text-center border-b transition-all duration-150 ${
                activeListTab === 'current'
                  ? 'text-cyan-400 border-cyan-500/60'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              Ongoing ({currentList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveListTab('completed')}
              className={`flex-1 pb-1.5 font-bold text-center border-b transition-all duration-150 ${
                activeListTab === 'completed'
                  ? 'text-cyan-400 border-cyan-500/60'
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              Completed ({completedList.length})
            </button>
          </div>

          {/* Active List of Trips */}
          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredActiveList.length > 0 ? (
              filteredActiveList.map((trip) => {
                const calculatedStatus = calculateTripStatus(trip);
                const duration = calculateTripDuration(trip);
                const daysRemaining = calculateDaysRemaining(trip);
                const progressPercentage = calculateTripProgress(trip);

                const formattedStart = new Date(trip.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                const formattedEnd = new Date(trip.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

                return (
                  <div
                    key={trip.id}
                    onClick={() => openEditModal(trip)}
                    className="group flex flex-col gap-2 rounded-xl border border-white/5 bg-slate-900/30 px-3.5 py-3 hover:bg-white/5 cursor-pointer transition-all duration-150 hover:border-cyan-500/20"
                  >
                    {/* Destination Banner */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-200 truncate select-none flex items-center gap-1">
                        <MapPin size={10} className="text-cyan-400 shrink-0" />
                        <span className="bg-gradient-to-r from-white to-cyan-300 bg-clip-text text-transparent group-hover:from-white group-hover:to-cyan-200">
                          {trip.destination}
                        </span>
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold select-none capitalize ${
                        calculatedStatus === 'ongoing' 
                          ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300' 
                          : calculatedStatus === 'completed'
                          ? 'border border-slate-500/20 bg-slate-500/10 text-slate-400'
                          : 'border border-cyan-500/20 bg-cyan-500/10 text-cyan-300'
                      }`}>
                        {calculatedStatus}
                      </span>
                    </div>

                    {/* Timeline Progression bar */}
                    <div className="flex flex-col gap-1 mt-0.5 bg-slate-950/40 rounded-lg p-2 border border-white/5">
                      <div className="flex justify-between items-center text-[8.5px] text-slate-400 font-semibold select-none">
                        <span>{formattedStart}</span>
                        <span className="text-cyan-400">{duration} {duration === 1 ? 'day' : 'days'}</span>
                        <span>{formattedEnd}</span>
                      </div>
                      
                      {/* Visual progress bar */}
                      <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            calculatedStatus === 'ongoing' 
                              ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' 
                              : calculatedStatus === 'completed'
                              ? 'bg-slate-600'
                              : 'bg-transparent'
                          }`}
                          style={{ width: `${calculatedStatus === 'ongoing' ? progressPercentage : calculatedStatus === 'completed' ? 100 : 0}%` }}
                        />
                      </div>

                      {calculatedStatus === 'ongoing' && (
                        <div className="flex justify-between items-center text-[7.5px] font-bold text-emerald-400 select-none">
                          <span>Ongoing Trip</span>
                          <span>{progressPercentage}% Completed</span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer details */}
                    <div className="flex items-center justify-between text-[9px] font-semibold select-none border-t border-white/5 pt-2 mt-0.5">
                      <div className="flex items-center gap-1 text-slate-400">
                        {getTransportationIcon(trip.transportation)}
                        <span className="capitalize">{trip.transportation}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-cyan-400 font-bold">{formatCurrency(trip.budget)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Clock size={10} className="text-slate-500" />
                        {calculatedStatus === 'planned' ? (
                          <span className="text-cyan-400">{daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left</span>
                        ) : calculatedStatus === 'ongoing' ? (
                          <span className="text-emerald-400">Active</span>
                        ) : (
                          <span className="text-slate-500">Completed</span>
                        )}
                      </div>
                    </div>

                    {trip.accommodation && (
                      <div className="text-[8.5px] text-slate-500 italic select-none truncate pl-3.5">
                        Stay: {trip.accommodation}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-500 text-[10px] select-none">
                No trips match current filters.
              </div>
            )}
          </div>

          {/* Quick Add Button */}
          <button
            type="button"
            onClick={openCreateModal}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 py-2.5 text-xs font-semibold text-slate-400 hover:border-cyan-500/30 hover:bg-cyan-500/5 hover:text-cyan-300 transition-all duration-150 select-none mt-1"
          >
            <Plus size={13} />
            Plan Trip
          </button>
        </div>
      ) : (
        /* BUDGET INSIGHTS TAB */
        <div className="flex flex-col gap-4 animate-fade-in select-none">
          {/* Summary stats grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 hover:bg-slate-900/60 transition-all">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">Total Planned Budget</span>
              <p className="text-[14px] font-black text-cyan-400 mt-1">{formatCurrency(summary.totalPlannedBudget)}</p>
            </div>

            <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 hover:bg-slate-900/60 transition-all">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">Average Budget</span>
              <p className="text-[14px] font-black text-cyan-400 mt-1">{formatCurrency(summary.averageBudget)}</p>
            </div>
          </div>

          {/* Highest budget trip card */}
          {summary.highestBudgetTrip ? (
            <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <BarChart3 size={10} className="text-cyan-400" />
                Highest Budget Trip
              </span>
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-1.5">
                  <MapPin size={11} className="text-cyan-400" />
                  <span className="text-xs font-bold text-slate-200">{summary.highestBudgetTrip.destination}</span>
                </div>
                <span className="text-xs font-black text-cyan-400">{formatCurrency(summary.highestBudgetTrip.budget)}</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-1">
                Dates: {formatDateRange(summary.highestBudgetTrip.startDate, summary.highestBudgetTrip.endDate)}
              </p>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-[10px]">
              No trip budget information logged.
            </div>
          )}

          {/* Counts & Finance integration Architecture Prep */}
          <div className="rounded-xl border border-white/5 bg-slate-900/20 p-3 space-y-2">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide block">
              Trip Stats Overview
            </span>
            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="rounded-lg bg-slate-950 p-2 border border-white/5">
                <span className="block text-slate-500 text-[7.5px] font-bold uppercase">Upcoming</span>
                <span className="font-extrabold text-cyan-400">{summary.upcomingTripsCount}</span>
              </div>
              <div className="rounded-lg bg-slate-950 p-2 border border-white/5">
                <span className="block text-slate-500 text-[7.5px] font-bold uppercase">Ongoing</span>
                <span className="font-extrabold text-emerald-400">{summary.ongoingTripsCount}</span>
              </div>
              <div className="rounded-lg bg-slate-950 p-2 border border-white/5">
                <span className="block text-slate-500 text-[7.5px] font-bold uppercase">Completed</span>
                <span className="font-extrabold text-slate-400">{summary.completedTripsCount}</span>
              </div>
            </div>
            <div className="border-t border-white/5 pt-2 text-[8px] text-slate-500 leading-normal italic select-none">
              ℹ️ Architecture prepared for future Finance module link. Trips budgets will automatically reconcile under &quot;Planned Travel Expenses&quot; inside Finance summaries.
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog */}
      <TravelModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTripToEdit(null);
        }}
        tripToEdit={tripToEdit}
        onSave={handleModalSave}
        onDelete={handleDeleteTrip}
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

// Helpers
const formatDateRange = (startStr, endStr) => {
  if (!startStr || !endStr) return '';
  const start = new Date(startStr);
  const end = new Date(endStr);
  const optMonth = { month: 'short', day: '2-digit' };

  const startFormatted = start.toLocaleDateString('en-IN', optMonth);
  const endFormatted = end.toLocaleDateString('en-IN', optMonth);
  const yearFormatted = start.getFullYear() === end.getFullYear() 
    ? start.getFullYear()
    : `${start.getFullYear()}/${end.getFullYear()}`;

  return `${startFormatted} - ${endFormatted}, ${yearFormatted}`;
};

TravelWidget.propTypes = {
  data: PropTypes.array,
  isLoading: PropTypes.bool,
};

export default TravelWidget;

import { Trip } from '../types/travel';

/**
 * Calculates the current status of a trip dynamically based on today's local date.
 */
export function calculateTripStatus(trip: Trip): 'planned' | 'ongoing' | 'completed' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(`${trip.startDate}T00:00:00`);
  const end = new Date(`${trip.endDate}T00:00:00`);

  if (today < start) {
    return 'planned';
  } else if (today > end) {
    return 'completed';
  } else {
    return 'ongoing';
  }
}

/**
 * Filters and returns trips with a calculated status of 'planned'.
 */
export function upcomingTrips(trips: Trip[]): Trip[] {
  return trips.filter((t) => calculateTripStatus(t) === 'planned');
}

/**
 * Filters and returns trips with a calculated status of 'ongoing'.
 */
export function currentTrips(trips: Trip[]): Trip[] {
  return trips.filter((t) => calculateTripStatus(t) === 'ongoing');
}

/**
 * Filters and returns trips with a calculated status of 'completed'.
 */
export function completedTrips(trips: Trip[]): Trip[] {
  return trips.filter((t) => calculateTripStatus(t) === 'completed');
}

/**
 * Calculates the number of days remaining until the trip's start date.
 * Returns 0 if the trip has already started or is completed.
 */
export function calculateDaysRemaining(trip: Trip): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(`${trip.startDate}T00:00:00`);

  if (today >= start) {
    return 0;
  }

  const diffTime = start.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Calculates the total duration of the trip in days.
 */
export function calculateTripDuration(trip: Trip): number {
  const start = new Date(`${trip.startDate}T00:00:00`);
  const end = new Date(`${trip.endDate}T00:00:00`);

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Calculates the visual progress of an ongoing trip (0 to 100 percentage).
 * Returns 0 for planned trips, 100 for completed trips.
 */
export function calculateTripProgress(trip: Trip): number {
  const today = new Date();
  const start = new Date(`${trip.startDate}T00:00:00`);
  const end = new Date(`${trip.endDate}T23:59:59`); // Include the last day fully

  if (today < start) return 0;
  if (today > end) return 100;

  const totalDurationMs = end.getTime() - start.getTime();
  if (totalDurationMs <= 0) return 100;

  const elapsedMs = today.getTime() - start.getTime();
  const percentage = (elapsedMs / totalDurationMs) * 100;
  return Math.min(100, Math.max(0, Math.round(percentage)));
}

/**
 * Calculates the average budget of all trips.
 */
export function calculateAverageBudget(trips: Trip[]): number {
  if (trips.length === 0) return 0;
  const total = trips.reduce((acc, t) => acc + (t.budget || 0), 0);
  return Math.round(total / trips.length);
}

/**
 * Identifies the trip with the highest planned budget.
 */
export function calculateHighestBudgetTrip(trips: Trip[]): Trip | null {
  if (trips.length === 0) return null;
  return trips.reduce((max, t) => ((t.budget || 0) > (max.budget || 0) ? t : max), trips[0]);
}

/**
 * Aggregates statistics for the user's trips, including counts, total budget,
 * average budget, and highest budget trip details.
 */
export interface TravelSummary {
  totalTrips: number;
  upcomingTripsCount: number;
  ongoingTripsCount: number;
  completedTripsCount: number;
  totalPlannedBudget: number;
  averageBudget: number;
  highestBudgetTrip: Trip | null;
}

export function getTravelSummary(trips: Trip[]): TravelSummary {
  let upcomingTripsCount = 0;
  let ongoingTripsCount = 0;
  let completedTripsCount = 0;
  let totalPlannedBudget = 0;

  trips.forEach((t) => {
    const status = calculateTripStatus(t);
    if (status === 'planned') {
      upcomingTripsCount++;
    } else if (status === 'ongoing') {
      ongoingTripsCount++;
    } else if (status === 'completed') {
      completedTripsCount++;
    }
    totalPlannedBudget += t.budget || 0;
  });

  return {
    totalTrips: trips.length,
    upcomingTripsCount,
    ongoingTripsCount,
    completedTripsCount,
    totalPlannedBudget,
    averageBudget: calculateAverageBudget(trips),
    highestBudgetTrip: calculateHighestBudgetTrip(trips),
  };
}

// ============================================================================
// Future AI Natural Language Queries (Architecture preparation)
// ============================================================================

/**
 * AI Query: "How many days are left until my Goa trip?"
 */
export function queryDaysUntilTrip(trips: Trip[], destination: string): number | null {
  const match = trips.find(
    (t) =>
      t.destination.toLowerCase().includes(destination.toLowerCase()) &&
      calculateTripStatus(t) === 'planned'
  );
  if (!match) return null;
  return calculateDaysRemaining(match);
}

/**
 * AI Query: "Show my upcoming trips."
 */
export function queryUpcomingTrips(trips: Trip[]): Trip[] {
  return upcomingTrips(trips);
}

/**
 * AI Query: "How much budget have I planned for travel this year?"
 */
export function queryTravelBudgetForYear(trips: Trip[], year: number): number {
  return trips
    .filter((t) => {
      try {
        const start = new Date(t.startDate);
        return start.getFullYear() === year;
      } catch (err) {
        return false;
      }
    })
    .reduce((sum, t) => sum + (t.budget || 0), 0);
}

// ============================================================================
// Future AI travel assistant features (Architecture preparation)
// ============================================================================

/**
 * Future Gemini hook for generating complete packing lists.
 */
export async function generatePackingList(trip: Trip): Promise<string[]> {
  console.log(`[TravelEngine] generatePackingList stub called for ${trip.destination}`);
  return Promise.resolve([
    'Tickets, Passport & Visas',
    `Appropriate clothing for ${trip.destination}`,
    'Chargers & adapters',
    'Personal toiletries & medications',
  ]);
}

/**
 * Future Gemini hook for generating custom travel itineraries.
 */
export async function generateItinerary(trip: Trip): Promise<string[]> {
  console.log(`[TravelEngine] generateItinerary stub called for ${trip.destination}`);
  return Promise.resolve([
    'Day 1: Arrival, hotel check-in and local exploration',
    'Day 2: City tour, major landmarks and culinary experience',
    'Day 3: Adventure or shopping trip',
    'Day 4: Departure preparation and check-out',
  ]);
}

/**
 * Future Gemini hook for estimating travel expenses.
 */
export async function estimateTravelBudget(trip: Trip): Promise<number> {
  console.log(`[TravelEngine] estimateTravelBudget stub called for ${trip.destination}`);
  return Promise.resolve(trip.budget || 25000);
}

/**
 * Future Gemini hook for suggesting nearby points of interest.
 */
export async function suggestNearbyPlaces(trip: Trip): Promise<string[]> {
  console.log(`[TravelEngine] suggestNearbyPlaces stub called for ${trip.destination}`);
  return Promise.resolve([
    'Local historical sites',
    'Downtown shopping district',
    'Scenic viewpoints & parks',
  ]);
}

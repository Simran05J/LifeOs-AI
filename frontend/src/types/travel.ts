export interface Trip {
  id?: string;
  destination: string;
  startDate: string; // ISO date string (YYYY-MM-DD)
  endDate: string; // ISO date string (YYYY-MM-DD)
  transportation: 'flight' | 'train' | 'bus' | 'car' | 'other';
  accommodation: string;
  budget: number;
  notes: string;
  status: 'planned' | 'ongoing' | 'completed';
  source: 'manual' | 'voice' | 'ai';
  createdAt?: string; // ISO date-time string
  updatedAt?: string; // ISO date-time string
  agentGenerated: boolean;
}

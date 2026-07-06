export interface WellnessItem {
  id?: string;
  title: string;
  category: 'water' | 'exercise' | 'sleep' | 'meditation' | 'nutrition' | 'custom';
  target: number;
  current: number;
  unit: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  reminderEnabled: boolean;
  notes: string;
  status: 'active' | 'completed';
  source: 'manual' | 'voice' | 'ai';
  createdAt?: string; // ISO date-time string mapped from Firestore Timestamp
  updatedAt?: string; // ISO date-time string mapped from Firestore Timestamp
  agentGenerated: boolean;
  streak?: number;
  lastCompletedDate?: string;
}

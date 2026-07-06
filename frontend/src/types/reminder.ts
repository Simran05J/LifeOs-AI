export interface Reminder {
  id?: string;
  title: string;
  description: string;
  date: string; // ISO format date string (YYYY-MM-DD) (Legacy: maps to startDate)
  time: string; // Time string (HH:MM)
  completed: boolean;
  notificationEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
  source: 'manual' | 'ai' | 'voice';
  voiceCreated: boolean;
  agentGenerated: boolean;
  browserNotification?: boolean;
  voiceNotification?: boolean;
  repeat?: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom'; // Legacy repeat option
  repeatForever?: boolean;
  endDate?: string | null;

  // Redesigned Scheduling Model Fields
  repeatMode?: 'none' | 'minutes' | 'hours' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  startDate?: string; // ISO format date string (replaces/aliases date)
}

export interface NotificationItem {
  id?: string;
  title: string;
  message: string;
  category: 'planner' | 'reminder' | 'finance' | 'travel' | 'wellness' | 'system';
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  createdAt: string; // ISO format date string
  source: string;
}

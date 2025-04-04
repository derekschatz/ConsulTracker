export interface Engagement {
  id: number;
  clientName: string;
  projectName: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'upcoming' | 'completed';
  hourlyRate: number;
}

export interface EngagementFilters {
  status: string;
  client: string;
  dateRange: 'current' | 'last' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
}

export interface EngagementsResponse {
  engagements: Engagement[];
} 
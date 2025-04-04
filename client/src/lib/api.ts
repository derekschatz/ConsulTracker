import type { EngagementFilters, EngagementsResponse } from '@/types';

export async function getEngagements(filters: Partial<EngagementFilters>): Promise<EngagementsResponse> {
  const params = new URLSearchParams();
  
  if (filters.status && filters.status !== 'all') {
    params.append('status', filters.status);
  }
  
  if (filters.client && filters.client !== 'all') {
    params.append('client', filters.client);
  }
  
  if (filters.dateRange) {
    params.append('dateRange', filters.dateRange);
  }
  
  if (filters.startDate) {
    params.append('startDate', filters.startDate);
  }
  
  if (filters.endDate) {
    params.append('endDate', filters.endDate);
  }

  const response = await fetch(`/api/engagements?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch engagements');
  }
  
  return response.json();
} 
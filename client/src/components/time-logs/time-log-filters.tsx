import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getISODate, getDateRange } from '@/lib/date-utils';

interface TimeLogFiltersProps {
  filters: {
    dateRange: string;
    engagementId: string;
    search: string;
    startDate: string;
    endDate: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    dateRange: string;
    engagementId: string;
    search: string;
    startDate: string;
    endDate: string;
  }>>;
  engagements: any[];
}

const TimeLogFilters = ({ filters, setFilters, engagements }: TimeLogFiltersProps) => {
  const [showCustomRange, setShowCustomRange] = useState(filters.dateRange === 'custom');

  useEffect(() => {
    setShowCustomRange(filters.dateRange === 'custom');
    
    // When changing to a predefined range, update the dates automatically
    if (filters.dateRange !== 'custom') {
      const referenceDate = new Date(2025, 3, 3); // April 3, 2025
      const { startDate, endDate } = getDateRange(filters.dateRange, referenceDate);
      setFilters(prev => ({
        ...prev,
        startDate: getISODate(startDate),
        endDate: getISODate(endDate)
      }));
    }
  }, [filters.dateRange]);

  const handleDateRangeChange = (value: string) => {
    setFilters(prev => ({ ...prev, dateRange: value }));
  };

  const handleEngagementChange = (value: string) => {
    setFilters(prev => ({ ...prev, engagementId: value }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    setFilters(prev => ({ 
      ...prev, 
      startDate: newStartDate 
    }));
    
    // If both start and end dates are set, we can trigger filtering immediately
    if (filters.endDate) {
      // Slight delay to ensure state updates before filtering
      setTimeout(() => {
        setFilters(prev => ({ ...prev })); // Force a re-render to trigger filtering
      }, 50);
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    setFilters(prev => ({ 
      ...prev, 
      endDate: newEndDate 
    }));
    
    // If both start and end dates are set, we can trigger filtering immediately
    if (filters.startDate) {
      // Slight delay to ensure state updates before filtering
      setTimeout(() => {
        setFilters(prev => ({ ...prev })); // Force a re-render to trigger filtering
      }, 50);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-4 pb-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="dateRangeLogFilter" className="block text-sm font-medium text-slate-700 mb-1">Date Range</Label>
            <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger id="dateRangeLogFilter">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="engagementLogFilter" className="block text-sm font-medium text-slate-700 mb-1">Engagement</Label>
            <Select value={filters.engagementId} onValueChange={handleEngagementChange}>
              <SelectTrigger id="engagementLogFilter">
                <SelectValue placeholder="All Engagements" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Engagements</SelectItem>
                {engagements.map((engagement: any) => (
                  <SelectItem key={engagement.id} value={engagement.id.toString()}>
                    {engagement.clientName} - {engagement.projectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="searchLogs" className="block text-sm font-medium text-slate-700 mb-1">Search</Label>
            <div className="relative">
              <Input
                id="searchLogs"
                placeholder="Search descriptions..."
                value={filters.search}
                onChange={handleSearchChange}
                className="pl-9"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Custom date range (hidden by default) */}
        {showCustomRange && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDateFilter" className="block text-sm font-medium text-slate-700 mb-1">Start Date</Label>
              <Input
                id="startDateFilter"
                type="date"
                value={filters.startDate || getISODate(new Date())}
                onChange={handleStartDateChange}
              />
            </div>
            <div>
              <Label htmlFor="endDateFilter" className="block text-sm font-medium text-slate-700 mb-1">End Date</Label>
              <Input
                id="endDateFilter"
                type="date"
                value={filters.endDate || getISODate(new Date())}
                onChange={handleEndDateChange}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TimeLogFilters;

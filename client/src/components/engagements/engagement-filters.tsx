import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { getISODate, getDateRange } from '@/lib/date-utils';

interface EngagementFiltersProps {
  filters: {
    status: string;
    client: string;
    dateRange: string;
    startDate?: string;
    endDate?: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    status: string;
    client: string;
    dateRange: string;
    startDate?: string;
    endDate?: string;
  }>>;
  clientOptions: string[];
}

const EngagementFilters = ({ filters, setFilters, clientOptions }: EngagementFiltersProps) => {
  const [showCustomRange, setShowCustomRange] = useState(filters.dateRange === 'custom');

  useEffect(() => {
    setShowCustomRange(filters.dateRange === 'custom');
    
    // When changing to a predefined range, update the dates automatically
    if (filters.dateRange !== 'custom') {
      const { startDate, endDate } = getDateRange(filters.dateRange);
      setFilters(prev => ({
        ...prev,
        startDate: getISODate(startDate),
        endDate: getISODate(endDate)
      }));
    }
  }, [filters.dateRange, setFilters]);

  const handleStatusChange = (value: string) => {
    setFilters(prev => ({ ...prev, status: value }));
  };

  const handleClientChange = (value: string) => {
    setFilters(prev => ({ ...prev, client: value }));
  };

  const handleDateRangeChange = (value: string) => {
    setFilters(prev => ({ ...prev, dateRange: value }));
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, startDate: e.target.value }));
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, endDate: e.target.value }));
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-4 pb-3">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="statusFilter" className="block text-sm font-medium text-foreground mb-1">Status</Label>
            <Select value={filters.status} onValueChange={handleStatusChange}>
              <SelectTrigger id="statusFilter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="clientFilter" className="block text-sm font-medium text-foreground mb-1">Client</Label>
            <Select value={filters.client} onValueChange={handleClientChange}>
              <SelectTrigger id="clientFilter">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clientOptions.map(client => (
                  <SelectItem key={client} value={client}>{client}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label htmlFor="dateRangeFilter" className="block text-sm font-medium text-foreground mb-1">Date Range</Label>
            <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger id="dateRangeFilter">
                <SelectValue placeholder="Select Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Engagements</SelectItem>
                <SelectItem value="current">Current Year</SelectItem>
                <SelectItem value="last">Last Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Custom date range inputs */}
        {showCustomRange && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDateFilter" className="block text-sm font-medium text-foreground mb-1">Start Date</Label>
              <Input
                id="startDateFilter"
                type="date"
                value={filters.startDate || getISODate(new Date())}
                onChange={handleStartDateChange}
              />
            </div>
            <div>
              <Label htmlFor="endDateFilter" className="block text-sm font-medium text-foreground mb-1">End Date</Label>
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

export default EngagementFilters;

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getISODate, getDateRange } from '@/lib/date-utils';

interface InvoiceFiltersProps {
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

const InvoiceFilters = ({ filters, setFilters, clientOptions }: InvoiceFiltersProps) => {
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="statusInvoiceFilter" className="block text-sm font-medium text-slate-700 mb-1">Status</Label>
            <Select value={filters.status} onValueChange={handleStatusChange}>
              <SelectTrigger id="statusInvoiceFilter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="clientInvoiceFilter" className="block text-sm font-medium text-slate-700 mb-1">Client</Label>
            <Select value={filters.client} onValueChange={handleClientChange}>
              <SelectTrigger id="clientInvoiceFilter">
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
          <div>
            <Label htmlFor="dateRangeInvoiceFilter" className="block text-sm font-medium text-slate-700 mb-1">Date Range</Label>
            <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger id="dateRangeInvoiceFilter">
                <SelectValue placeholder="Select Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Year</SelectItem>
                <SelectItem value="last">Last Year</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="last3">Last 3 Months</SelectItem>
                <SelectItem value="last6">Last 6 Months</SelectItem>
                <SelectItem value="last12">Last 12 Months</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Custom date range inputs */}
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

export default InvoiceFilters;

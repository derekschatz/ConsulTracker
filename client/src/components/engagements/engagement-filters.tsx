import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EngagementFiltersProps {
  filters: {
    status: string;
    client: string;
    dateRange: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    status: string;
    client: string;
    dateRange: string;
  }>>;
  clientOptions: string[];
}

const EngagementFilters = ({ filters, setFilters, clientOptions }: EngagementFiltersProps) => {
  const handleStatusChange = (value: string) => {
    setFilters(prev => ({ ...prev, status: value }));
  };

  const handleClientChange = (value: string) => {
    setFilters(prev => ({ ...prev, client: value }));
  };

  const handleDateRangeChange = (value: string) => {
    setFilters(prev => ({ ...prev, dateRange: value }));
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-4 pb-3">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Label htmlFor="statusFilter" className="block text-sm font-medium text-slate-700 mb-1">Status</Label>
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
            <Label htmlFor="clientFilter" className="block text-sm font-medium text-slate-700 mb-1">Client</Label>
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
            <Label htmlFor="dateRangeFilter" className="block text-sm font-medium text-slate-700 mb-1">Date Range</Label>
            <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger id="dateRangeFilter">
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="current">Current Year</SelectItem>
                <SelectItem value="last">Last Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EngagementFilters;

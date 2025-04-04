import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface InvoiceFiltersProps {
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

const InvoiceFilters = ({ filters, setFilters, clientOptions }: InvoiceFiltersProps) => {
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
                <SelectItem value="pending">Pending</SelectItem>
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
                <SelectValue placeholder="Current Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Year</SelectItem>
                <SelectItem value="last3">Last 3 Months</SelectItem>
                <SelectItem value="last6">Last 6 Months</SelectItem>
                <SelectItem value="last12">Last 12 Months</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceFilters;

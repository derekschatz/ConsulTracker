import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import MetricCard from './metric-card';
import MonthlyRevenueChart from './monthly-revenue-chart';
import QuickAddTimeForm from './quick-add-time-form';
import RecentActivity from './recent-activity';
import { formatCurrency, formatHours } from '@/lib/format-utils';
import { getCurrentYear } from '@/lib/date-utils';

interface DashboardStats {
  ytdRevenue: number;
  activeEngagements: number;
  monthlyHours: number;
  pendingInvoicesTotal: number;
}

interface MonthlyRevenueData {
  month: number;
  revenue: number;
  billableHours: number;
}

interface Engagement {
  id: number;
  projectName: string;
  startDate: string;
  endDate: string;
  status?: string;
  clientId?: number;
  clientName?: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(getCurrentYear().toString());
  const queryClient = useQueryClient();
  
  // Get first name for greeting
  const firstName = user?.name?.split(' ')[0] || user?.username || 'there';
  
  // Clear cache on component mount to ensure fresh data
  useEffect(() => {
    console.log('Dashboard mounted - invalidating dashboard stats query cache');
    queryClient.invalidateQueries({queryKey: ['/api/dashboard/stats']});
  }, [queryClient]);
  
  // Fetch dashboard stats
  const { 
    data: stats = {} as DashboardStats, 
    isLoading: isLoadingStats,
    error: statsError,
  } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    retry: false, // Don't retry if we get a 401
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Fetch monthly revenue data
  const { 
    data: monthlyData = [] as MonthlyRevenueData[], 
    isLoading: isLoadingMonthly,
    error: monthlyError 
  } = useQuery<MonthlyRevenueData[]>({
    queryKey: ['/api/dashboard/monthly-revenue', { year: selectedYear }],
    retry: false, // Don't retry if we get a 401
  });

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
  };
  
  // Check if we have an authentication error
  const hasAuthError = statsError || monthlyError;

  // Generate year options (current year and 5 years back)
  const currentYear = getCurrentYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => (currentYear - i).toString());

  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold text-[#0D2B47]">Hi, {firstName}!</h1>
          <div className="mt-4 sm:mt-0 flex items-center gap-4">
            <span className="text-sm text-slate-600 mr-2">Current Year:</span>
            <Select value={selectedYear} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[160px] border-slate-200">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>
      
      {hasAuthError && (
        <Alert variant="warning" className="mb-8 border-2 border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Required</AlertTitle>
          <AlertDescription>
            You must be logged in to view dashboard statistics. The data shown may not be accurate.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Paid YTD"
          value={isLoadingStats ? "Loading..." : formatCurrency(stats?.ytdRevenue || 0)}
          subtitle="Paid invoices this year"
          loading={isLoadingStats}
          className="bg-white shadow-lg rounded-xl border-0"
        />
        <MetricCard
          title="Active Engagements"
          value={isLoadingStats ? "Loading..." : stats?.activeEngagements || 0}
          subtitle="Current active projects"
          loading={isLoadingStats}
          className="bg-white shadow-lg rounded-xl border-0"
        />
        <MetricCard
          title="Hours This Month"
          value={isLoadingStats ? "Loading..." : formatHours(stats?.monthlyHours || 0)}
          subtitle="Time logged in current month"
          loading={isLoadingStats}
          className="bg-white shadow-lg rounded-xl border-0"
        />
        <MetricCard
          title="Pending Invoices"
          value={isLoadingStats ? "Loading..." : formatCurrency(stats?.pendingInvoicesTotal || 0)}
          subtitle={stats?.pendingInvoicesTotal > 0 ? "Invoices awaiting payment" : "No pending invoices"}
          loading={isLoadingStats}
          className="bg-white shadow-lg rounded-xl border-0"
        />
      </div>

      {/* Monthly Revenue Chart */}
      <Card className="mb-8 shadow-lg rounded-xl border-0">
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold text-[#0D2B47] mb-6">Monthly Revenue</h3>
          <div className="h-64">
            <MonthlyRevenueChart data={monthlyData || []} loading={isLoadingMonthly} />
          </div>
        </CardContent>
      </Card>

      {/* Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Add Time */}
        <Card className="shadow-lg rounded-xl border-0">
          <CardContent className="pt-6">
            <h3 className="text-xl font-semibold text-[#0D2B47] mb-6">Quick Add Time Log</h3>
            <QuickAddTimeForm />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="shadow-lg rounded-xl border-0">
          <CardContent className="pt-6">
            <h3 className="text-xl font-semibold text-[#0D2B47] mb-6">Recent Activity</h3>
            <RecentActivity />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

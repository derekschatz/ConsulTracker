import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MetricCard from './metric-card';
import MonthlyRevenueChart from './monthly-revenue-chart';
import QuickAddTimeForm from './quick-add-time-form';
import RecentActivity from './recent-activity';
import { formatCurrency } from '@/lib/format-utils';
import { getCurrentYear } from '@/lib/date-utils';

const Dashboard = () => {
  const [selectedYear, setSelectedYear] = useState(getCurrentYear().toString());
  
  // Fetch dashboard stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  // Fetch monthly revenue data
  const { data: monthlyData, isLoading: isLoadingMonthly } = useQuery({
    queryKey: ['/api/dashboard/monthly-revenue', { year: selectedYear }],
  });

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
  };

  // Generate year options (current year and 5 years back)
  const currentYear = getCurrentYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => (currentYear - i).toString());

  return (
    <div>
      <header className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <div className="mt-3 sm:mt-0 flex items-center">
            <span className="text-sm text-slate-600 mr-2">Current Year:</span>
            <Select value={selectedYear} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[160px]">
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <MetricCard
          title="YTD Revenue"
          value={isLoadingStats ? "Loading..." : formatCurrency(stats?.ytdRevenue || 0)}
          subtitle="vs previous year"
          trend={15.2}
          trendLabel="vs last year"
          loading={isLoadingStats}
        />
        <MetricCard
          title="Active Engagements"
          value={isLoadingStats ? "Loading..." : stats?.activeEngagements || 0}
          subtitle="2 ending this month"
          loading={isLoadingStats}
        />
        <MetricCard
          title="Hours This Month"
          value={isLoadingStats ? "Loading..." : stats?.monthlyHours || 0}
          subtitle="74.5 billable hours"
          loading={isLoadingStats}
        />
        <MetricCard
          title="Pending Invoices"
          value={isLoadingStats ? "Loading..." : formatCurrency(stats?.pendingInvoicesTotal || 0)}
          subtitle="3 invoices awaiting payment"
          loading={isLoadingStats}
        />
      </div>

      {/* Monthly Revenue Chart */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium text-slate-900 mb-4">Monthly Revenue</h3>
          <div className="h-64">
            <MonthlyRevenueChart data={monthlyData || []} loading={isLoadingMonthly} />
          </div>
        </CardContent>
      </Card>

      {/* Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Add Time */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Quick Add Time Log</h3>
            <QuickAddTimeForm />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Recent Activity</h3>
            <RecentActivity />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

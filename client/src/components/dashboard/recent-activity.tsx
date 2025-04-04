import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Clock, Check, Building2 } from 'lucide-react';
import { formatRelativeTime } from '@/lib/format-utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'wouter';

// Mocked activity data structure until we have a proper API endpoint
interface Activity {
  id: number;
  type: 'time_log' | 'invoice' | 'engagement';
  title: string;
  description: string;
  timestamp: string;
  entityId: number;
}

const RecentActivity = () => {
  // Replace with actual API call when available
  // For now, construct activities from time logs and invoices
  const { data: timeLogs = [], isLoading: isLoadingTimeLogs } = useQuery({
    queryKey: ['/api/time-logs'],
    select: (data) => data.slice(0, 3), // Just get latest 3
  });

  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['/api/invoices'],
    select: (data) => data.slice(0, 2), // Just get latest 2
  });

  // Combine and format activities
  const activities: Activity[] = [];

  // Add time logs as activities
  timeLogs.forEach((log: any) => {
    activities.push({
      id: log.id,
      type: 'time_log',
      title: `Logged ${log.hours} hours for ${log.engagement.clientName}`,
      description: log.description,
      timestamp: log.createdAt || log.date,
      entityId: log.id,
    });
  });

  // Add invoices as activities
  invoices.forEach((invoice: any) => {
    activities.push({
      id: invoice.id,
      type: 'invoice',
      title: `Created invoice #${invoice.invoiceNumber} for ${invoice.clientName}`,
      description: `$${invoice.amount} for ${new Date(invoice.periodStart).toLocaleDateString()} - ${new Date(invoice.periodEnd).toLocaleDateString()}`,
      timestamp: invoice.issueDate,
      entityId: invoice.id,
    });
  });

  // Sort by timestamp descending
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Limit to 3 most recent
  const recentActivities = activities.slice(0, 3);

  const isLoading = isLoadingTimeLogs || isLoadingInvoices;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'time_log':
        return <Clock className="h-4 w-4" />;
      case 'invoice':
        return <Check className="h-4 w-4" />;
      case 'engagement':
        return <Building2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'time_log':
        return 'bg-blue-100 text-blue-600';
      case 'invoice':
        return 'bg-green-100 text-green-600';
      case 'engagement':
        return 'bg-indigo-100 text-indigo-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      {recentActivities.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">No recent activity</p>
      ) : (
        recentActivities.map((activity) => (
          <div key={activity.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
            <div className="flex items-start">
              <div className={`h-8 w-8 rounded-full ${getActivityColor(activity.type)} flex items-center justify-center mr-3 flex-shrink-0 mt-0.5`}>
                {getActivityIcon(activity.type)}
              </div>
              <div>
                <p className="text-sm text-slate-900 font-medium">{activity.title}</p>
                <p className="text-xs text-slate-500 mt-1">{activity.description}</p>
                <p className="text-xs text-slate-400 mt-1">{formatRelativeTime(activity.timestamp)}</p>
              </div>
            </div>
          </div>
        ))
      )}
      <Link href={activities[0]?.type === 'time_log' ? '/time-logs' : '/invoices'}>
        <Button variant="link" className="p-0 h-auto text-sm text-blue-600 hover:text-blue-700 font-medium">
          View all activity
        </Button>
      </Link>
    </div>
  );
};

export default RecentActivity;

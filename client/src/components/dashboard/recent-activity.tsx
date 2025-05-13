import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Clock, Check, Building2 } from 'lucide-react';
import { formatRelativeTime } from '@/lib/format-utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

// Mocked activity data structure until we have a proper API endpoint
interface Activity {
  id: number;
  type: 'time_log' | 'invoice' | 'engagement';
  title: string;
  description: string;
  timestamp: string;
  entityId: number;
}

// Add a helper function to format dates consistently
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const RecentActivity = () => {
  // Replace with actual API call when available
  // For now, construct activities from time logs and invoices
  const { data: timeLogs = [], isLoading: isLoadingTimeLogs } = useQuery<any[], any[], any[]>({
    queryKey: ['/api/time-logs'],
    select: (data) => data.slice(0, 3), // Just get latest 3
  });

  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery<any[], any[], any[]>({
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
      title: `Created invoice #${invoice.invoice_number} for ${invoice.client_name}`,
      description: `$${invoice.total_amount} for ${formatDate(invoice.period_start)} - ${formatDate(invoice.period_end)}`,
      timestamp: invoice.issue_date,
      entityId: invoice.id,
    });
  });

  // Sort by timestamp descending
  activities.sort((a, b) => {
    // Ensure timestamps are valid before comparing
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return timeB - timeA;
  });

  // Limit to 3 most recent
  const recentActivities = activities.slice(0, 3);

  const isLoading = isLoadingTimeLogs || isLoadingInvoices;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
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
        return cn('bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400');
      case 'invoice':
        return cn('bg-green-100 text-green-600 dark:bg-green-950/30 dark:text-green-400');
      case 'engagement':
        return cn('bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400');
      default:
        return cn('bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400');
    }
  };

  return (
    <div className="space-y-4">
      {recentActivities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
      ) : (
        recentActivities.map((activity) => (
          <div key={activity.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
            <div className="flex items-start">
              <div className={`h-8 w-8 rounded-full ${getActivityColor(activity.type)} flex items-center justify-center mr-3 flex-shrink-0 mt-0.5`}>
                {getActivityIcon(activity.type)}
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">{activity.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{activity.description}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">{activity.timestamp ? formatRelativeTime(activity.timestamp) : 'Recently'}</p>
              </div>
            </div>
          </div>
        ))
      )}
      {activities.length > 0 && (
        <Link href={activities[0]?.type === 'time_log' ? '/time-logs' : '/invoices'}>
          <Button variant="link" className="p-0 h-auto text-sm text-primary hover:text-primary/80 font-medium">
            View all activity
          </Button>
        </Link>
      )}
    </div>
  );
};

export default RecentActivity;

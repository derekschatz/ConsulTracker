import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  loading?: boolean;
  className?: string;
}

const MetricCard = ({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  loading = false,
  className
}: MetricCardProps) => {
  return (
    <Card className={className}>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          {trend !== undefined && (
            <div className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium flex items-center",
              trend > 0 
                ? "bg-green-100 text-green-600 dark:bg-green-950/30 dark:text-green-400" 
                : "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400"
            )}>
              {trend > 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
              {trend > 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>
        {loading ? (
          <Skeleton className="h-8 w-32 mb-1" />
        ) : (
          <div className="text-2xl md:text-3xl font-semibold text-foreground">{value}</div>
        )}
        {subtitle && (
          <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricCard;

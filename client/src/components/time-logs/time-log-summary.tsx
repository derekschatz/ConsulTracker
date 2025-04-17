import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatHours } from '@/lib/format-utils';

interface TimeLogSummaryProps {
  totalHours: number;
  billableAmount: number;
  avgDailyHours: number;
  period: string;
}

const TimeLogSummary = ({
  totalHours,
  billableAmount,
  avgDailyHours,
  period
}: TimeLogSummaryProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-medium text-slate-500 mb-1">Total Hours</div>
          <div className="text-2xl font-semibold text-slate-900">{formatHours(totalHours)}</div>
          <div className="text-xs text-slate-500 mt-1">{period}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-medium text-slate-500 mb-1">Billable Amount</div>
          <div className="text-2xl font-semibold text-slate-900">{formatCurrency(billableAmount)}</div>
          <div className="text-xs text-slate-500 mt-1">{period}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-medium text-slate-500 mb-1">Average Daily Hours</div>
          <div className="text-2xl font-semibold text-slate-900">{formatHours(avgDailyHours)}</div>
          <div className="text-xs text-slate-500 mt-1">{period}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeLogSummary;

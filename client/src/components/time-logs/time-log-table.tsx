import { Card } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/date-utils';
import { formatCurrency, formatHours } from '@/lib/format-utils';
import { useMobile } from '@/hooks/use-mobile';

interface TimeLogTableProps {
  timeLogs: any[];
  isLoading: boolean;
  onEdit: (timeLog: any) => void;
  onDelete: (id: number) => void;
}

const TimeLogTable = ({ timeLogs, isLoading, onEdit, onDelete }: TimeLogTableProps) => {
  const isMobile = useMobile();
  
  const columns: Column<any>[] = [
    {
      accessor: 'date',
      header: 'Date',
      cell: (timeLog) => {
        try {
          // Issue: Dates are being converted to the day before due to timezone handling
          // Solution: Handle timezone by forcing the date to be interpreted in local timezone
          const dateObj = new Date(timeLog.date);
          
          // Create a new date with just the year, month, and day values
          // This forces the date to be interpreted in the local timezone
          const localDate = new Date(
            dateObj.getFullYear(),
            dateObj.getMonth(),
            dateObj.getDate() + 1  // Add one day to compensate for timezone shift
          );
          
          console.log('Original date:', timeLog.date, 'Corrected date:', localDate);
          return formatDate(localDate);
        } catch (e) {
          console.error("Error formatting date:", e, timeLog.date);
          // Fallback to direct string if there's an error
          return typeof timeLog.date === 'string' ? timeLog.date : 'Invalid date';
        }
      },
    },
    {
      accessor: 'engagement',
      header: 'Client',
      cell: (timeLog) => (
        <div>
          <div className="font-medium text-slate-900">{timeLog.engagement.clientName}</div>
          <div className="text-xs text-slate-500 mt-1 md:hidden">{timeLog.description}</div>
        </div>
      ),
    },
    {
      accessor: 'description',
      header: 'Description',
      cell: (timeLog) => timeLog.description,
      hidden: () => isMobile,
    },
    {
      accessor: 'hours',
      header: 'Hours',
      cell: (timeLog) => (
        <span className="font-medium">{formatHours(timeLog.hours)}</span>
      ),
    },
    {
      accessor: 'billableAmount',
      header: 'Billable Amount',
      cell: (timeLog) => formatCurrency(timeLog.billableAmount),
      hidden: () => isMobile,
    },
    {
      accessor: 'actions',
      header: 'Actions',
      cell: (timeLog) => (
        <div className="flex justify-end items-center space-x-3">
          <Button variant="ghost" size="icon" onClick={() => onEdit(timeLog)} className="h-8 w-8 text-slate-600 hover:text-blue-600">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(timeLog.id)} className="h-8 w-8 text-slate-600 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      className: 'text-right',
    },
  ];

  return (
    <Card className="mb-6 border shadow-sm">
      <DataTable
        data={timeLogs}
        columns={columns}
        pagination={true}
        pageSize={10}
        emptyMessage={isLoading ? "Loading time logs..." : "No time logs found"}
      />
    </Card>
  );
};

export default TimeLogTable;

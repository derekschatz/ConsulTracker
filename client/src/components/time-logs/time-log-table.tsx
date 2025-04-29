import { Card } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/date-utils';
import { formatCurrency, formatHours } from '@/lib/format-utils';
import { useMobile } from '@/hooks/use-mobile';
import { useEffect } from 'react';

interface TimeLogTableProps {
  timeLogs: any[];
  isLoading: boolean;
  onEdit: (timeLog: any) => void;
  onDelete: (id: number) => void;
}

const TimeLogTable = ({ timeLogs, isLoading, onEdit, onDelete }: TimeLogTableProps) => {
  const isMobile = useMobile();
  
  // Debug the time logs data
  useEffect(() => {
    if (timeLogs && timeLogs.length > 0) {
      console.log('Time logs in table component:', timeLogs.length);
      console.log('Sample time log:', timeLogs[0]);
      if (timeLogs[0].engagement) {
        console.log('Sample engagement data:', timeLogs[0].engagement);
      }
    }
  }, [timeLogs]);
  
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
      cell: (timeLog) => {
        // Perform thorough validation checks
        if (!timeLog) {
          console.error('Missing timeLog data');
          return <div className="text-red-500">Missing data</div>;
        }
        
        // Access clientName from the top level property, not from engagement
        // This reflects our schema change where clientName was moved out of engagement
        const clientName = timeLog.clientName || 'Unknown Client';
        
        // Debug which client name is being used
        console.log(`Time log ${timeLog.id} client name:`, {
          clientNameDirect: timeLog.clientName,
          engagementData: timeLog.engagement ? {
            projectName: timeLog.engagement.projectName,
            hourlyRate: timeLog.engagement.hourlyRate
          } : 'No engagement data'
        });
        
        return (
          <div>
            <div className="font-medium text-slate-900">
              {clientName}
            </div>
            <div className="text-xs text-slate-500 mt-1 md:hidden">
              {timeLog.description || ''}
            </div>
          </div>
        );
      },
    },
    {
      accessor: 'description',
      header: 'Description',
      cell: (timeLog) => {
        if (!timeLog) return null;
        return timeLog.description || '';
      },
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
      cell: (timeLog) => {
        // Ensure we have a valid billable amount
        let amount = 0;
        
        // First try to use the timeLog.billableAmount if it exists
        if (typeof timeLog.billableAmount === 'number') {
          amount = timeLog.billableAmount;
        } 
        // If not, try to calculate it from hours and hourly rate
        else if (timeLog.hours && timeLog.engagement?.hourlyRate) {
          amount = timeLog.hours * Number(timeLog.engagement.hourlyRate);
        }
        
        return formatCurrency(amount);
      },
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

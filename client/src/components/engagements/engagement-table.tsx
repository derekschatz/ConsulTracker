import { Card } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/date-utils';
import { formatCurrency } from '@/lib/format-utils';
import { getStatusClasses } from '@/lib/format-utils';
import { useMobile } from '@/hooks/use-mobile';

interface EngagementTableProps {
  engagements: any[];
  isLoading: boolean;
  onEdit: (engagement: any) => void;
  onDelete: (id: number) => void;
  onViewInvoiceHistory: (clientName: string) => void;
}

const EngagementTable = ({ engagements, isLoading, onEdit, onDelete, onViewInvoiceHistory }: EngagementTableProps) => {
  const isMobile = useMobile();
  
  const columns: Column<any>[] = [
    {
      accessor: 'clientName',
      header: 'Client',
      cell: (engagement) => (
        <div>
          <div className="font-medium text-slate-900">{engagement.clientName}</div>
          <div className="text-xs text-slate-500 mt-1">{engagement.projectName}</div>
        </div>
      ),
    },
    {
      accessor: 'startDate',
      header: 'Start Date',
      cell: (engagement) => formatDate(engagement.startDate),
      hidden: () => isMobile,
    },
    {
      accessor: 'endDate',
      header: 'End Date',
      cell: (engagement) => formatDate(engagement.endDate),
      hidden: () => isMobile,
    },
    {
      accessor: 'hourlyRate',
      header: 'Rate',
      cell: (engagement) => formatCurrency(engagement.hourlyRate) + '/hr',
    },
    {
      accessor: 'status',
      header: 'Status',
      cell: (engagement) => {
        const { bg, text } = getStatusClasses(engagement.status);
        return (
          <span className={`inline-flex rounded-full ${bg} ${text} px-2 py-1 text-xs font-medium`}>
            {engagement.status.charAt(0).toUpperCase() + engagement.status.slice(1)}
          </span>
        );
      },
    },
    {
      accessor: 'actions',
      header: 'Actions',
      cell: (engagement) => (
        <div className="flex justify-end items-center space-x-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onViewInvoiceHistory(engagement.clientName)} 
            className="h-8 w-8 text-slate-600 hover:text-blue-600"
            title="View Invoice History"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onEdit(engagement)} 
            className="h-8 w-8 text-slate-600 hover:text-blue-600"
            title="Edit Engagement"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onDelete(engagement.id)} 
            className="h-8 w-8 text-slate-600 hover:text-red-600"
            title="Delete Engagement"
          >
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
        data={engagements}
        columns={columns}
        pagination={true}
        pageSize={10}
        emptyMessage={isLoading ? "Loading engagements..." : "No engagements found"}
      />
    </Card>
  );
};

export default EngagementTable;

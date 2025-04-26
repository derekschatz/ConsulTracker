import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { DataTable, Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Calendar, Mail } from 'lucide-react';
import ReceiptIcon from '@/components/icons/receipt-icon';
import { formatDate } from '@/lib/date-utils';
import { formatCurrency } from '@/lib/format-utils';
import { getStatusClasses } from '@/lib/format-utils';
import { useMobile } from '@/hooks/use-mobile';
import ClientDetailsPanel from '@/components/modals/client-details-panel';

interface EngagementTableProps {
  engagements: any[];
  isLoading: boolean;
  onEdit: (engagement: any) => void;
  onDelete: (id: number) => void;
  onViewInvoiceHistory: (clientName: string) => void;
}

const EngagementTable = ({ engagements, isLoading, onEdit, onDelete, onViewInvoiceHistory }: EngagementTableProps) => {
  const isMobile = useMobile();
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isClientDetailsPanelOpen, setIsClientDetailsPanelOpen] = useState(false);
  
  const handleClientClick = (clientId: number) => {
    setSelectedClientId(clientId);
    setIsClientDetailsPanelOpen(true);
  };
  
  const columns: Column<any>[] = [
    {
      accessor: 'projectName',
      header: 'Project Name',
      cell: (engagement) => (
        <div className="truncate max-w-[200px]">
          <span className="font-medium text-slate-800">{engagement.projectName}</span>
          <div className="text-xs text-slate-500 mt-1">
            <span className="inline-block mr-2">
              {engagement.clientName}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessor: 'status',
      header: 'Status',
      cell: (engagement) => {
        const status = engagement.status;
        const { bg, text } = getStatusClasses(status);
        
        return (
          <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        );
      },
    },
    {
      accessor: 'type',
      header: 'Type',
      cell: (engagement) => {
        const type = engagement.type || 'hourly';
        
        return (
          <div className="text-sm">
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </div>
        );
      },
    },
    {
      accessor: 'duration',
      header: 'Duration',
      cell: (engagement) => {
        const startDate = formatDate(engagement.startDate);
        const endDate = formatDate(engagement.endDate);
        
        return (
          <div className="text-sm">
            <div>{startDate}</div>
            <div className="text-slate-500">to {endDate}</div>
          </div>
        );
      },
    },
    {
      accessor: 'cost',
      header: 'Cost',
      cell: (engagement) => {
        const type = engagement.type || 'hourly';
        
        return (
          <div className="text-sm">
            {type === 'hourly' ? (
              <div>
                {formatCurrency(engagement.hourlyRate || 0)}
                <span className="text-slate-500">/hr</span>
              </div>
            ) : (
              <div>
                {formatCurrency(engagement.totalCost || 0)}
                <span className="text-slate-500"> total</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessor: 'actions',
      header: 'Actions',
      cell: (engagement) => (
        <div className="flex space-x-2 justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onViewInvoiceHistory(engagement.clientName)}
            title="View Invoice History"
          >
            <ReceiptIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(engagement)}
            title="Edit Engagement"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete(engagement.id)}
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
    <>
      <Card className="mb-6 border shadow-sm">
        <DataTable
          data={engagements}
          columns={columns}
          pagination={true}
          pageSize={10}
          emptyMessage={isLoading ? "Loading engagements..." : "No engagements found"}
        />
      </Card>
      
      <ClientDetailsPanel 
        open={isClientDetailsPanelOpen}
        onOpenChange={setIsClientDetailsPanelOpen}
        clientId={selectedClientId}
      />
    </>
  );
};

export default EngagementTable;

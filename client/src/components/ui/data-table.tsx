import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export interface Column<T> {
  accessor: keyof T | ((item: T) => any);
  header: string;
  cell?: (item: T) => React.ReactNode;
  className?: string;
  hidden?: boolean | (() => boolean);
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  className?: string;
  emptyMessage?: string;
  pagination?: boolean;
  pageSize?: number;
  onRowClick?: (item: T) => void;
  rowClassName?: string | ((item: T) => string);
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  className = "",
  emptyMessage = "No data available",
  pagination = false,
  pageSize = 10,
  onRowClick,
  rowClassName,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  // Filter out hidden columns
  const visibleColumns = columns.filter(col => {
    if (typeof col.hidden === 'function') {
      return !col.hidden();
    }
    return !col.hidden;
  });

  // Calculate total pages
  const totalPages = pagination ? Math.ceil(data.length / pageSize) : 1;

  // Get current page data if pagination is enabled
  const currentData = pagination
    ? data.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : data;

  // Handle page change
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Get value for cell based on accessor
  const getCellValue = (item: T, accessor: Column<T>['accessor']) => {
    if (typeof accessor === 'function') {
      return accessor(item);
    }
    return item[accessor as keyof T];
  };

  // Handle row click
  const handleRowClick = (item: T) => {
    if (onRowClick) {
      onRowClick(item);
    }
  };

  // Get row class name
  const getRowClassName = (item: T): string => {
    if (typeof rowClassName === 'function') {
      return rowClassName(item);
    }
    return rowClassName || '';
  };

  return (
    <div className="w-full">
      <div className={`rounded-md border ${className}`}>
        <Table>
          <TableHeader>
            <TableRow>
              {visibleColumns.map((column, index) => (
                <TableHead 
                  key={index}
                  className={column.className}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={visibleColumns.length} 
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((item, rowIndex) => (
                <TableRow 
                  key={rowIndex}
                  className={`${getRowClassName(item)} ${onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                  onClick={() => handleRowClick(item)}
                >
                  {visibleColumns.map((column, colIndex) => (
                    <TableCell key={colIndex} className={column.className}>
                      {column.cell 
                        ? column.cell(item) 
                        : getCellValue(item, column.accessor)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            Showing {Math.min(((currentPage - 1) * pageSize) + 1, data.length)} to {Math.min(currentPage * pageSize, data.length)} of {data.length} entries
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

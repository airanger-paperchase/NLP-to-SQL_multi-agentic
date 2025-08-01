import React, { useState, useMemo } from "react";
import { Card } from "./Card";

interface DynamicData {
  [key: string]: any;
}

type Props = {
  data: DynamicData[];
};

const PurchaseOrderTable: React.FC<Props> = ({ data }) => {
  const [filters, setFilters] = useState<{ [key: string]: string }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Get column headers from the first object
  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  }, [data]);
  
  // Check if this is single-column data (like aggregation results)
  const isSingleColumn = useMemo(() => columns.length === 1, [columns]);

  // Filter data based on filters state
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.filter(row =>
      columns.every(
        col =>
          !filters[col] ||
          String(row[col]).toLowerCase().includes(filters[col].toLowerCase())
      )
    );
  }, [data, filters, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Handle numeric values
      const aNum = parseFloat(aValue);
      const bNum = parseFloat(bValue);
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // Handle string values
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, rowsPerPage]);

  // Calculate pagination info
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startRecord = (currentPage - 1) * rowsPerPage + 1;
  const endRecord = Math.min(currentPage * rowsPerPage, sortedData.length);

  // Handle sorting
  const handleSort = (column: string) => {
    setSortConfig(current => {
      if (current?.key === column) {
        return {
          key: column,
          direction: current.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key: column, direction: 'asc' };
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  // Early return after all hooks are called
  if (!data || data.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">No data available</div>
    );
  }

  return (
    <Card className="w-full p-4 mt-4 shadow-md rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          Query Results
          {isSingleColumn && (
            <span className="ml-2 text-sm text-blue-600 font-normal">
              (Single Value Result)
            </span>
          )}
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-700 font-semibold bg-gray-100 px-3 py-1 rounded">
            Total: {sortedData.length} rows
          </span>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-700">
            Rows per page:
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="ml-2 border rounded px-2 py-1"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </label>
          <span className="text-sm text-gray-600">
            Showing {startRecord}-{endRecord} of {sortedData.length} records
          </span>
        </div>
        
        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            First
          </button>
          <button
            onClick={() => setCurrentPage(current => Math.max(1, current - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(current => Math.min(totalPages, current + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Last
          </button>
        </div>
      </div>
      
      {/* Scrollable table container */}
      <div className="overflow-auto max-h-[600px] border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100 ${
                    isSingleColumn ? 'min-w-[300px]' : 'min-w-[120px]'
                  }`}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span>{column.replace(/_/g, " ")}</span>
                      {sortConfig?.key === column && (
                        <span className="text-blue-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={filters[column] || ""}
                      onChange={e => {
                        setFilters({ ...filters, [column]: e.target.value });
                        setCurrentPage(1);
                      }}
                      placeholder={`Filter ${column}`}
                      className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded text-xs"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {columns.map((column, colIndex) => (
                  <td
                    key={`${rowIndex}-${colIndex}`}
                    className={`px-4 py-3 text-sm text-gray-900 whitespace-nowrap ${
                      isSingleColumn ? 'min-w-[300px]' : 'min-w-[120px]'
                    }`}
                  >
                    <div 
                      className={`overflow-hidden text-ellipsis ${
                        isSingleColumn ? 'max-w-[400px]' : 'max-w-[150px]'
                      }`} 
                      title={String(row[column])}
                    >
                      {row[column]}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom pagination info */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {startRecord}-{endRecord} of {sortedData.length} records
          {Object.values(filters).some(f => f) && (
            <span className="ml-2 text-blue-600">
              (filtered from {data.length} total)
            </span>
          )}
        </span>
        <span>
          Page {currentPage} of {totalPages}
        </span>
      </div>
      
      {/* Bottom margin for chat input */}
      <div className="mb-20"></div>
    </Card>
  );
};

export default PurchaseOrderTable;
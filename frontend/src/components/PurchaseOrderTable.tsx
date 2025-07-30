import React, { useState } from "react";
import { Card } from "./Card";

interface DynamicData {
  [key: string]: any;
}

type Props = {
  data: DynamicData[];
};

const PurchaseOrderTable: React.FC<Props> = ({ data }) => {
  const [filters, setFilters] = useState<{ [key: string]: string }>({});

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">No data available</div>
    );
  }

  // Get column headers from the first object
  const columns = Object.keys(data[0]);
  
  // Check if this is single-column data (like aggregation results)
  const isSingleColumn = columns.length === 1;

  // Filter data based on filters state
  const filteredData = data.filter(row =>
    columns.every(
      col =>
        !filters[col] ||
        String(row[col]).toLowerCase().includes(filters[col].toLowerCase())
    )
  );

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
        <span className="text-sm text-gray-700 font-semibold bg-gray-100 px-3 py-1 rounded">
          Total Rows: {filteredData.length}
        </span>
      </div>
      
      {/* Scrollable table container */}
      <div className="overflow-auto max-h-[500px] border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap ${
                    isSingleColumn ? 'min-w-[300px]' : 'min-w-[150px]'
                  }`}
                >
                  <div className="flex flex-col">
                    <span>{column.replace(/_/g, " ")}</span>
                    <input
                      type="text"
                      value={filters[column] || ""}
                      onChange={e =>
                        setFilters({ ...filters, [column]: e.target.value })
                      }
                      placeholder={`Filter ${column}`}
                      className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {columns.map((column, colIndex) => (
                                  <td
                  key={`${rowIndex}-${colIndex}`}
                  className={`px-6 py-4 text-sm text-gray-900 whitespace-nowrap ${
                    isSingleColumn ? 'min-w-[300px]' : 'min-w-[150px]'
                  }`}
                >
                  <div 
                    className={`overflow-hidden text-ellipsis ${
                      isSingleColumn ? 'max-w-[400px]' : 'max-w-[200px]'
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
      
      {/* Bottom margin for chat input */}
      <div className="mb-20"></div>
    </Card>
  );
};

export default PurchaseOrderTable;
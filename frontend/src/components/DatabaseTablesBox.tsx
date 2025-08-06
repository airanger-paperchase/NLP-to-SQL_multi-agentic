import React, { useEffect, useState } from "react";
import { Database, Server, Loader2, AlertCircle } from "lucide-react";
import { cn } from "../pages/DatabaseForm"; // reuse your cn utility

const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-xl border bg-white backdrop-blur-sm shadow-xl w-full", className)} {...props}>
    {children}
  </div>
);

const CardHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 p-6 pb-4", className)} {...props}>
    {children}
  </div>
);

const CardTitle = ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-2xl font-bold leading-none tracking-tight text-[#163E5D]", className)} {...props}>
    {children}
  </h3>
);

const CardContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 pt-0", className)} {...props}>
    {children}
  </div>
);

interface DatabaseTablesBoxProps {
  onSelectionChange?: (database: string, tables: string[]) => void;
}

export default function DatabaseTablesBox({ onSelectionChange }: DatabaseTablesBoxProps) {
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>("");
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [message, setMessage] = useState<string>("");

  // Fetch databases on mount
  useEffect(() => {
    const fetchDatabases = async () => {
      try {
        const res = await fetch("/api/list_all_database");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || "Failed to fetch databases");
        }
        setDatabases(data.databases || []);
        if (data.databases?.length) {
          setSelectedDatabase(data.databases[0]);
        }
      } catch (err: any) {
        setMessage(err.message || "Failed to fetch databases");
      }
    };
    fetchDatabases();
  }, []);

  // Fetch tables when selectedDatabase changes
  useEffect(() => {
    if (!selectedDatabase) {
      setTables([]);
      return;
    }
    setLoadingTables(true);
    setMessage("");
    fetch(`/api/list_all_tables?db_name=${selectedDatabase}`)
      .then(res => res.json().then(data => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          throw new Error(data.detail || "Failed to fetch tables");
        }
        setTables(data.tables || []);
        if (!data.tables?.length) {
          setMessage("No tables found in this database.");
        }
      })
      .catch(err => setMessage(err.message || "Failed to fetch tables"))
      .finally(() => setLoadingTables(false));
  }, [selectedDatabase]);

  // Reset selected tables when tables change
  useEffect(() => {
    setSelectedTables([]);
  }, [tables]);

  // Call onSelectionChange when selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedDatabase, selectedTables);
    }
  }, [selectedDatabase, selectedTables, onSelectionChange]);

  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Database className="h-6 w-6 text-purple-800" />
          Database & Tables
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6 items-stretch">
          {/* Database Dropdown (left) */}
          <div className="w-[300px] border rounded-lg p-4 bg-gray-50 flex-shrink-0">
            <div className="flex flex-col justify-between">
              <label className="font-semibold text-[#163E5D] mb-2 flex items-center gap-1">
                <Database className="h-5 w-5" />
                Database
              </label>
              <select
                className="rounded-lg border px-4 py-2 text-sm focus:ring-2 focus:ring-purple-800"
                value={selectedDatabase}
                onChange={e => setSelectedDatabase(e.target.value)}
              >
                <option value="">Select database</option>
                {databases.map((db, idx) => (
                  <option key={idx} value={db}>{db}</option>
                ))}
              </select>
              {message && !tables.length && (
                <div className="mt-3 text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {message}
                </div>
              )}
            </div>
          </div>
          {/* Tables Box (right) */}
          <div className="flex-1 min-w-[220px] border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-[#163E5D] flex items-center gap-2">
                <Server className="h-5 w-5" />
                Tables
              </div>
              {tables.length > 0 && (
                <button
                  className="text-sm px-3 py-1 rounded bg-gradient-to-br from-purple-800 via-purple-900 to-purple-950 text-white transition"
                  type="button"
                  onClick={() => {
                    if (selectedTables.length === tables.length) {
                      setSelectedTables([]);
                    } else {
                      setSelectedTables([...tables]);
                    }
                  }}
                >
                  {selectedTables.length === tables.length ? "Unselect All" : "Select All"}
                </button>
              )}
            </div>
            {loadingTables ? (
              <div className="flex items-center justify-center h-24 text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                Loading tables...
              </div>
            ) : selectedDatabase ? (
              tables.length > 0 ? (
                <div
                  className="grid grid-cols-4 gap-2"
                  style={{
                    maxHeight: "100px", // 3 rows * 56px (approx height per row)
                    overflowY: "auto",
                    minHeight: "72px"
                  }}
                >
                  {tables.map((table, idx) => (
                    <label key={idx} className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="accent-purple-800"
                        checked={selectedTables.includes(table)}
                        onChange={() => {
                          setSelectedTables(selectedTables.includes(table)
                            ? selectedTables.filter(t => t !== table)
                            : [...selectedTables, table]
                          );
                        }}
                      />
                      <span>{table}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-500">
                  <AlertCircle className="h-4 w-4" />
                  {message || "No tables found."}
                </div>
              )
            ) : (
              <div className="text-gray-400">Select a database to view tables.</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import React, { useEffect, useState } from "react";
import axios from "axios";
import background from '../assets/windmills-snowy-landscape.jpg';
import Logo from '../assets/logo-paperchase.png';
import { Link } from "react-router";
import { Database } from "lucide-react";

// --- Styled Button and Utility ---
const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'default' | 'outline' | 'destructive' | 'secondary';
    size?: 'default' | 'sm' | 'lg';
  }
>(({ className, variant = 'default', size = 'default', ...props }, ref) => {
  const variants = {
    default: "bg-gradient-to-r from-[#BF2A2D] to-[#BF2A2D] hover:from-[#2F82C3] hover:to-[#163E5D] text-white",
    outline: "border-2 border-[#BF2A2D] text-[#BF2A2D] hover:bg-[#BF2A2D] hover:text-white",
    destructive: "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white",
    secondary: "bg-gradient-to-r from-[#2F82C3] to-[#163E5D] hover:from-[#BF2A2D] hover:to-[#BF2A2D] text-white"
  };

  const sizes = {
    default: "h-11 px-6 py-2",
    sm: "h-9 px-4 py-1.5 text-sm",
    lg: "h-12 px-8 py-3 text-lg"
  };

  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      ].join(" ")}
      ref={ref}
      {...props}
    />
  );
});

const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={`rounded-xl border bg-white/95 backdrop-blur-sm shadow-xl ${className || ""}`} {...props}>
        {children}
    </div>
);

function RetrieveSchema({ onSelect }: { onSelect: (db: string, table: string) => void }) {
    const [databases, setDatabases] = useState<string[]>([]);
    const [tables, setTables] = useState<string[]>([]);
    const [selectedDb, setSelectedDb] = useState("");
    const [selectedTable, setSelectedTable] = useState("");
    const [schema, setSchema] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Fetch all databases
    useEffect(() => {
        axios.get("/api/list_all_database")
            .then(res => setDatabases(res.data.databases || []))
            .catch(err => {
                setError("Error fetching databases.");
            });
    }, []);

    // Fetch tables when a database is selected
    useEffect(() => {
        if (selectedDb) {
            axios.get(`/api/list_all_tables?db_name=${selectedDb}`)
                .then(res => {
                    setTables(res.data.tables || []);
                    setSelectedTable("");
                })
                .catch(err => {
                    setError("Error fetching tables.");
                });
        }
    }, [selectedDb]);

    const handleDbChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const db = e.target.value;
        setSelectedDb(db);
        setSchema([]);
        setError("");
        onSelect(db, "");
    };

    const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const table = e.target.value;
        setSelectedTable(table);
        onSelect(selectedDb, table);
    };

    const handleSubmit = () => {
        if (!selectedTable || !selectedDb) {
            setError("Please select both a database and a table.");
            return;
        }
        setError("");
        setLoading(true);
        setSchema([]);
        axios.get(`/api/retrieve-schema?table_name=${selectedTable}&db_name=${selectedDb}`)
            .then(res => {
                setSchema(res.data.schema || []);
                setLoading(false);
            })
            .catch(err => {
                setError("Failed to retrieve schema.");
                setLoading(false);
            });
    };

    return (
        <div
            className="min-h-screen bg-cover bg-center bg-fixed"
            style={{ backgroundImage: `url(${background})` }}
        >
            {/* Header */}
            <div className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-gray-200">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Database className="h-8 w-8 text-[#BF2A2D]" />
                            <h1 className="text-2xl font-bold text-[#163E5D]">Database Schema Explorer</h1>
                        </div>
                        <Link to='/'>
                            <img src={Logo} alt="Logo" width={150} height={106} className="hover:scale-105 transition-transform duration-200" />
                        </Link>
                    </div>
                </div>
            </div>

            <div className="container mx-auto space-y-6 p-4">
                <Card className="max-w-3xl mx-auto mt-8 p-6">
                    <div className="flex gap-4 items-end mb-4">
                        <div className="flex-1">
                            <label className="text-[#163E5D] font-semibold">Select Database:</label>
                            <select
                                value={selectedDb}
                                onChange={handleDbChange}
                                className="w-full border border-[#2F82C3] p-2 rounded-lg mt-1 text-[#163E5D] focus:ring-2 focus:ring-[#BF2A2D]"
                            >
                                <option value="">Choose Database</option>
                                {databases.map((db, i) => <option key={i} value={db}>{db}</option>)}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="text-[#163E5D] font-semibold">Select Table:</label>
                            <select
                                value={selectedTable}
                                onChange={handleTableChange}
                                disabled={!selectedDb}
                                className="w-full border border-[#2F82C3] p-2 rounded-lg mt-1 text-[#163E5D] disabled:bg-gray-100 focus:ring-2 focus:ring-[#BF2A2D]"
                            >
                                <option value="">Choose Table</option>
                                {tables.map((table, i) => <option key={i} value={table}>{table}</option>)}
                            </select>
                        </div>
                        <Button
                            onClick={handleSubmit}
                            disabled={!selectedTable || loading}
                            className="min-w-[120px]"
                        >
                            {loading ? "Loading..." : "Retrieve Schema"}
                        </Button>
                    </div>
                    {error && <div className="mt-4 text-red-600">{error}</div>}

                    {schema.length > 0 && (
                        <div className="bg-white shadow-md rounded-lg border border-blue-200 overflow-auto max-h-[330px] mt-6">
                            <table className="w-full text-left table-auto">
                                <thead className="bg-blue-100 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 text-[#163E5D] font-semibold">Column Name</th>
                                        <th className="px-6 py-3 text-[#163E5D] font-semibold">Data Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {schema.map((row, i) => (
                                        <tr key={i} className="hover:bg-blue-50">
                                            <td className="px-6 py-3 border-t border-blue-100">{row.column_name}</td>
                                            <td className="px-6 py-3 border-t border-blue-100">{row.type}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

export default RetrieveSchema;

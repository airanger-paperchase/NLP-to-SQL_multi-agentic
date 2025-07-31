import React, { useState, useEffect } from "react";
import axios from "axios";
import background from '../assets/windmills-snowy-landscape.jpg';
import Logo from '../assets/logo-paperchase.png';
import { Link } from "react-router";
import { Database, Server, CheckCircle } from "lucide-react";

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

function SqlQueryExecutor() {
    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState("");
    const [query, setQuery] = useState("");
    const [result, setResult] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [connectionInfo, setConnectionInfo] = useState<{
        server: string;
        database: string;
        status: string;
    } | null>(null);

    useEffect(() => {
        // Fetch connection info
        axios.get("/api/test-connection")
            .then(res => {
                if (res.data.status === 'connected') {
                    setConnectionInfo({
                        server: res.data.server || "10.0.40.20",
                        database: res.data.database || "DataWarehouseV2_UK",
                        status: res.data.status
                    });
                }
            })
            .catch(() => {
                // If connection fails, set default info
                setConnectionInfo({
                    server: "10.0.40.20",
                    database: "DataWarehouseV2_UK",
                    status: "disconnected"
                });
            });

        // Fetch tables
        axios.get("/api/list_all_tables")
            .then(res => setTables(res.data.tables || []))
            .catch(() => setError("Error fetching tables."));
    }, []);

    const handleSubmit = async () => {
        if (!selectedTable || !query.trim()) {
            setError("Please select a table and enter a SQL query.");
            return;
        }
        const payload = { table_name: selectedTable, query: query.trim() };
        setError("");
        setMessage("");
        setLoading(true);
        setResult([]);
        try {
            const response = await axios.post("/api/sql-query-executor", payload);
            const rows = response.data.data || [];
            const responseMessage = response.data.message || "";
            setResult(rows);
            setMessage(responseMessage);
        } catch (err: any) {
            const errorMessage = err?.response?.data?.detail || "Failed to execute query.";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
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
                            <h1 className="text-2xl font-bold text-[#163E5D]">SQL Query Executor</h1>
                        </div>
                        <Link to='/'>
                            <img src={Logo} alt="Logo" width={150} height={106} className="hover:scale-105 transition-transform duration-200" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-6 py-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <Card>
                        <div className="p-6">
                            <h2 className="text-xl font-semibold text-[#163E5D] mb-4">SQL Server Query Executor</h2>
                            
                            {/* Current Connection Info */}
                            {connectionInfo && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle className="h-4 w-4 text-blue-600" />
                                        <span className="font-medium text-blue-800">Current Connection</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            <Server className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-600">Server:</span>
                                            <span className="font-medium">{connectionInfo.server}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Database className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-600">Database:</span>
                                            <span className="font-medium">{connectionInfo.database}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select Table
                                    </label>
                                    <select
                                        value={selectedTable}
                                        onChange={(e) => setSelectedTable(e.target.value)}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BF2A2D] focus:border-transparent"
                                    >
                                        <option value="">Choose a table...</option>
                                        {tables.map((table, index) => (
                                            <option key={index} value={table}>
                                                {table}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        SQL Query
                                    </label>
                                    <textarea
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Enter your SQL query here..."
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#BF2A2D] focus:border-transparent h-32 resize-none"
                                    />
                                </div>

                                <Button onClick={handleSubmit} disabled={!selectedTable || !query.trim() || loading}>
                                    {loading ? "Executing..." : "Execute Query"}
                                </Button>

                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                                        {error}
                                    </div>
                                )}

                                {result.length > 0 && (
                                    <div className="mt-6">
                                        <h3 className="text-lg font-semibold text-[#163E5D] mb-4">
                                            Query Results ({result.length} rows)
                                        </h3>
                                        
                                        {/* Message Display */}
                                        {message && (
                                            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                                    <span className="text-green-800 font-medium">Query Message:</span>
                                                </div>
                                                <p className="text-green-700 mt-1">{message}</p>
                                            </div>
                                        )}
                                        
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        {Object.keys(result[0] || {}).map((column, index) => (
                                                            <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                {column}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {result.map((row, rowIndex) => (
                                                        <tr key={rowIndex} className="hover:bg-gray-50">
                                                            {Object.values(row).map((value, colIndex) => (
                                                                <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                    {String(value || '')}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Navigation */}
                    <div className="flex justify-center gap-4">
                        <Link to="/database-form">
                            <Button variant="secondary">
                                <Database className="h-4 w-4" />
                                Database Connection
                            </Button>
                        </Link>
                        <Link to="/retrieve-schema">
                            <Button variant="outline">
                                <Database className="h-4 w-4" />
                                View Schema
                            </Button>
                        </Link>
                        <Link to="/chat">
                            <Button variant="outline">
                                <Database className="h-4 w-4" />
                                Chat Interface
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SqlQueryExecutor;

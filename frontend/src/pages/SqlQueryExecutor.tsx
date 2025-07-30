import React, { useState, useEffect } from "react";
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

function SqlQueryExecutor() {
    const [databases, setDatabases] = useState<string[]>([]);
    const [selectedDb, setSelectedDb] = useState("");
    const [query, setQuery] = useState("");
    const [result, setResult] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        axios.get("/api/list_all_database")
            .then(res => setDatabases(res.data.databases || []))
            .catch(() => setError("Error fetching databases."));
    }, []);

    const handleSubmit = async () => {
        if (!selectedDb || !query.trim()) {
            setError("Please select a database and enter a SQL query.");
            return;
        }
        const payload = { db_name: selectedDb, query: query.trim() };
        setError("");
        setLoading(true);
        setResult([]);
        try {
            const response = await axios.post("/api/sql-query-executor", payload);
            const rows = response.data.data || [];
            setResult(rows);
        } catch (err: any) {
            const message = err?.response?.data?.message || "Failed to execute query.";
            setError(message);
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

            <div className="container mx-auto space-y-6 p-4">
                <Card className="max-w-3xl mx-auto mt-8 p-6">
                    <div className="mb-4">
                        <label className="text-[#163E5D] font-semibold">Select Database:</label>
                        <select
                            value={selectedDb}
                            onChange={(e) => setSelectedDb(e.target.value)}
                            className="w-full border border-[#2F82C3] p-2 rounded-lg mt-1 text-[#163E5D] focus:ring-2 focus:ring-[#BF2A2D]"
                        >
                            <option value="">Choose Database</option>
                            {databases.map((db, i) => (
                                <option key={i} value={db}>{db}</option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="block text-[#163E5D] font-semibold mb-2">SQL Query:</label>
                        <textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            rows={2}
                            className="w-full border-2 border-[#2F82C3] rounded-lg px-3 py-2 bg-blue-50 text-[#163E5D] focus:ring-2 focus:ring-[#BF2A2D]"
                            placeholder="Enter your SQL query here..."
                        ></textarea>
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? "Executing..." : "Run Query"}
                    </Button>

                    {error && (
                        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                            {error}
                        </div>
                    )}

                    {result.length > 0 && (
                        <div className="bg-white rounded-lg shadow-md border mt-4 border-blue-200 overflow-auto mx-auto">
                            <div className="bg-[linear-gradient(90deg,#2F82C3_0%,#163E5D_100%)] px-6 py-4">
                                <h3 className="text-white font-semibold text-lg">Query Results</h3>
                                <p className="text-blue-100 text-sm">{result.length} rows returned</p>
                            </div>
                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                <table className="min-w-full text-sm text-left">
                                    <thead className="bg-blue-100">
                                        <tr>
                                            {Object.keys(result[0]).map((col, idx) => (
                                                <th key={idx} className="px-6 py-3 text-[#163E5D] font-semibold border-b border-blue-200">
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.map((row, rowIndex) => (
                                            <tr key={rowIndex} className="hover:bg-blue-50">
                                                {Object.values(row).map((val, colIndex) => (
                                                    <td key={colIndex} className="px-6 py-3 border-b border-blue-100 text-gray-800">
                                                        {String(val)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}

export default SqlQueryExecutor;

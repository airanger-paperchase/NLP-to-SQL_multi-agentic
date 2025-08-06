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
    default: "bg-gradient-to-br from-purple-800 via-purple-900 to-purple-950 shadow-xl text-white rounded-lg font-medium shadow-soft hover:shadow-medium transition-all duration-200 transform hover:scale-105",
    outline: "border-2 border-purple-800 text-purple-800 hover:bg-purple-800 hover:text-white",
    destructive: "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white",
    secondary: "bg-gradient-to-r from-[#2F82C3] to-[#163E5D] hover:from-purple-800 hover:to-purple-900 text-white"
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
    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState("");
    const [schema, setSchema] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Fetch all tables
    useEffect(() => {
        axios.get("/api/list_all_tables")
            .then(res => setTables(res.data.tables || []))
            .catch(err => {
                setError("Error fetching tables.");
            });
    }, []);

    const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const table = e.target.value;
        setSelectedTable(table);
        onSelect("DataWarehouseV2_UK", table);
    };

    const handleSubmit = () => {
        if (!selectedTable) {
            setError("Please select a table.");
            return;
        }
        setError("");
        setLoading(true);
        setSchema([]);

        axios.get(`/api/retrieve-schema?table_name=${selectedTable}`)
            .then(res => {
                setSchema(res.data.schema || []);
                setLoading(false);
            })
            .catch(err => {
                setError("Error retrieving schema.");
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
                            <Database className="h-8 w-8 text-purple-800" />
                            <h1 className="text-2xl font-bold text-[#163E5D]">Retrieve Schema</h1>
                        </div>
                        <Link to='/'>
                            <img src={Logo} alt="Logo" width={150} height={106} className="hover:scale-105 transition-transform duration-200" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-6 py-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Card>
                        <div className="p-6">
                            <h2 className="text-xl font-semibold text-[#163E5D] mb-4">SQL Server Database Schema</h2>
                            <p className="text-gray-600 mb-6">Database: DataWarehouseV2_UK</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select Table
                                    </label>
                                    <select
                                        value={selectedTable}
                                        onChange={handleTableChange}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-800 focus:border-transparent"
                                    >
                                        <option value="">Choose a table...</option>
                                        {tables.map((table, index) => (
                                            <option key={index} value={table}>
                                                {table}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <Button onClick={handleSubmit} disabled={!selectedTable || loading}>
                                    {loading ? "Loading..." : "Retrieve Schema"}
                                </Button>

                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                                        {error}
                                    </div>
                                )}

                                {schema.length > 0 && (
                                    <div className="mt-6">
                                        <h3 className="text-lg font-semibold text-[#163E5D] mb-4">
                                            Schema for {selectedTable}
                                        </h3>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Column Name
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Data Type
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Nullable
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Default Value
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Primary Key
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {schema.map((column, index) => (
                                                        <tr key={index} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                {column.column_name}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {column.type}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {column.notnull === 'YES' ? 'No' : 'Yes'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {column.default_value || '-'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                {column.primary_key ? 'Yes' : 'No'}
                                                            </td>
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
                        <Link to="/sql-query-executor">
                            <Button variant="outline">
                                <Database className="h-4 w-4" />
                                SQL Query Executor
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

export default RetrieveSchema;

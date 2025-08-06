import { useState, useEffect } from "react";

import { Database, Save, AlertCircle, Loader2, CheckCircle, Sparkles } from "lucide-react";
import background from '../assets/windmills-snowy-landscape.jpg';
import Logo from '../assets/logo-paperchase.png';
import { Link, useNavigate } from "react-router";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import React from "react";

// Utility function for className merging
export function cn(...inputs: ClassValue[]) {
    return twMerge(inputs as any);
}

// UI Components
const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div 
        className={cn(
            "rounded-xl border bg-white/95 backdrop-blur-sm shadow-xl", 
            className
        )} 
        {...props}
    >
        {children}
    </div>
);

const CardHeader = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div 
        className={cn(
            "flex flex-col space-y-1.5 p-6 pb-4", 
            className
        )} 
        {...props}
    >
        {children}
    </div>
);

const CardTitle = ({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 
        className={cn(
            "text-2xl font-bold leading-none tracking-tight text-[#163E5D]", 
            className
        )} 
        {...props}
    >
        {children}
    </h3>
);

const CardContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div 
        className={cn(
            "p-6 pt-0", 
            className
        )} 
        {...props}
    >
        {children}
    </div>
);

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
            className={cn(
                "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                variants[variant],
                sizes[size],
                className
            )}
            ref={ref}
            {...props}
        />
    );
});

const Select = ({ 
    value, 
    onValueChange, 
    children, 
    className 
}: { 
    value: string; 
    onValueChange: (value: string) => void; 
    children: React.ReactNode; 
    className?: string 
}) => (
    <select
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
            "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
            className
        )}
    >
        <option value="">Select...</option>
        {children}
    </select>
);

const SelectItem = ({ 
    value, 
    children 
}: { 
    value: string; 
    children: React.ReactNode 
}) => (
    <option value={value}>{children}</option>
);

const Alert = ({ 
    className, 
    children, 
    type = 'success',
    action
}: React.HTMLAttributes<HTMLDivElement> & { 
    type?: 'success' | 'error';
    action?: React.ReactNode;
}) => (
    <div className={cn(
        "flex items-center justify-between gap-2 p-4 rounded-lg",
        type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200',
        className
    )}>
        <div className="flex items-center gap-2">
            {type === 'success' ? 
                <CheckCircle className="h-4 w-4 text-green-600" /> : 
                <AlertCircle className="h-4 w-4 text-red-600" />
            }
            {children}
        </div>
        {action}
    </div>
);

const AlertDescription = ({ 
    className, 
    children 
}: React.HTMLAttributes<HTMLDivElement>) => (
    <span className={cn("text-sm", className)}>
        {children}
    </span>
);

const Badge = ({ 
    className, 
    children 
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn(
        "inline-flex items-center rounded-md bg-[#163E5D]/10 px-2 py-1 text-sm font-medium text-[#163E5D] ring-1 ring-inset ring-[#163E5D]/20",
        className
    )}>
        {children}
    </div>
);

function TableDescription() {
    const [databases, setDatabases] = useState<string[]>([]);
    const [tables, setTables] = useState<string[]>([]);
    const [selectedDatabase, setSelectedDatabase] = useState<string>('');
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [description, setDescription] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({
        show: false,
        type: 'success',
        message: ''
    });
    const [editableDescriptions, setEditableDescriptions] = useState<{[key: string]: string}>({});

    const navigate = useNavigate();

    useEffect(() => {
        fetchDatabases();
    }, []);

    useEffect(() => {
        if (selectedDatabase) {
            fetchTables();
        }
    }, [selectedDatabase]);

    // First, add a new useEffect for handling table selection
    useEffect(() => {
        if (selectedTable && selectedDatabase) {
            fetchDescription();
        }
    }, [selectedTable, selectedDatabase]); // Add both dependencies

    const fetchDatabases = async () => {
        try {
            // For SQL Server, we'll use a fixed database name
            setDatabases(['DataWarehouseV2_UK']);
        } catch (error) {
            showAlert('error', 'Failed to set database');
        }
    };

    const fetchTables = async () => {
        try {
            const response = await fetch('/api/list_all_tables');
            const data = await response.json();
            
            if (!response.ok) throw new Error('Failed to fetch tables');
            setTables(data.tables);
        } catch (error) {
            showAlert('error', 'Failed to fetch tables');
        }
    };

    const fetchDescription = async () => {
        if (!selectedTable) return;
        
        setLoading(true);
        try {
            const response = await fetch(`/api/get-description?table_name=${selectedTable}`);
            const data = await response.json();
            
            if (response.ok) {
                if (data.status_code === 404) {
                    console.log('No description found for this table');
                    // If no description found, clear description and show generate button
                    setDescription(null);
                    setEditableDescriptions({});
                    showAlert('error', 'No description available. Please generate one.');
                } 
                else
                {
                    console.log('Description fetched successfully:', data);     
                    // If description found, set it
                    setDescription(data);
                    setEditableDescriptions(data.description || {});
                }
            } else {
                console.log('Failed to fetch description:', data);
                throw new Error('Failed to fetch description');
            }
        } catch (error) {
            console.error('Error fetching description:', error);
            setDescription(null);
            setEditableDescriptions({});
            showAlert('error', 'Failed to fetch description');
        } finally {
            setLoading(false);
        }
    };

    const generateDescription = async () => {
        if (!selectedTable) return;
        
        setLoading(true);
        try {
            const response = await fetch(`/api/describe-table-columns?table_name=${selectedTable}`);
            const data = await response.json();
            
            if (!response.ok) throw new Error('Failed to generate description');
            
            setDescription(data);
            setEditableDescriptions(data.description || {});
            showAlert('success', 'Description generated successfully');
        } catch (error) {
            showAlert('error', 'Failed to generate description');
        } finally {
            setLoading(false);
        }
    };

    const updateDescription = async () => {
        if (!selectedTable) return;
        
        setLoading(true);
        try {
            const response = await fetch(`/api/update-description?table_name=${selectedTable}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ description: editableDescriptions }),
            });

            const data = await response.json();

            if (!response.ok) throw new Error('Failed to update description');
            
            showAlert('success', 'Description updated successfully');
            setDescription({
                ...description,
                description: editableDescriptions
            });
        } catch (error) {
            showAlert('error', 'Failed to update description');
        } finally {
            setLoading(false);
        }
    };

    const showAlert = (type: 'success' | 'error', message: string) => {
        setAlert({ show: true, type, message });
        if (!message.includes('No Connection Established')) {
            setTimeout(() => setAlert({ show: false, type: 'success', message: '' }), 5000);
        }
    };

    const handleConnectionError = (message: string) => {
        showAlert('error', message);
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
                            <h1 className="text-2xl font-bold text-[#163E5D]">Table Description Manager</h1>
                        </div>
                        <Link to='/'>
                            <img src={Logo} alt="Logo" width={150} height={106} className="hover:scale-105 transition-transform duration-200" />
                        </Link>
                    </div>
                </div>
            </div>

            <div className="container mx-auto p-6 space-y-6">
                {/* Alert - Move to top */}
                {alert.show && (
                    <Alert 
                        type={alert.type}
                        className="animate-fade-in shadow-lg"
                        action={
                            alert.type === 'error' && 
                            alert.message.includes('No Connection Established') && (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => navigate('/DatabaseForm')}
                                    className="shrink-0"
                                >
                                    <Database className="w-4 h-4 mr-2" />
                                    Connection Setup
                                </Button>
                            )
                        }
                    >
                        <AlertDescription 
                            className={alert.type === 'success' ? 'text-green-800' : 'text-red-800'}
                        >
                            {alert.message}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Selection Card */}
                <Card className="shadow-lg 1 bg-white/95 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Select Database and Table</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Database</label>
                                <Select 
                                    value={selectedDatabase} 
                                    onValueChange={(value) => {
                                        setSelectedDatabase(value);
                                        setSelectedTable('');
                                        setDescription(null);
                                    }}
                                >
                                    {databases.map((db) => (
                                        <SelectItem key={db} value={db}>
                                            {db}
                                        </SelectItem>
                                    ))}
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Table</label>
                                <Select 
                                    value={selectedTable} 
                                    onValueChange={(value) => {
                                        setSelectedTable(value);
                                        // Remove the fetchDescription call from here
                                        if (!value) {
                                            setDescription(null);
                                            setEditableDescriptions({});
                                        }
                                    }}
                                >
                                    {tables.map((table) => (
                                        <SelectItem key={table} value={table}>
                                            {table}
                                        </SelectItem>
                                    ))}
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Description Card */}
                {selectedDatabase && selectedTable && (
                    <Card className="shadow-lg border-1 bg-white/95 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Database className="h-6 w-6 text-[#BF2A2D]" />
                                    <span>Column Descriptions</span>
                                </div>
                                {!description && (
                                    <Button
                                        onClick={generateDescription}
                                        disabled={loading}
                                        variant="secondary"
                                        size="sm"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                Generate Description
                                            </>
                                        )}
                                    </Button>
                                )}
                            </CardTitle>
                            {description && (
                                <div className="mt-2 text-sm text-gray-500">
                                    Viewing descriptions for table: <span className="font-medium text-[#163E5D]">{selectedTable}</span>
                                </div>
                            )
                            }
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center items-center h-32">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                </div>
                            ) : description ? (
                                <div className="space-y-6">
                                    <div className="divide-y divide-gray-100 rounded-md border border-gray-200">
                                        {/* Column Headers */}
                                        <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200">
                                            <div className="col-span-12 md:col-span-4">
                                                <span className="text-sm font-medium text-[#163E5D]">Column Name</span>
                                            </div>
                                            <div className="col-span-12 md:col-span-8">
                                                <span className="text-sm font-medium text-[#163E5D]">Description</span>
                                            </div>
                                        </div>

                                        {/* Column Rows */}
                                        {Object.entries(editableDescriptions).map(([column, desc], index) => (
                                            <div 
                                                key={column} 
                                                className={cn(
                                                    "grid grid-cols-12 gap-4 p-4 transition-colors hover:bg-gray-50",
                                                    index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                                                )}
                                            >
                                                <div className="col-span-12 md:col-span-4 flex items-center">
                                                    <Badge>{column}</Badge>
                                                </div>
                                                <div className="col-span-12 md:col-span-8">
                                                    <textarea
                                                        value={desc}
                                                        onChange={(e) => setEditableDescriptions(prev => ({
                                                            ...prev,
                                                            [column]: e.target.value
                                                        }))}
                                                        className="w-full min-h-[80px] rounded-md border border-gray-200 p-3 text-sm resize-none focus:border-[#163E5D] focus:ring-1 focus:ring-[#163E5D] bg-white/50"
                                                        placeholder="Enter column description..."
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="sticky bottom-0 pt-4 pb-2 bg-white/95 backdrop-blur-sm">
                                        <Button
                                            onClick={updateDescription}
                                            disabled={loading}
                                            className="w-full"
                                            variant="default"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Updating...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-4 h-4 mr-2" />
                                                    Update Descriptions
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 px-4">
                                    <div className="flex flex-col items-center gap-3">
                                        <AlertCircle className="w-10 h-10 text-gray-400" />
                                        <h3 className="text-lg font-semibold text-gray-900">No Description Available</h3>
                                        <p className="text-sm text-gray-500">
                                            Click "Generate Description" to create descriptions for this table's columns.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

export default TableDescription;
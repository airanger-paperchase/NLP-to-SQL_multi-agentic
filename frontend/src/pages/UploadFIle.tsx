import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { UploadCloud, Database, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Check, ChevronDown } from "lucide-react";
import background from '../assets/windmills-snowy-landscape.jpg';
import Logo from '../assets/logo-paperchase.png';
import { Link, useNavigate } from "react-router";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Inline UI Components
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
    <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props}>
        {children}
    </div>
);

const CardTitle = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <h3 className={cn("text-2xl font-bold leading-none tracking-tight text-[#163E5D]", className)} {...props}>
        {children}
    </h3>
);

const CardContent = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("p-6 pt-0", className)} {...props}>
        {children}
    </div>
);

const Button = ({ 
    className, 
    variant = "default", 
    size = "default", 
    disabled, 
    children, 
    ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { 
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
}) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    
    const variants = {
        default: "bg-blue-600 text-white hover:bg-blue-700",
        destructive: "bg-gradient-to-br from-purple-800 via-purple-900 to-purple-950 shadow-xl text-white rounded-lg font-medium shadow-soft hover:shadow-medium transition-all duration-200 transform hover:scale-105",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
    };
    
    const sizes = {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
    };

    return (
        <button
            className={cn(baseStyles, variants[variant], sizes[size], disabled && "opacity-50 cursor-not-allowed", className)}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
};

const Input = ({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        type={type}
        className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-1 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
        )}
        {...props}
    />
);

const Select = ({ children, value, onValueChange }: { 
    children: React.ReactNode; 
    value: string; 
    onValueChange: (value: string) => void; 
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleSelect = (selectedValue: string) => {
        onValueChange(selectedValue);
        setIsOpen(false);
    };
    
    return (
        <div className="relative">
            <button
                type="button"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{value || "Select option"}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-hidden rounded-md border bg-white shadow-md">
                    <div className="p-1">
                        {React.Children.map(children, (child) => {
                            if (React.isValidElement(child)) {
                                return React.cloneElement(child as React.ReactElement<any>, { onSelect: handleSelect });
                            }
                            return child;
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

const SelectItem = ({ value, children, onSelect }: { 
    value: string; 
    children: React.ReactNode; 
    onSelect?: (value: string) => void; 
}) => (
    <div
        className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
        onClick={() => onSelect?.(value)}
    >
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            <Check className="h-4 w-4" />
        </span>
        {children}
    </div>
);

const Alert = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
            className
        )}
        {...props}
    >
        {children}
    </div>
);

const AlertDescription = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("text-sm [&_p]:leading-relaxed", className)} {...props}>
        {children}
    </div>
);

const Badge = ({ className, variant = "default", children, ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "secondary" | "destructive" | "outline" }) => {
    const variants = {
        default: "border-transparent bg-[#6c5ce7] text-white hover:bg-[#7a6bcf]",
        secondary: "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200",
        destructive: "border-transparent bg-gradient-to-br from-purple-800 via-purple-900 to-purple-950 shadow-xl text-white rounded-lg font-medium shadow-soft hover:shadow-medium transition-all duration-200 transform hover:scale-105",
        outline: "text-foreground",
    };
    
    return (
        <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", variants[variant], className)} {...props}>
            {children}
        </div>
    );
};

const Separator = ({ className, orientation = "horizontal", ...props }: React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" }) => (
    <div
        className={cn(
            "shrink-0 bg-border",
            orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
            className
        )}
        {...props}
    />
);

const Checkbox = ({ 
    checked, 
    onCheckedChange, 
    label 
}: { 
    checked: boolean; 
    onCheckedChange: (checked: boolean) => void; 
    label: string 
}) => (
    <label 
        className="flex items-center space-x-2 cursor-pointer"
        onClick={(e) => {
            e.preventDefault();
            onCheckedChange(!checked);
        }}
    >
        <div 
            className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${
                checked ? 'bg-[#163E5D] border-[#163E5D]' : 'border-gray-300 bg-white'
            }`}
        >
            {checked && <Check className="h-3 w-3 text-white" />}
        </div>
        <span className="text-sm text-gray-700">{label}</span>
    </label>
);

function UploadFile() {
    const [preprocessedData, setPreprocessedData] = useState<any[]>([]);
    const [data, setData] = useState<(string | number)[][]>([]);
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [alertOpen, setAlertOpen] = useState(false);
    const [alertSeverity, setAlertSeverity] = useState<'success' | 'error'>('success');
    const [alertMessage, setAlertMessage] = useState('');
    const [databases, setDatabases] = useState<string[]>([]);
    const [selectedDatabase, setSelectedDatabase] = useState<string>('');
    const [tableName, setTableName] = useState<string>('');
    // Add new state for null columns
    const [nullColumns, setNullColumns] = useState<string[]>([]);
    // Add this with other state declarations
    const [selectedNullColumns, setSelectedNullColumns] = useState<string[]>([]);
    const navigate = useNavigate();
    
    // Add new state for uploaded data display
    const [uploadedData, setUploadedData] = useState<any[]>([]);
    const [showUploadedData, setShowUploadedData] = useState(false);
    const [uploadedTableInfo, setUploadedTableInfo] = useState<{
        table_name: string;
        database_name: string;
        rows_inserted: number;
        columns: string[];
    } | null>(null);

    useEffect(() => {
        fetchDatabases();
    }, []);

    const fetchDatabases = async () => {
        try {
            // For SQL Server, we'll use a fixed database name
            setDatabases(['DataWarehouseV2_UK']);
        } catch (error) {
            console.error('Error setting database:', error);
            showAlert('error', 'Failed to set database');
        }
    };

    const showAlert = (severity: 'success' | 'error', message: string) => {
        setAlertSeverity(severity);
        setAlertMessage(message);
        setAlertOpen(true);

        // Only set timeout for success messages
        if (severity === 'success') {
            setTimeout(() => {
                setAlertOpen(false);
            }, 6000);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }

        setFileName(file.name);
        setLoading(true);

        try {
            // Create FormData for null columns detection
            const formData = new FormData();
            formData.append('file', file);

            // Call the filter-null-columns endpoint
            const response = await fetch('/api/filter-null-columns', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to detect null columns');
            }

            const nullColumnsData = await response.json();
            setNullColumns(nullColumnsData.null_cols || []);

            // Continue with existing file reading logic
            const reader = new FileReader();
            reader.onload = (event) => {
                const binaryStr = event.target?.result;
                if (typeof binaryStr !== "string") {
                    setLoading(false);
                    return;
                }

                try {
                    const workbook = XLSX.read(binaryStr, { type: "binary" });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = XLSX.utils.sheet_to_json<(string | number)[]>(workbook.Sheets[sheetName], { header: 1 });
                    setData(worksheet);
                } catch (error) {
                    console.error("Excel parse error:", error);
                    showAlert('error', 'Failed to parse Excel file');
                } finally {
                    setLoading(false);
                }
            };

            reader.readAsBinaryString(file);
        } catch (error) {
            console.error("File upload error:", error);
            showAlert('error', 'Failed to process file');
            setLoading(false);
        }

        e.target.value = "";
    };

    const handleInputChange = (value: string, rowIndex: number, cellIndex: number) => {
        setData((prev) =>
            prev.map((row, rIdx) =>
                rIdx === rowIndex
                    ? row.map((cell, cIdx) => (cIdx === cellIndex ? value : cell))
                    : row
            )
        );
    };

    const handleSubmit = async () => {
        if (!selectedDatabase || !tableName || (!preprocessedData.length && !fileName)) {
            showAlert('error', 'Please select a database, enter table name, and upload a file');
            return;
        }

        try {
            setLoading(true);

            if (preprocessedData.length > 0) {
                const column_types: { [key: string]: string } = {};
                if (preprocessedData[0]) {
                    Object.keys(preprocessedData[0]).forEach(key => {
                        column_types[key] = "string";
                    });
                }

                const payload = {
                    data: preprocessedData,
                    column_types: column_types,
                    table_name: tableName,
                    db_name: selectedDatabase,
                    null_cols: selectedNullColumns  // Use the selected null columns here
                };

                const response = await fetch("/api/ingest-to-sql", {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                
                if (data.status_code === 404 && data.detail?.includes('No Connection Established')) {
                    handleConnectionError(data.detail);
                    return;
                }

                if (!response.ok) {
                    throw new Error(data.detail || 'Ingestion failed');
                }

                // Enhanced success message with details
                const successMessage = `Data successfully ingested into ${data.table_name} in database ${data.database_name}. ${data.rows_inserted} rows inserted.`;
                showAlert('success', successMessage);
                setUploadedData(data.data); // Store the uploaded data
                setUploadedTableInfo({
                    table_name: data.table_name,
                    database_name: data.database_name,
                    rows_inserted: data.rows_inserted,
                    columns: data.columns
                });
                setShowUploadedData(true);
            } 
            // If we don't have preprocessed data but have a file, use upload-direct-excel route
            else if (fileName) {
                // Create a new file from the data array
                const ws = XLSX.utils.aoa_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

                const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([excelBuffer], { 
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
                });

                const formData = new FormData();
                formData.append('file', blob, fileName);

                const response = await fetch(`/api/upload-direct-excel?table_name=${tableName}&db_name=${selectedDatabase}`, {
                    method: "POST",
                    body: formData
                });

                const responseData = await response.json();

                if (!response.ok) {
                    throw new Error(responseData.detail || 'Direct upload failed');
                }

                // Enhanced success message with details
                const successMessage = `Excel file successfully uploaded to ${responseData.table_name} in database ${responseData.database_name}. ${responseData.rows_inserted} rows inserted.`;
                showAlert('success', successMessage);
                setUploadedData(responseData.data); // Store the uploaded data
                setUploadedTableInfo({
                    table_name: responseData.table_name,
                    database_name: responseData.database_name,
                    rows_inserted: responseData.rows_inserted,
                    columns: responseData.columns
                });
                setShowUploadedData(true);
            }

            // Reset form state (but keep uploaded data display)
            setPreprocessedData([]);
            setData([]);
            setFileName(null);
            setSelectedDatabase('');
            setTableName('');
            setSelectedNullColumns([]);
            setNullColumns([]);

        } catch (error) {
            console.error("Submit error:", error);
            showAlert('error', (error as Error).message || 'Failed to ingest data');
        } finally {
            setLoading(false);
        }
    };

    const handlePreprocess = async () => {
        if (!fileName) {
            showAlert('error', 'No file selected to preprocess.');
            return;
        }

        try {
            setLoading(true);

            const ws = XLSX.utils.aoa_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });

            const formData = new FormData();
            formData.append('file', blob, fileName);

            // Instead of using URLSearchParams, append null_cols to formData
            selectedNullColumns.forEach(col => {
                formData.append('null_cols', col);
            });

            const response = await fetch('/api/preprocess-excel', {
                method: "POST",
                body: formData,
            });

            const responseData = await response.json();
            
            if (responseData.status_code === 404 && responseData.detail?.includes('No Connection Established')) {
                handleConnectionError(responseData.detail);
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result && result.data) {
                setPreprocessedData(result.data);
                showAlert('success', 'Data preprocessed successfully!');
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error("Preprocess error:", error);
            showAlert('error', (error as Error).message || 'Failed to preprocess file');
        } finally {
            setLoading(false);
        }
    };

    const getStepStatus = (step: number) => {
        if (step === 1) {
            return fileName ? 'completed' : 'current';
        }
        if (step === 2) {
            return preprocessedData.length > 0 ? 'completed' : fileName ? 'current' : 'pending';
        }
        if (step === 3) {
            return (selectedDatabase && tableName && preprocessedData.length > 0) ? 'current' : 'pending';
        }
        return 'pending';
    };

    const StepIndicator = ({ step, title, status }: { step: number; title: string; status: 'completed' | 'current' | 'pending' }) => (
        <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                status === 'completed' ? 'bg-green-500 text-white' :
                status === 'current' ? 'bg-blue-500 text-white' :
                'bg-gray-200 text-gray-500'
            }`}>
                {status === 'completed' ? <CheckCircle className="w-5 h-5" /> : step}
            </div>
            <span className={`text-sm font-medium ${
                status === 'completed' ? 'text-green-600' :
                status === 'current' ? 'text-blue-600' :
                'text-gray-400'
            }`}>
                {title}
            </span>
        </div>
    );

    const handleConnectionError = (message: string) => {
        showAlert('error', message);
    };

    const resetForm = () => {
        setPreprocessedData([]);
        setData([]);
        setFileName(null);
        setSelectedDatabase('');
        setTableName('');
        setSelectedNullColumns([]);
        setNullColumns([]);
        setUploadedData([]);
        setShowUploadedData(false);
        setUploadedTableInfo(null);
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
                            <FileSpreadsheet className="h-8 w-8 text-[#BF2A2D]" />
                            <h1 className="text-2xl font-bold text-[#163E5D]">Excel Data Processing</h1>
                        </div>
                        <Link to='/'>
                            <img 
                                src={Logo} 
                                alt="Logo" 
                                width={150} 
                                height={106} 
                                className="hover:scale-105 transition-transform duration-200" 
                            />
                        </Link>
                    </div>
                </div>
            </div>

            <div className="container mx-auto space-y-6 p-4">
                {/* Alert - Update styling */}
                {alertOpen && (
                    <Alert 
                        className={`
                            ${alertSeverity === 'success' 
                                ? 'border-green-200 bg-green-50' 
                                : 'border-red-200 bg-red-50'
                            } 
                            animate-fade-in shadow-lg relative
                        `}
                    >
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                {alertSeverity === 'success' ? 
                                    <CheckCircle className="h-4 w-4 text-green-600" /> : 
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                }
                                <AlertDescription 
                                    className={`
                                        ${alertSeverity === 'success' 
                                            ? 'text-green-800' 
                                            : 'text-red-800'
                                        } 
                                        font-medium
                                    `}
                                >
                                    {alertMessage}
                                </AlertDescription>
                            </div>
                            {alertSeverity === 'error' && alertMessage.includes('No Connection Established') && (
                                <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => navigate('/DatabaseForm')}
                                    className="bg-[linear-gradient(90deg,#2F82C3_0%,#163E5D_100%)] rounded-full text-white font-medium"
                                >
                                    <Database className="w-4 h-4 mr-2" />
                                    Connection Setup
                                </Button>
                            )}
                        </div>
                    </Alert>
                )}

                {/* Progress Steps Card */}
                <Card className="shadow-lg border-1 bg-white/95 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <FileSpreadsheet className="h-6 w-6 text-[#BF2A2D]" />
                            Process Steps
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center space-x-8">
                            <StepIndicator step={1} title="Upload File" status={getStepStatus(1)} />
                            <div className="flex-1 h-px bg-gray-200"></div>
                            <StepIndicator step={2} title="Preprocess Data" status={getStepStatus(2)} />
                            <div className="flex-1 h-px bg-gray-200"></div>
                            <StepIndicator step={3} title="Ingest to Database" status={getStepStatus(3)} />
                        </div>
                    </CardContent>
                </Card>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Upload Section */}
                    <Card className="shadow-lg border-1 bg-white/95 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <UploadCloud className="h-12 w-12 text-purple-800" />
                                File Upload
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                                <label className="cursor-pointer block">
                                    <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                                    <span className="text-lg font-medium text-gray-700 block mb-2">
                                        {fileName ? fileName : "Choose Excel File"}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        Supports .xlsx and .xls files
                                    </span>
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            
                            {fileName && (
                                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                        <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm font-medium text-blue-700">{fileName}</span>
                                    </div>
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                        {data.length} rows
                                    </Badge>
                                </div>
                            )}

                            {/* {data.length > 0 && (
                                <Button 
                                    onClick={handlePreprocess}
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        'Preprocess Data'
                                    )}
                                </Button>
                            )} */}
                        </CardContent>
                    </Card>

                    {/* Database Configuration */}
                    <Card className="shadow-lg border-1 bg-white/95 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <Database className="h-6 w-6 text-[#BF2A2D]" />
                                Database Setup
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Database
                                </label>
                                <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
                                    {databases.map((db) => (
                                        <SelectItem key={db} value={db}>
                                            {db}
                                        </SelectItem>
                                    ))}
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Table Name
                                </label>
                                <Input
                                    type="text"
                                    value={tableName}
                                    onChange={(e) => setTableName(e.target.value)}
                                    placeholder="Enter table name"
                                    className="w-full"
                                />
                            </div>

                            <Separator />

                            <Button 
                                onClick={handleSubmit}
                                disabled={!selectedDatabase || !tableName || (!preprocessedData.length && !fileName) || loading}
                                variant={!selectedDatabase || !tableName ? "secondary" : "default"}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    'Ingest to Database'
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Status Panel */}
                    <Card className="shadow-lg border-1 bg-white/95 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <CheckCircle className="h-6 w-6 text-[#BF2A2D]" />
                                Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium">File Uploaded</span>
                                {fileName ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : (
                                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                                )}
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium">Data Preprocessed</span>
                                {preprocessedData.length > 0 ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : (
                                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                                )}
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <span className="text-sm font-medium">Database Ready</span>
                                {selectedDatabase && tableName ? (
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : (
                                    <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                                )}
                            </div>

                            {preprocessedData.length > 0 && (
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                    <div className="text-sm font-medium text-blue-700 mb-1">Data Summary</div>
                                    <div className="text-xs text-blue-600">
                                        {preprocessedData.length} rows • {Object.keys(preprocessedData[0] || {}).length} columns
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Null Columns Card */}
                {fileName && (
                    <Card className="shadow-lg border-1 bg-white/95 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <AlertCircle className="h-6 w-6 text-[#BF2A2D]" />
                                Column Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {nullColumns.length > 0 ? (
                                    <div className="space-y-3">
                                        <div className="text-sm text-gray-700">
                                            Select columns to be removed during data processing:
                                        </div>
                                        <div className="space-y-2">
                                            {nullColumns.map((col, index) => (
                                                <Checkbox
                                                    key={index}
                                                    checked={selectedNullColumns.includes(col)}
                                                    onCheckedChange={() => {
                                                        setSelectedNullColumns(prev => 
                                                            prev.includes(col)
                                                                ? prev.filter(c => c !== col)
                                                                : [...prev, col]
                                                        );
                                                    }}
                                                    label={col}
                                                />
                                            ))}
                                        </div>
                                        {selectedNullColumns.length > 0 && (
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                <div className="text-sm text-gray-600">Selected for removal:</div>
                                                {selectedNullColumns.map((col, index) => (
                                                    <Badge 
                                                        key={index} 
                                                        variant="secondary" 
                                                        className="bg-red-100 text-red-800"
                                                    >
                                                        {col}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-700">
                                        No columns with all null values were detected.
                                    </div>
                                )}
                                
                                <Button 
                                    onClick={handlePreprocess}
                                    disabled={loading}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        'Preprocess Data'
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Data Table Card */}
                {preprocessedData.length > 0 && (
                    <Card className="shadow-lg border-1 bg-white/95 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <Database className="h-6 w-6 text-[#BF2A2D]" />
                                Preprocessed Data Preview
                                <Badge className="bg-green-100 text-green-800 ml-auto">Preprocessed</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-auto max-h-[70vh] border rounded-lg">
                                {loading ? (
                                    <div className="flex justify-center items-center h-32">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                    </div>
                                ) : preprocessedData.length > 0 ? (
                                    <table className="w-full border-collapse">
                                        <thead className="bg-gray-50 sticky top-0 z-10">
                                            <tr>
                                                {Object.keys(preprocessedData[0]).map((header, index) => (
                                                    <th key={index} className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                                                        {header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preprocessedData.map((row, rowIndex) => (
                                                <tr key={rowIndex} className="hover:bg-gray-50">
                                                    {Object.values(row).map((cell: any, cellIndex) => (
                                                        <td key={cellIndex} className="px-4 py-3 text-sm text-gray-900 border-b">
                                                            {cell?.toString() ?? ''}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <table className="w-full border-collapse">
                                        <tbody>
                                            {data.map((row, rowIndex) => (
                                                <tr key={rowIndex} className="hover:bg-gray-50">
                                                    {row.map((cell, cellIndex) => (
                                                        <td key={cellIndex} className="px-2 py-2 border-b">
                                                            <Input
                                                                type="text"
                                                                value={cell}
                                                                onChange={(e) => handleInputChange(e.target.value, rowIndex, cellIndex)}
                                                                className="min-w-[150px] border-1 focus:border-blue-500 rounded-none text-sm"
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                
                                <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 border-t">
                                    Total rows: {preprocessedData.length || data.length}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Uploaded Data Preview */}
                {showUploadedData && uploadedTableInfo && (
                    <Card className="shadow-lg border-1 bg-white/95 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex items-center justify-between w-full">
                                <CardTitle className="flex items-center gap-3">
                                    <Database className="h-6 w-6 text-[#BF2A2D]" />
                                    Uploaded Data Preview
                                    <Badge className="bg-green-100 text-green-800 ml-auto">Ingested</Badge>
                                </CardTitle>
                                <Button
                                    onClick={resetForm}
                                    variant="outline"
                                    size="sm"
                                    className="text-gray-600 hover:text-gray-800"
                                >
                                    Start New Upload
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-auto max-h-[70vh] border rounded-lg">
                                <table className="w-full border-collapse">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            {uploadedTableInfo.columns.map((header, index) => (
                                                <th key={index} className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                                                    {header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {uploadedData.map((row, rowIndex) => (
                                            <tr key={rowIndex} className="hover:bg-gray-50">
                                                {uploadedTableInfo.columns.map((header, colIndex) => (
                                                    <td key={colIndex} className="px-4 py-3 text-sm text-gray-900 border-b">
                                                        {row[header]?.toString() ?? ''}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 text-center text-sm text-gray-500 bg-gray-50 border-t">
                                Total rows: {uploadedData.length}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

export default UploadFile;
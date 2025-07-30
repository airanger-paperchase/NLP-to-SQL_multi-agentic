import { useState, useEffect } from "react";
import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Database, Server, User, Lock, CheckCircle, AlertCircle, Loader2, Wifi, WifiOff } from "lucide-react";
import background from '../assets/windmills-snowy-landscape.jpg';
import Logo from '../assets/logo-paperchase.png';
import { Link } from "react-router";

// Utils function
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Inline UI Components
const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-xl border bg-white/95 backdrop-blur-sm shadow-xl", className)} {...props}>
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

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#BF2A2D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

const Alert = ({ className, children, variant = 'default', ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'destructive' | 'success' }) => {
  const variants = {
    default: "bg-blue-50 text-blue-800 border-blue-200",
    destructive: "bg-red-50 text-red-800 border-red-200",
    success: "bg-green-50 text-green-800 border-green-200"
  };

  return (
    <div className={cn("relative w-full rounded-lg border px-4 py-3 text-sm", variants[variant], className)} {...props}>
      {children}
    </div>
  );
};

const Badge = ({ className, variant = 'default', children, ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'success' | 'destructive' }) => {
  const variants = {
    default: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-800",
    destructive: "bg-red-100 text-red-800"
  };

  return (
    <div className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-medium", variants[variant], className)} {...props}>
      {children}
    </div>
  );
};

type FormData = {
  server: string;
  username: string;
  password: string;
};

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export default function DatabaseForm() {
  const [formData, setFormData] = useState<FormData>({
    server: "",
    username: "",
    password: "",
  });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [responseMsg, setResponseMsg] = useState("");
  const [databases, setDatabases] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewConnection = async () => {
    setConnectionStatus('connecting');
    setResponseMsg("");
    setDatabases([]);
    setTables([]);
    setSelectedDatabase('');

    try {
        const response = await fetch("/api/new-connection", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                server: formData.server,
                username: formData.username,
                password: formData.password,
                status: "connected"
            }),
        });

        const data = await response.json();

        if (response.status === 404 && data.detail?.includes('No Connection Established')) {
            setConnectionStatus('error');
            setResponseMsg(data.detail);
            return;
        }

        if (!response.ok) {
            throw new Error(data.detail || "Failed to connect to database.");
        }

        setConnectionStatus('connected');
        setResponseMsg(data.message || "Connection established successfully!");
        
        // After successful connection, fetch databases
        fetchDatabases();
    } catch (error) {
        console.error(error);
        setConnectionStatus('error');
        setResponseMsg((error as Error).message || "Failed to connect to database.");
    }
};

// Update fetchDatabases to show loader
const fetchDatabases = async () => {
    setLoadingDatabases(true);
    try {
      const response = await fetch('/api/list_all_database');
      const data = await response.json();

      if (response.status === 404 && data.detail?.includes('No Connection Established')) {
        setConnectionStatus('error');
        setResponseMsg(data.detail);
        setLoadingDatabases(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch databases');
      }

      setDatabases(data.databases || []);
    } catch (error) {
      console.error('Error fetching databases:', error);
      setResponseMsg('Failed to fetch databases');
    } finally {
      setLoadingDatabases(false);
    }
  };

  // Update handleDatabaseSelect to show loader and reset selectedTables
  const handleDatabaseSelect = async (dbName: string) => {
    setSelectedDatabase(dbName);
    setLoadingTables(true);
    setSelectedTables([]);
    try {
      const response = await fetch(`/api/list_all_tables?db_name=${dbName}`);
      const data = await response.json();

      if (response.status === 404 && data.detail?.includes('No Connection Established')) {
        setConnectionStatus('error');
        setResponseMsg(data.detail);
        setLoadingTables(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch tables');
      }

      setTables(data.tables || []);
    } catch (error) {
      console.error('Error fetching tables:', error);
      setResponseMsg('Failed to fetch tables');
    } finally {
      setLoadingTables(false);
    }
  };

  const handleReconnect = async () => {
    setConnectionStatus('connecting');
    setResponseMsg("");

    try {
        const response = await fetch("/api/re-connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();

        if (response.status === 404 && data.detail?.includes('No Connection Established')) {
            setConnectionStatus('error');
            setResponseMsg(data.detail);
            return;
        }

        if (!response.ok) {
            throw new Error(data.detail || "Failed to reconnect to database.");
        }

        setConnectionStatus('connected');
        setResponseMsg(data.message || "Reconnected successfully!");
        
        // After successful reconnection, fetch databases
        fetchDatabases();
    } catch (error) {
        console.error(error);
        setConnectionStatus('error');
        setResponseMsg((error as Error).message || "Failed to reconnect to database.");
    }
};

  const handleDisconnect = async () => {
    try {
        const response = await fetch("/api/disconnect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to disconnect from database.");
        }

        setConnectionStatus('disconnected');
        setResponseMsg(data.message || "Disconnected from database.");
        setDatabases([]);
        setTables([]);
        setSelectedDatabase('');
    } catch (error) {
        console.error(error);
        setResponseMsg((error as Error).message || "Failed to disconnect from database.");
    }
};

  // Add useEffect to check connection status on component mount
useEffect(() => {
    const checkConnection = async () => {
        try {
            const response = await fetch("/api/test-connection");
            const data = await response.json();

            if (response.ok && data.status === "connected") {
                setConnectionStatus('connected');
                setFormData({
                    server: data.server || "",
                    username: data.username || "",
                    password: data.password || ""
                });
                fetchDatabases();
            }
        } catch (error) {
            console.error('Error checking connection:', error);
            setConnectionStatus('disconnected');
        }
    };

    checkConnection();
}, []);

  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';
  const isDisconnected = connectionStatus === 'disconnected';
  const hasError = connectionStatus === 'error';

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
              <h1 className="text-2xl font-bold text-[#163E5D]">Database Connection</h1>
            </div>
            <Link to='/'>
              <img src={Logo} alt="Logo" width={150} height={106} className="hover:scale-105 transition-transform duration-200" />
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-4x1 mx-auto grid gap-8 lg:grid-cols-2">
          
          {/* Connection Form */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Server className="h-6 w-6 text-[#BF2A2D]" />
                Database Configuration
              </CardTitle>
              <div className="flex items-center gap-2">
                {isConnected && <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Connected
                </Badge>}
                {hasError && <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Connection Failed
                </Badge>}
                {isDisconnected && <Badge className="flex items-center gap-1">
                  <WifiOff className="h-3 w-3" />
                  Disconnected
                </Badge>}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Connection Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Database Server
                  </label>
                  <Input
                    name="server"
                    placeholder="your-db-server.database.windows.net"
                    value={formData.server}
                    onChange={handleChange}
                    disabled={isConnected}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Username
                  </label>
                  <Input
                    name="username"
                    placeholder="Enter username"
                    value={formData.username}
                    onChange={handleChange}
                    disabled={isConnected}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password
                  </label>
                  <Input
                    name="password"
                    type="password"
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isConnected}
                  />
                </div>
              </div>

              {/* Connection Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleNewConnection}
                  disabled={isConnecting || (!isDisconnected && !hasError)}
                  className="flex-1"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Wifi className="h-4 w-4" />
                      New Connection
                    </>
                  )}
                </Button>

                <Button
                  variant="secondary"
                  onClick={handleReconnect}
                  disabled={isConnecting || isDisconnected}
                >
                  <Wifi className="h-4 w-4" />
                  Reconnect
                </Button>

                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={!isConnected}
                >
                  <WifiOff className="h-4 w-4" />
                  Disconnect
                </Button>
              </div>

              {/* Response Message */}
              {responseMsg && (
                <Alert variant={isConnected ? 'success' : hasError ? 'destructive' : 'default'}>
                  <div className="flex items-center gap-2">
                    {isConnected ? <CheckCircle className="h-4 w-4" /> : 
                     hasError ? <AlertCircle className="h-4 w-4" /> : 
                     <Database className="h-4 w-4" />}
                    {responseMsg}
                  </div>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Database Information */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Database className="h-6 w-6 text-[#BF2A2D]" />
                Database Information
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {!isConnected ? (
                <div className="text-center py-12 text-gray-500">
                  <Database className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No Connection</p>
                  <p className="text-sm">Connect to a database to view information</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Available Databases */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-[#163E5D] flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Available Databases ({databases.length})
                    </h3>
                    <div className="relative">
                      {loadingDatabases && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-lg">
                          <Loader2 className="h-6 w-6 animate-spin text-[#BF2A2D]" />
                        </div>
                      )}
                      <div className="grid gap-2 max-h-48 overflow-y-auto">
                        {databases.map((db, index) => (
                          <div
                            key={index}
                            onClick={() => handleDatabaseSelect(db)}
                            className={cn(
                              "p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md",
                              selectedDatabase === db 
                                ? "bg-[#BF2A2D]/10 border-[#BF2A2D] text-[#BF2A2D]" 
                                : "bg-white border-gray-200 hover:border-[#BF2A2D]/50"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{db}</span>
                              {selectedDatabase === db && <CheckCircle className="h-4 w-4" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Tables in Selected Database with checkboxes and loader */}
                  {selectedDatabase && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-[#163E5D] flex items-center gap-2">
                          <Server className="h-5 w-5" />
                          Tables in "{selectedDatabase}" ({tables.length})
                        </h3>
                        {tables.length > 0 && (
                          <button
                            className="text-sm px-3 py-1 rounded bg-[#BF2A2D] text-white hover:bg-[#a82325] transition"
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
                      <div className="relative">
                        {loadingTables && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-lg">
                            <Loader2 className="h-6 w-6 animate-spin text-[#BF2A2D]" />
                          </div>
                        )}
                        {tables.length > 0 ? (
                          <div className="grid gap-2 max-h-48 overflow-y-auto">
                            {tables.map((table, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "p-3 rounded-lg border flex items-center cursor-pointer transition-all duration-200 hover:shadow-md",
                                  selectedTables.includes(table)
                                    ? "bg-[#BF2A2D]/10 border-[#BF2A2D] text-[#BF2A2D]"
                                    : "bg-white border-gray-200 hover:border-[#BF2A2D]/50"
                                )}
                                onClick={() => {
                                  setSelectedTables(selectedTables.includes(table)
                                    ? selectedTables.filter(t => t !== table)
                                    : [...selectedTables, table]
                                  );
                                }}
                              >
                                <input
                                  type="checkbox"
                                  className="accent-[#BF2A2D] mr-2"
                                  checked={selectedTables.includes(table)}
                                  onChange={e => {
                                    // Prevent double toggle on div click
                                    e.stopPropagation();
                                    setSelectedTables(selectedTables.includes(table)
                                      ? selectedTables.filter(t => t !== table)
                                      : [...selectedTables, table]
                                    );
                                  }}
                                  onClick={e => e.stopPropagation()}
                                />
                                <span className="font-medium">{table}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          !loadingTables && (
                            <div className="text-gray-400">No tables found.</div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

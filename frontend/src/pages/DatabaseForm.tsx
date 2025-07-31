import { useState, useEffect } from "react";
import * as React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Database, Server, User, Lock, CheckCircle, AlertCircle, Loader2, Wifi, WifiOff, MessageCircle } from "lucide-react";
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
    <div className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", variants[variant], className)} {...props}>
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

type ConnectionInfo = {
  server: string;
  database: string;
  username: string;
  method: 'backend' | 'custom';
};

export default function DatabaseForm() {
  const [formData, setFormData] = useState<FormData>({
    server: "",
    username: "",
    password: ""
  });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [responseMsg, setResponseMsg] = useState("");
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [currentConnection, setCurrentConnection] = useState<ConnectionInfo | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});



  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation error when user starts typing (only if fields are enabled)
    if (validationErrors[name] && connectionStatus !== 'connected') {
      setValidationErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    // Only validate if fields are enabled (not connected)
    if (connectionStatus === 'connected') {
      return true;
    }

    const errors: {[key: string]: string} = {};
    
    if (!formData.server.trim()) {
      errors.server = 'Server is required';
    }
    
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    }
    
    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleTestConnection = async () => {
    setConnectionStatus('connecting');
    setResponseMsg("");
    setTables([]);
    setSelectedTables([]);

    try {
        const response = await fetch("/api/test-connection");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to connect to database.");
        }

        setConnectionStatus('connected');
        setResponseMsg(data.message || "Connection established successfully!");
        setTables(data.available_tables || []);
        setCurrentConnection({
          server: data.server || "10.0.40.20",
          database: data.database || "DataWarehouseV2_UK",
          username: data.username || "DEV_TANISH",
          method: 'backend'
        });
    } catch (error) {
        console.error(error);
        setConnectionStatus('error');
        setResponseMsg((error as Error).message || "Failed to connect to database.");
    }
};

  const handleNewConnection = async () => {
    // Validate form before proceeding
    if (!validateForm()) {
      setResponseMsg("Please fill in all required fields.");
      return;
    }

    setConnectionStatus('connecting');
    setResponseMsg("");
    setTables([]);
    setSelectedTables([]);

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

        if (!response.ok) {
            throw new Error(data.detail || "Failed to connect to database.");
        }

        setConnectionStatus('connected');
        setResponseMsg(data.message || "Connection established successfully!");
        setTables(data.available_tables || []);
        setCurrentConnection({
          server: formData.server,
          database: data.database || "Unknown",
          username: formData.username,
          method: 'custom'
        });
    } catch (error) {
        console.error(error);
        setConnectionStatus('error');
        setResponseMsg((error as Error).message || "Failed to connect to database.");
    }
};



  const handleReconnect = async () => {
    if (!currentConnection) return;

    setConnectionStatus('connecting');
    setResponseMsg("");

    try {
        let response;
        if (currentConnection.method === 'backend') {
            response = await fetch("/api/test-connection");
        } else {
            response = await fetch("/api/new-connection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    server: currentConnection.server,
                    username: currentConnection.username,
                    password: formData.password, // Use current password
                    status: "connected"
                }),
            });
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Failed to reconnect to database.");
        }

        setConnectionStatus('connected');
        setResponseMsg(data.message || "Reconnected successfully!");
        setTables(data.available_tables || []);
    } catch (error) {
        console.error(error);
        setConnectionStatus('error');
        setResponseMsg((error as Error).message || "Failed to reconnect to database.");
    }
};

  const handleDisconnect = async () => {
    setConnectionStatus('disconnected');
    setResponseMsg("Disconnected from database.");
    setTables([]);
    setSelectedTables([]);
    // Clear validation errors when disconnecting
    setValidationErrors({});
    // Keep currentConnection for reconnection - don't clear it
  };

  // Check connection status on component mount
useEffect(() => {
    const checkConnection = async () => {
        try {
            const response = await fetch("/api/test-connection");
            const data = await response.json();

        if (response.ok) {
                setConnectionStatus('connected');
          setResponseMsg("Connected to SQL Server database.");
          setTables(data.available_tables || []);
        } else {
          setConnectionStatus('disconnected');
          setResponseMsg("Not connected to database.");
            }
        } catch (error) {
            setConnectionStatus('disconnected');
        setResponseMsg("Not connected to database.");
        }
    };

    checkConnection();
}, []);

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
              <h1 className="text-2xl font-bold text-[#163E5D]">SQL Server Database Connection</h1>
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
          {/* Connection Form and Available Tables - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Connection Form - Takes 2/3 of the width */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Database Connection</CardTitle>
                  <p className="text-gray-600">Connect to SQL Server database</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Current Connection Info - Always Show */}
                    {currentConnection && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-blue-800">Current Connection</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Server:</span>
                            <span className="ml-2 font-medium">{currentConnection.server}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Database:</span>
                            <span className="ml-2 font-medium">{currentConnection.database}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Method:</span>
                            <span className="ml-2 font-medium capitalize">{currentConnection.method}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Default Connection Info - Show when no current connection */}
                    {!currentConnection && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-700">Default Connection</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Server:</span>
                            <span className="ml-2 font-medium">10.0.40.20</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Database:</span>
                            <span className="ml-2 font-medium">DataWarehouseV2_UK</span>
                          </div>
                          <div>
                            <span className="ml-25 text-gray-600">Method:</span>
                            <span className="ml-2 font-medium capitalize">backend</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Input Fields - Only Show When Disconnected */}
                    {connectionStatus === 'disconnected' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Server className="h-4 w-4" />
                            Server
                          </label>
                          <Input
                            name="server"
                            value={formData.server}
                            onChange={handleChange}
                            placeholder="Server address"
                            className={validationErrors.server ? "border-red-500" : ""}
                          />
                          {validationErrors.server && (
                            <p className="text-red-500 text-xs">{validationErrors.server}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Username
                          </label>
                          <Input
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Username"
                            className={validationErrors.username ? "border-red-500" : ""}
                          />
                          {validationErrors.username && (
                            <p className="text-red-500 text-xs">{validationErrors.username}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Password
                          </label>
                          <Input
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Password"
                            className={validationErrors.password ? "border-red-500" : ""}
                          />
                          {validationErrors.password && (
                            <p className="text-red-500 text-xs">{validationErrors.password}</p>
                          )}
                        </div>
                      </div>
                    )}

                {/* Connection Status */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {connectionStatus === 'connected' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : connectionStatus === 'connecting' ? (
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    ) : connectionStatus === 'error' ? (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-gray-400" />
                    )}
                    <span className="text-sm font-medium">
                      {connectionStatus === 'connected' && 'Connected'}
                      {connectionStatus === 'connecting' && 'Connecting...'}
                      {connectionStatus === 'error' && 'Connection Error'}
                      {connectionStatus === 'disconnected' && 'Disconnected'}
                    </span>
                  </div>
                  {connectionStatus === 'connected' && (
                    <Badge variant="success">SQL Server</Badge>
                  )}
                </div>



                {/* Action Buttons */}
                <div className="flex gap-4">
                  {connectionStatus === 'disconnected' && (
                    <>
                      <Button onClick={handleNewConnection}>
                        <Wifi className="h-4 w-4" />
                        Connect
                      </Button>
                      <Button variant="outline" onClick={handleTestConnection}>
                        <Wifi className="h-4 w-4" />
                        Test Connection
                      </Button>
                      {currentConnection && (
                        <Button variant="secondary" onClick={handleReconnect}>
                          <Wifi className="h-4 w-4" />
                          Reconnect Previous
                        </Button>
                      )}
                    </>
                  )}
                  {connectionStatus === 'connecting' && (
                    <Button disabled>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </Button>
                  )}
                  {connectionStatus === 'connected' && (
                    <>
                      <Button variant="secondary" onClick={handleReconnect}>
                        <Wifi className="h-4 w-4" />
                        Reconnect
                      </Button>
                      <Button variant="outline" onClick={handleDisconnect}>
                        Disconnect
                      </Button>
                    </>
                  )}
                  {connectionStatus === 'error' && (
                    <>
                      <Button onClick={handleNewConnection}>
                        <Wifi className="h-4 w-4" />
                        Retry Connection
                      </Button>
                      <Button variant="outline" onClick={handleTestConnection}>
                        <Wifi className="h-4 w-4" />
                        Test Connection
                      </Button>
                      {currentConnection && (
                        <Button variant="secondary" onClick={handleReconnect}>
                          <Wifi className="h-4 w-4" />
                          Reconnect Previous
                        </Button>
                      )}
                    </>
                  )}
                </div>

              {/* Response Message */}
              {responseMsg && (
                  <Alert variant={connectionStatus === 'error' ? 'destructive' : 'success'}>
                    {responseMsg}
                </Alert>
              )}
              </div>
            </CardContent>
          </Card>
            </div>

            {/* Available Tables - Takes 1/3 of the width */}
            <div className="lg:col-span-1">
              {connectionStatus === 'connected' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Available Tables</CardTitle>
                    <p className="text-gray-600">Tables in DataWarehouseV2_UK database</p>
                  </CardHeader>
                  <CardContent>
                    {loadingTables ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-gray-600">Loading tables...</span>
                      </div>
                    ) : tables.length > 0 ? (
                      <div className="space-y-2">
                        {tables.map((table) => (
                          <div
                            key={table}
                            className="p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={() => setSelectedTables(prev => 
                              prev.includes(table) 
                                ? prev.filter(t => t !== table)
                                : [...prev, table]
                              )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">{table}</span>
                              {selectedTables.includes(table) && (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No tables available</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center gap-4">
            <Link to="/chat">
              <Button variant="secondary">
                <MessageCircle className="h-4 w-4" />
                Go to Chat
              </Button>
            </Link>
            <Link to="/retrieve-schema">
              <Button variant="outline">
                <Database className="h-4 w-4" />
                View Schema
              </Button>
            </Link>
            <Link to="/sql-query-executor">
              <Button variant="outline">
                <Database className="h-4 w-4" />
                SQL Query Executor
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

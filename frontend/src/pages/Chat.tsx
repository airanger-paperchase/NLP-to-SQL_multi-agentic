import { useState, useRef, useEffect } from "react";
import background from '../assets/windmills-snowy-landscape.jpg';
import Logo from '../assets/logo-paperchase.png';
import { Link } from "react-router-dom";
import PurchaseOrderChart from "../components/PurchaseOrderChart";
import PurchaseOrderTable from "../components/PurchaseOrderTable";
import data from '../PurchaseOrderTable.json';
import { MessageCircle, BarChart3, Database, Loader2 } from 'lucide-react';
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import DatabaseTablesBox from "../components/DatabaseTablesBox";
import ReactMarkdown from 'react-markdown';

export function cn(...inputs: ClassValue[]) {
    return twMerge(inputs as any);
}
// Card Components (same as UploadFile.tsx)
const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div 
        className={cn(
            "rounded-xl border bg-white h-full backdrop-blur-sm shadow-xl", 
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
    <div className={cn("p-6 pt-0 h-full", className)} {...props}>
        {children}
    </div>
);

interface Message {
    role: "user" | "bot";
    content: string;
    dataDescription?: string; // Add optional data description
}

interface SqlResponse {
    sql_query: string;
    data: any[];
    answer: string;
    original_answer?: string;
}

const Chat = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [chartData, setChartData] = useState<any[]>([]);
    const [tableData, setTableData] = useState<any[]>([]);
    const [selectedDatabase, setSelectedDatabase] = useState<string>("paperchase-sales-details");

    const messageRef = useRef<HTMLDivElement>(null);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch('/api/agent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: input
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response from server');
            }

            const data: SqlResponse = await response.json();

            // Debug logging
            console.log("Backend response:", data);
            console.log("Generated description:", data.answer);

            // Process the data from the backend
            if (data.data && Array.isArray(data.data) && data.data.length > 0) {
                // The backend now returns structured data, so we can use it directly
                setChartData(data.data);
                setTableData(data.data);
            } else {
                // Clear previous data if no new data
                setChartData([]);
                setTableData([]);
            }

            const botMessage: Message = {
                role: "bot",
                content: data.answer || "Query executed successfully. Check the data visualization and table below for results.",
                dataDescription: data.answer // Store the generated description
            };

            console.log("Bot message created:", botMessage);

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('Error:', error);
            const errorMessage: Message = {
                role: "bot",
                content: "Sorry, I encountered an error processing your request."
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Handler to receive selection from DatabaseTablesBox
    const handleDatabaseTablesChange = (db: string, tables: string[]) => {
        setSelectedDatabase(db);
        // Remove setSelectedTables call since we removed the state
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
                            <MessageCircle className="h-8 w-8 text-[#BF2A2D]" />
                            <h1 className="text-2xl font-bold text-[#163E5D]">Paperchase Chat Assistant</h1>
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
                {/* <DatabaseTablesBox
                    onSelectionChange={handleDatabaseTablesChange}
                /> */}
                
                {/* Main Content - Side by Side Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Data Visualization - Takes 2/3 of the width */}
                    <Card className="lg:col-span-2 shadow-lg border-1 h-[calc(100vh-200px)]">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <BarChart3 className="h-6 w-6 text-[#BF2A2D]" />
                                Data visualization
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <PurchaseOrderChart data={chartData} />
                        </CardContent>
                    </Card>

                    {/* Chat Section - Takes 1/3 of the width */}
                    <Card className="shadow-lg border-1 flex flex-col h-[calc(100vh-200px)]">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <MessageCircle className="h-6 w-6 text-[#BF2A2D]" />
                                Chat Assistant
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col p-0">
                            <div
                                className="flex-1 overflow-y-auto space-y-4 px-6 pb-6"
                                style={{ maxHeight: "calc(100vh - 300px)" }}
                            >
                                {messages.length > 0 ? (
                                    messages.map((message, index) => (
                                        <div key={index} className="space-y-2">
                                            <div
                                                className={`max-w-[90%] px-4 py-2 rounded-lg ${
                                                    message.role === "user"
                                                        ? "bg-[#BF2A2D] text-white ml-auto"
                                                        : "bg-gray-100 border text-gray-800"
                                                }`}
                                            >
                                                {message.role === "user" ? (
                                                    message.content
                                                ) : (
                                                    <div>
                                                        <div className="font-semibold text-[#163E5D] mb-2">
                                                            📊 Data Analysis
                                                        </div>
                                                        <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                                                            <ReactMarkdown
                                                                components={{
                                                                    // Custom styling for different markdown elements
                                                                    p: ({ children }) => <p className="mb-2 text-gray-800">{children}</p>,
                                                                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                                                                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                                                                    li: ({ children }) => <li className="text-gray-700">{children}</li>,
                                                                    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                                                    em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                                                                    h1: ({ children }) => <h1 className="text-lg font-bold text-gray-900 mb-2">{children}</h1>,
                                                                    h2: ({ children }) => <h2 className="text-base font-semibold text-gray-900 mb-2">{children}</h2>,
                                                                    h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-900 mb-1">{children}</h3>,
                                                                    blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-200 pl-3 italic text-gray-700 mb-2">{children}</blockquote>,
                                                                    code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">{children}</code>,
                                                                    pre: ({ children }) => <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto mb-2">{children}</pre>,
                                                                }}
                                                            >
                                                                {message.dataDescription || message.content}
                                                            </ReactMarkdown>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-gray-500 mt-4">
                                        Ask a question about your sales data
                                    </div>
                                )}
                                {isLoading && (
                                    <div className="flex items-center justify-center gap-2 text-gray-500">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Processing...
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabulated Data - Full Width Below */}
                <Card className="shadow-lg border-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <Database className="h-6 w-6 text-[#BF2A2D]" />
                            Tabulated data
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <PurchaseOrderTable data={tableData} />
                    </CardContent>
                </Card>
               
            </div>

            {/* Chat Input Box - Same Width as Tabulated Data */}
            <div className="sticky bottom-8 left-[calc(16rem+2rem)] right-8">
                <div className="container mx-auto px-4">
                    <div className="max-w-7xl mx-auto p-4 bg-[#ededed] border-1 border-gray-600 rounded-full shadow-lg flex gap-2 hover:border-[#BF2A2D] transition-colors duration-300">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        placeholder="Ask SQL Agent..."
                        className="flex-1 resize-none rounded-full p-2 border-none focus:outline-none focus:ring-0 bg-transparent"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading}
                        className="bg-[linear-gradient(90deg,#BF2A2D_0%,#BF2A2D_100%)] hover:bg-[linear-gradient(90deg,#2F82C3_0%,#163E5D_100%)] transition-[background-image] duration-500 ease-in-out text-white py-[10px] px-[24px] rounded-full"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            'Send'
                        )}
                    </button>
                </div>
                </div>
            </div>
        </div>
    );
};

export default Chat;

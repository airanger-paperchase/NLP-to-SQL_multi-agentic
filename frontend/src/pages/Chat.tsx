import { useState, useRef, useEffect } from "react";
import background from '../assets/windmills-snowy-landscape.jpg';
import Logo from '../assets/logo-paperchase.png';
import { Link } from "react-router-dom";
import PurchaseOrderChart from "../components/PurchaseOrderChart";
import PurchaseOrderTable from "../components/PurchaseOrderTable";
import data from '../PurchaseOrderTable.json';
import { MessageCircle, BarChart3, Database, Loader2, ChevronDown, Sparkles, UserIcon, HomeIcon } from 'lucide-react';
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

interface Company {
    companyCode: string;
    siteCode: string;
}

const Chat = () => {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [chartData, setChartData] = useState<any[]>([]);
    const [tableData, setTableData] = useState<any[]>([]);
    const [selectedDatabase, setSelectedDatabase] = useState<string>("paperchase-sales-details");
    const [companies, setCompanies] = useState<Company[]>([]);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>({
        companyCode: "C1587",
        siteCode: "L2312"
    });
    const [selectedSite, setSelectedSite] = useState<Company | null>({
        companyCode: "C1587",
        siteCode: "L2312"
    });
    const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
    const [showSiteDropdown, setShowSiteDropdown] = useState(false);
    const [companySearchTerm, setCompanySearchTerm] = useState("");
    const [siteSearchTerm, setSiteSearchTerm] = useState("");

    // Filter and sort companies based on search term with relevance scoring
    const filteredCompanies = (companies || [])
        .filter(company => {
            if (!company || !company.companyCode) return false;
            
            const searchLower = companySearchTerm.toLowerCase();
            const companyCode = (company.companyCode || '').toLowerCase();
            
            return companyCode.includes(searchLower);
        })
        .sort((a, b) => {
            if (!companySearchTerm) return 0;
            
            const searchLower = companySearchTerm.toLowerCase();
            const aCode = (a.companyCode || '').toLowerCase();
            const bCode = (b.companyCode || '').toLowerCase();
            
            // Calculate relevance scores
            const getRelevanceScore = (company: Company) => {
                let score = 0;
                const companyCode = (company.companyCode || '').toLowerCase();
                
                // Exact matches get highest score
                if (companyCode === searchLower) score += 1000;
                
                // Starts with matches
                if (companyCode.startsWith(searchLower)) score += 500;
                
                // Contains matches
                if (companyCode.includes(searchLower)) score += 100;
                
                return score;
            };
            
            const aScore = getRelevanceScore(a);
            const bScore = getRelevanceScore(b);
            
            // Sort by score (highest first), then alphabetically
            if (aScore !== bScore) {
                return bScore - aScore;
            }
            
            return aCode.localeCompare(bCode);
        });

    // Filter sites for the selected company
    const filteredSites = (companies || [])
        .filter(company => {
            if (!company || !selectedCompany) return false;
            
            const isMatchingCompany = company.companyCode === selectedCompany.companyCode;
            if (!isMatchingCompany) return false;
            
            if (!siteSearchTerm) return true;
            
            const searchLower = siteSearchTerm.toLowerCase();
            const siteCode = (company.siteCode || '').toLowerCase();
            
            return siteCode.includes(searchLower);
        })
        .sort((a, b) => {
            if (!siteSearchTerm) return 0;
            
            const searchLower = siteSearchTerm.toLowerCase();
            const aSiteCode = (a.siteCode || '').toLowerCase();
            const bSiteCode = (b.siteCode || '').toLowerCase();
            
            // Calculate relevance scores for site codes
            const getRelevanceScore = (company: Company) => {
                let score = 0;
                const siteCode = (company.siteCode || '').toLowerCase();
                
                // Exact matches get highest score
                if (siteCode === searchLower) score += 1000;
                
                // Starts with matches
                if (siteCode.startsWith(searchLower)) score += 500;
                
                // Contains matches
                if (siteCode.includes(searchLower)) score += 100;
                
                return score;
            };
            
            const aScore = getRelevanceScore(a);
            const bScore = getRelevanceScore(b);
            
            // Sort by score (highest first), then by site code
            if (aScore !== bScore) {
                return bScore - aScore;
            }
            
            return aSiteCode.localeCompare(bSiteCode);
        });

    const messageRef = useRef<HTMLDivElement>(null);

    // Fetch companies on component mount
    useEffect(() => {
        fetchCompanies();
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.company-dropdown')) {
                setShowCompanyDropdown(false);
                setCompanySearchTerm(""); // Clear search when closing dropdown
            }
            if (!target.closest('.site-dropdown')) {
                setShowSiteDropdown(false);
                setSiteSearchTerm(""); // Clear search when closing dropdown
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchCompanies = async () => {
        try {
            const response = await fetch('/api/get-companies');
            if (response.ok) {
                const data = await response.json();
                const companiesData = data.companies || [];
                
                // Ensure all companies have valid data
                const validCompanies = companiesData.filter((company: any) => 
                    company && 
                    company.companyCode && 
                    company.siteCode &&
                    typeof company.companyCode === 'string' &&
                    typeof company.siteCode === 'string'
                );
                
                // Add static company/site to the list
                const staticCompany = {
                    companyCode: "C1587",
                    siteCode: "L2312"
                };
                
                // Add static company at the beginning of the list
                const allCompanies = [staticCompany, ...validCompanies];
                
                setCompanies(allCompanies);
                
                // Keep the static values as selected (they're already set in useState)
            } else {
                console.error('Failed to fetch companies:', response.status, response.statusText);
                // Even if API fails, we still have the static values
                setCompanies([{
                    companyCode: "C1587",
                    siteCode: "L2312"
                }]);
            }
        } catch (error) {
            console.error('Error fetching companies:', error);
            // Even if API fails, we still have the static values
            setCompanies([{
                companyCode: "C1587",
                siteCode: "L2312"
            }]);
        }
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            // Prepare request body - only include company and site codes if both are selected
            const requestBody: any = {
                question: input,
                company_code: "C1587",
                site_code: "L2312"
            };

            // // Only add company_code and site_code if both are selected
            // if (selectedCompany && selectedSite) {
            //     requestBody.company_code = selectedCompany.companyCode;
            //     requestBody.site_code = selectedSite.siteCode;
            // }
            // If only company is selected but no site, don't send any company/site parameters

            const response = await fetch('/api/multi-agent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
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
            <div className="bg-gradient-to-b from-[#F5F7FA] to-[#E4E9F2]
            border-r border-[#163E5D]/20 shadow-xl text-white font-medium sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Sparkles className="h-8 w-8 text-purple-950" />
                            <h1 className="text-2xl font-bold text-purple-950">Multi-Agent Platform</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Company Selection Dropdown */}
                            <div className="relative company-dropdown z-[9999]">
                                <button
                                    onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-purple-800 via-purple-900 to-purple-950 rounded-lg shadow-sm hover:bg-purple-800/20 focus:outline-none focus:ring-2 focus:ring-purple-800"
                                >
                                    <span className="text-sm font-medium text-white">
                                        {selectedCompany ? `${selectedCompany.companyCode}` : 'Select Company'}
                                    </span>
                                    <ChevronDown className="h-4 w-4 text-white" />
                                </button>
                                
                                {showCompanyDropdown && (
                                    <div className="absolute right-0 mt-2 w-64 bg-gray-200 shadow-xl text-gray-950 rounded-lg font-medium shadow-soft z-[9999] max-h-60 overflow-y-auto">
                                        {/* Search Input */}
                                        <div className="sticky top-0 bg-gray-200/50 p-2 border-b border-gray-200/20">
                                            <input
                                                type="text"
                                                placeholder="Search company code..."
                                                value={companySearchTerm}
                                                onChange={(e) => setCompanySearchTerm(e.target.value)}
                                                className="w-full px-3 py-1 text-sm bg-transparent text-gray-950 border border-gray-300/30 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent placeholder-gray-950/70"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        
                                        {/* Company List */}
                                        {filteredCompanies.length > 0 ? (
                                            filteredCompanies.map((company, index) => (
                                                <button
                                                    key={`${company.companyCode}-${company.siteCode}-${index}`}
                                                    onClick={() => {
                                                        setSelectedCompany(company);
                                                        setSelectedSite(null); // Reset site selection when company changes
                                                        setShowCompanyDropdown(false);
                                                        setCompanySearchTerm(""); // Clear search when selecting
                                                    }}
                                                    className={`w-full text-left px-4 py-2 hover:bg-purple-950/20 transition-colors duration-200 hover:text-black ${
                                                          selectedCompany?.companyCode === company.companyCode 
                                                             ? 'bg-purple-950 font-bold text-white '
                                                             : ''
                                                      }`}
                                                >
                                                    <div className="font-medium">{company.companyCode}</div>
                                                    <div className="text-xs">Site: {company.siteCode}</div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-4 py-2 text-sm text-gray-500 text-center">
                                                No companies found
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Site Selection Dropdown */}
                            <div className="relative site-dropdown z-[9999]">
                                <button
                                    onClick={() => setShowSiteDropdown(!showSiteDropdown)}
                                    disabled={!selectedCompany}
                                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-800 transition-colors duration-200 ${
                                        selectedCompany 
                                            ? 'bg-gradient-to-br from-purple-800 via-purple-900 to-purple-950 border-purple-800 hover:bg-purple-800/20 text-white' 
                                            : 'bg-white/10 border-white/50 text-white/50 cursor-not-allowed'
                                    }`}
                                >
                                    <span className="text-sm font-medium">
                                        {selectedSite ? `Site ${selectedSite.siteCode}` : 'Select Site'}
                                    </span>
                                    <ChevronDown className="h-4 w-4" />
                                </button>
                                
                                {showSiteDropdown && selectedCompany && (
                                    <div className="absolute right-0 mt-2 w-64 bg-gray-200 shadow-xl text-gray-950 rounded-lg font-medium shadow-soft z-[9999] max-h-60 overflow-y-auto">
                                        {/* Search Input */}
                                        <div className="sticky top-0 bg-gray-200/50 p-2 border-b border-gray-200/20">
                                            <input
                                                type="text"
                                                placeholder="Search site code..."
                                                value={siteSearchTerm}
                                                onChange={(e) => setSiteSearchTerm(e.target.value)}
                                                className="w-full px-3 py-1 text-sm bg-transparent text-gray-950 border border-gray-300/30 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent placeholder-gray-950/70"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        
                                        {/* Site List */}
                                        {filteredSites.length > 0 ? (
                                            filteredSites.map((site, index) => (
                                                <button
                                                    key={`${site.companyCode}-${site.siteCode}-${index}`}
                                                    onClick={() => {
                                                        setSelectedSite(site);
                                                        setShowSiteDropdown(false);
                                                        setSiteSearchTerm(""); // Clear search when selecting
                                                    }}
                                                    className={`w-full text-left px-4 py-2 hover:bg-purple-950/20 transition-colors duration-200 hover:text-black ${
                                                           selectedSite?.siteCode === site.siteCode 
                                                             ? 'bg-purple-950 font-bold text-white '
                                                              : ''
                                                       }`}
                                                >
                                                    <div className="font-medium">Site {site.siteCode}</div>
                                                    <div className="text-xs">{site.companyCode}</div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-4 py-2 text-sm text-gray-500 text-center">
                                                No sites found
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {/* <Link to='/'>
                                <img 
                                    src={Logo} 
                                    alt="Logo" 
                                    width={150} 
                                    height={106} 
                                    className="hover:scale-105 transition-transform duration-200" 
                                />
                            </Link> */}
                            <Link to='/'>
                                <HomeIcon className="h-8 w-8 text-purple-950 ml-10" />
                            </Link>
                        </div>
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
                                <BarChart3 className="h-6 w-6 text-purple-800" />
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
                                <MessageCircle className="h-6 w-6 text-purple-800" />
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
                                                        ? "bg-gradient-to-br from-purple-800 via-purple-900 to-purple-950 shadow-xl text-white rounded-lg font-medium shadow-soft ml-auto"
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
                            <Database className="h-6 w-6 text-purple-800" />
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
                    <div className="max-w-7xl mx-auto p-4 bg-[#ededed] border-1 border-gray-600 rounded-full shadow-lg flex gap-2 hover:border-purple-800 transition-colors duration-300">
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
                        className="bg-gradient-to-br from-purple-800 via-purple-900 to-purple-950 hover:bg-[linear-gradient(90deg,#2F82C3_0%,#163E5D_100%)] transition-[background-image] duration-500 ease-in-out text-white py-[10px] px-[24px] rounded-full"
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

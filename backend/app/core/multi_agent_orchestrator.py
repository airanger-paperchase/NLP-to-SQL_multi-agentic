import os
import asyncio
import json
import pyodbc
from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.open_ai import AzureChatCompletion
from semantic_kernel.functions.kernel_function_decorator import kernel_function
from semantic_kernel.agents import ChatCompletionAgent
from core.config import AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, API_VERSION_GA, SERVER, DATABASE, USERNAME, PASSWORD

# SQL Server connection configuration
def get_sql_server_connection_string():
    """Get SQL Server connection string"""
    return (
        f"DRIVER={{ODBC Driver 18 for SQL Server}};"
        f"SERVER={SERVER};DATABASE={DATABASE};"
        f"UID={USERNAME};PWD={PASSWORD};TrustServerCertificate=yes;"
    )

class TableDataManager:
    """Manages table schema and sample data for each table"""
    
    def __init__(self):
        self.table_configs = {
            'Vw_SI_SalesDetails': {
                'description': 'Detailed sales transaction data with individual line items and category information',
                'business_context': 'Contains granular sales data including individual items sold, quantities, prices, transaction details, and category data for analysis by categories, sub-categories, and item-level details'
            },
            'Vw_SI_SalesSummary': {
                'description': 'Summary sales data and metrics (no category information)',
                'business_context': 'Contains aggregated sales information, totals, and summary metrics for business analysis. Does not include category or item-level details'
            },
            'View_DiscountDetails': {
                'description': 'Company and master data information',
                'business_context': 'Contains company details, master data, and reference information'
            },
            'DayPartMst': {
                'description': 'Day part master data with DayPartName',
                'business_context': 'Contains day part information like Lunch, Dinner, All Day, etc.'
            },
            'PaperchaseCategoryMaster': {
                'description': 'Paperchase category master data with PaperchaseCategoryName',
                'business_context': 'Contains category information for menu items'
            },
            'MenuItemCategoryMst': {
                'description': 'Menu item category master data with SubCategoryName',
                'business_context': 'Contains sub-category information for menu items'
            },
            'RevenueCenterMst': {
                'description': 'Revenue center master data with RevenueCenterName',
                'business_context': 'Contains revenue center information like Restaurant, Bar, Terrace, etc.'
            }
        }
    
    def get_table_schema(self, table_name: str) -> dict:
        """Get schema information for a specific table"""
        try:
            conn_str = get_sql_server_connection_string()
            conn = pyodbc.connect(conn_str)
            cursor = conn.cursor()
            
            cursor.execute(f"""
                SELECT 
                    COLUMN_NAME,
                    DATA_TYPE,
                    IS_NULLABLE,
                    COLUMN_DEFAULT
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '{table_name}'
                ORDER BY ORDINAL_POSITION
            """)
            columns = cursor.fetchall()
            
            schema = [
                {
                    'name': col[0], 
                    'type': col[1], 
                    'nullable': col[2], 
                    'default': col[3]
                }
                for col in columns
            ]
            
            cursor.close()
            conn.close()
            return schema
        except Exception as e:
            print(f"Error reading schema for {table_name}: {e}")
            return []
    
    def get_table_sample_data(self, table_name: str, limit: int = 5) -> list:
        """Get sample data for a specific table"""
        try:
            conn_str = get_sql_server_connection_string()
            conn = pyodbc.connect(conn_str)
            cursor = conn.cursor()
            
            cursor.execute(f"SELECT TOP {limit} * FROM dbo.{table_name}")
            columns = [column[0] for column in cursor.description] if cursor.description else []
            rows = cursor.fetchall()
            
            sample_data = []
            for row in rows:
                row_dict = {}
                for i, value in enumerate(row):
                    row_dict[columns[i]] = str(value) if value is not None else None
                sample_data.append(row_dict)
            
            cursor.close()
            conn.close()
            return sample_data
        except Exception as e:
            print(f"Error reading sample data for {table_name}: {e}")
            return []
    
    def get_table_context(self, table_name: str) -> dict:
        """Get complete context for a table including schema, sample data, and business context"""
        if table_name not in self.table_configs:
            return None
        
        schema = self.get_table_schema(table_name)
        sample_data = self.get_table_sample_data(table_name)
        
        return {
            'table_name': table_name,
            'description': self.table_configs[table_name]['description'],
            'business_context': self.table_configs[table_name]['business_context'],
            'schema': schema,
            'sample_data': sample_data
        }

class RouterAgent:
    """Agent responsible for analyzing user questions and routing to appropriate table agents"""
    
    def __init__(self, table_manager: TableDataManager):
        self.table_manager = table_manager
        self.kernel = Kernel()
        self.kernel.add_service(
            AzureChatCompletion(
                deployment_name="gpt-4o",
                endpoint=AZURE_OPENAI_ENDPOINT,
                api_key=AZURE_OPENAI_KEY
            )
        )
    
    def generate_router_prompt(self) -> str:
        """Generate the prompt for the router agent"""
        available_tables = list(self.table_manager.table_configs.keys())
        
        return f"""
        You are a Table Router Agent for Paperchase, a hospitality and restaurant management company.
        
        Your job is to analyze user questions and determine which table(s) are most appropriate to answer the query.
        
        AVAILABLE TABLES:
        {chr(10).join([f"- {table}: {self.table_manager.table_configs[table]['description']}" for table in available_tables])}
        
        TABLE DETAILS:
        {chr(10).join([f"## {table} ##" + chr(10) + f"Description: {self.table_manager.table_configs[table]['description']}" + chr(10) + f"Business Context: {self.table_manager.table_configs[table]['business_context']}" for table in available_tables])}
        
        ROUTING RULES:
        1. Analyze the user's question carefully
        2. Identify what type of data they need (detailed transactions, summaries, company info, etc.)
        3. Choose the most appropriate table based on the question content
        4. If the question requires data from multiple tables, prioritize the main table
        5. Consider the business context of each table when making your decision
        6. IMPORTANT: Questions about categories, sales by category, or category analysis should use Vw_SI_SalesDetails
        7. Questions about totals and summaries without category detail should use Vw_SI_SalesSummary
        
        DECISION CRITERIA:
        - Vw_SI_SalesDetails: Questions about individual items, line-level details, specific transactions, categories, category analysis, sales by category, sub-categories, item-level analysis
        - Vw_SI_SalesSummary: Questions about totals, summaries, aggregated data, business metrics (when no category or item-level detail is needed)
        - View_DiscountDetails: Questions about company information, master data, reference data
        - DayPartMst: Questions about day parts (Lunch, Dinner, All Day, etc.)
        - PaperchaseCategoryMaster: Questions about categories and category names (standalone category queries)
        - MenuItemCategoryMst: Questions about sub-categories and sub-category names (standalone sub-category queries)
        - RevenueCenterMst: Questions about revenue centers and revenue center names (standalone revenue center queries)
        
        RESPONSE FORMAT:
        Return ONLY a JSON object with the following structure:
        {{
            "selected_table": "table_name",
            "confidence": "high/medium/low",
            "reasoning": "brief explanation of why this table was chosen"
        }}
        
        EXAMPLE RESPONSES:
        - For "Show me total sales by month": {{"selected_table": "Vw_SI_SalesSummary", "confidence": "high", "reasoning": "Question asks for totals and summaries"}}
        - For "What items were sold in transaction 123": {{"selected_table": "Vw_SI_SalesDetails", "confidence": "high", "reasoning": "Question asks for individual line items"}}
        - For "What is the sale for each category for 2025": {{"selected_table": "Vw_SI_SalesDetails", "confidence": "high", "reasoning": "Question asks for sales by category, requires category analysis"}}
        - For "Sales by category": {{"selected_table": "Vw_SI_SalesDetails", "confidence": "high", "reasoning": "Question asks for category-based analysis"}}
        - For "Company information": {{"selected_table": "View_DiscountDetails", "confidence": "high", "reasoning": "Question asks for company/master data"}}
        
        KEYWORDS FOR ROUTING:
        - "category", "categories", "by category", "sales by category" → Vw_SI_SalesDetails
        - "sub-category", "subcategory", "by sub-category" → Vw_SI_SalesDetails
        - "item", "items", "line items", "individual items" → Vw_SI_SalesDetails
        - "total", "summary", "overview", "aggregated" (without category) → Vw_SI_SalesSummary
        - "day part", "lunch", "dinner" → Vw_SI_SalesDetails or Vw_SI_SalesSummary
        - "revenue center", "restaurant", "bar" → Vw_SI_SalesDetails or Vw_SI_SalesSummary
        
        USER QUESTION: {{user_question}}
        
        Analyze the question and return the appropriate table selection in JSON format.
        """
    
    async def route_question(self, user_question: str) -> dict:
        """Route a user question to the appropriate table"""
        try:
            print(f"\n🔄 ROUTER AGENT: Starting to analyze question: '{user_question}'")
            
            router_agent = ChatCompletionAgent(
                kernel=self.kernel,
                name="TableRouterAgent",
                instructions=self.generate_router_prompt(),
                plugins=[]
            )
            
            print(f"🔄 ROUTER AGENT: Created router agent, sending question to GPT-4o...")
            result = await router_agent.get_response(messages=user_question)
            response_content = result.content.content.strip()
            print(f"🔄 ROUTER AGENT: Raw response from GPT-4o: {response_content}")
            
            # Parse JSON response
            try:
                routing_decision = json.loads(response_content)
                print(f"🔄 ROUTER AGENT: Successfully parsed JSON response")
                print(f"🔄 ROUTER AGENT: Selected Table: {routing_decision.get('selected_table', 'N/A')}")
                print(f"🔄 ROUTER AGENT: Confidence: {routing_decision.get('confidence', 'N/A')}")
                print(f"🔄 ROUTER AGENT: Reasoning: {routing_decision.get('reasoning', 'N/A')}")
                return routing_decision
            except json.JSONDecodeError:
                print(f"🔄 ROUTER AGENT: JSON parsing failed, trying fallback extraction...")
                # Fallback: try to extract table name from response
                for table_name in self.table_manager.table_configs.keys():
                    if table_name.lower() in response_content.lower():
                        fallback_decision = {
                            "selected_table": table_name,
                            "confidence": "medium",
                            "reasoning": "Extracted from response text"
                        }
                        print(f"🔄 ROUTER AGENT: Fallback - Selected Table: {table_name}")
                        return fallback_decision
                
                # Default to SalesSummary if no clear match
                default_decision = {
                    "selected_table": "Vw_SI_SalesSummary",
                    "confidence": "low",
                    "reasoning": "Default fallback"
                }
                print(f"🔄 ROUTER AGENT: Default fallback - Selected Table: Vw_SI_SalesSummary")
                return default_decision
                
        except Exception as e:
            print(f"🔄 ROUTER AGENT: Error occurred: {e}")
            error_decision = {
                "selected_table": "Vw_SI_SalesSummary",
                "confidence": "low",
                "reasoning": f"Error occurred: {str(e)}"
            }
            print(f"🔄 ROUTER AGENT: Error fallback - Selected Table: Vw_SI_SalesSummary")
            return error_decision

class TableSpecialistAgent:
    """Specialized agent for a specific table"""
    
    def __init__(self, table_name: str, table_context: dict, company_code: str = None, site_code: str = None):
        self.table_name = table_name
        self.table_context = table_context
        self.company_code = company_code
        self.site_code = site_code
        print(f"\n🔧 TABLE SPECIALIST AGENT: Created for table '{table_name}'")
        print(f"🔧 TABLE SPECIALIST AGENT: Company Code: {company_code}")
        print(f"🔧 TABLE SPECIALIST AGENT: Site Code: {site_code}")
        print(f"🔧 TABLE SPECIALIST AGENT: Table description: {table_context.get('description', 'N/A')}")
        print(f"🔧 TABLE SPECIALIST AGENT: Business context: {table_context.get('business_context', 'N/A')}")
        print(f"🔧 TABLE SPECIALIST AGENT: Schema columns: {len(table_context.get('schema', []))}")
        print(f"🔧 TABLE SPECIALIST AGENT: Sample data records: {len(table_context.get('sample_data', []))}")
        
        self.kernel = Kernel()
        self.kernel.add_service(
            AzureChatCompletion(
                deployment_name="gpt-4o",
                endpoint=AZURE_OPENAI_ENDPOINT,
                api_key=AZURE_OPENAI_KEY
            )
        )
    
    def generate_table_prompt(self) -> str:
        """Generate the prompt for this table specialist agent using the original comprehensive system message"""
        schema_info = []
        for col in self.table_context['schema']:
            nullable_info = " (NOT NULL)" if col['nullable'] == 'NO' else ""
            default_info = f" (Default: {col['default']})" if col['default'] else ""
            schema_info.append(f"- {col['name']}: {col['type']}{nullable_info}{default_info}")
        
        sample_data_str = json.dumps(self.table_context['sample_data'], indent=2, default=str)
        
        # Company and Site filter clause - only apply if both company_code and site_code are provided
        company_filter = ""
        if self.company_code and self.site_code:
            company_filter = f"""
            COMPANY AND SITE FILTER:
            - Company Code: {self.company_code}
            - Site Code: {self.site_code}
            - Always filter by CompanyCode = '{self.company_code}' AND SiteCode = '{self.site_code}' in WHERE clause
            - This ensures data is specific to the selected company and site: {self.company_code}/{self.site_code}
            - For master tables (DayPartMst, PaperchaseCategoryMaster, MenuItemCategoryMst, RevenueCenterMst), always include CompanyCode and SiteCode filters
            """
        elif self.company_code and not self.site_code:
            company_filter = f"""
            COMPANY FILTER:
            - Company Code: {self.company_code}
            - Site Code: Not selected
            - Always filter by CompanyCode = '{self.company_code}' in WHERE clause
            - This ensures data is specific to the selected company: {self.company_code}
            - For master tables, include CompanyCode filter
            """
        else:
            company_filter = """
            NO COMPANY/SITE FILTER:
            - No company or site filters will be applied
            - Query will return data for all companies and sites
            """
        
        return f"""
        You are a domain-specific SQL assistant for Paperchase, a hospitality and restaurant management company.

        You are a SQL expert generating queries specifically for SQL Server (T-SQL). Always follow SQL Server syntax and best practices. Use TOP for row restriction, not LIMIT. Ensure joins are compatible with SQL Server. Use proper SQL Server date functions and data types.

        CRITICAL: You must return ONLY SQL queries. NO explanations, NO markdown, NO comments, NO descriptive text.

        You have access to the following SQL Server table in the DataWarehouseV2_UK database:

        Table: {self.table_name} - Contains {len(self.table_context['schema'])} column(s)
        Description: {self.table_context['description']}
        Business Context: {self.table_context['business_context']}

        ACTUAL TABLE COLUMNS (based on real database schema):
        {chr(10).join(schema_info)}

        SAMPLE DATA (for reference):
        {sample_data_str}

        {company_filter}

        ### MSSQL Query Rules:  
        # always use MSSQL query syntax.
        # never use MYSQL query syntax.
        # this table contains revenue data for restaurants  
        # always summarise data by grouping and only show required columns
        # average spend = spend per head  
        # DayPart contains session/DayPart related values (Lunch, Dinner, All Day, etc.)
        # RevenueCenter contains service locations (Restaurant, Bar, Terrace, Room Service, etc.)
        # if both SUM() and FORMAT() functions are used then never use FORMAT inside SUM. Always use sum inside FORMAT.
        # Example of Wrong Syntax : SUM(FORMAT(NetAmount, 'N0', 'en-GB'))
        # Example of Correct Syntax : FORMAT(SUM(NetAmount), 'N0', 'en-GB')
        # FORMAT numeric values, amount, quantity in 'N0'
        # never FORMAT month in 'N0'
        # never FORMAT [nVARCHAR] column values in 'N0'
        # always use exact same values, formulas and format in "GROUP BY" and "ORDER BY" CLAUSE in SQL Query
        # be concise and return only required columns and do not return columns if not requested
        # Never use NULLIF() function

        ### SQL Constraints:
        {f"# CompanyCode = '{self.company_code}'" if self.company_code else "# No company filter"}
        {f"# SiteCode = '{self.site_code}'" if self.site_code else "# No site filter"}
        # always use SQL Server query syntax
        # always use year column in select if its used in where condition
        # never use 'STR_TO_DATE' function as its not available for MSSQL
        # Month column includes Month names as values
        # year column contains year number as values
        # never try to find YEAR from date and always use year column values when required
        # if year column is used in SELECT then always sort it by year DESC
        # if month column is returned then always sort it by Month in calendar month order keeping in mind that it contains month names as values
        # always summarise data by using 'Group BY' clause if data asked as group by.
        # always group by YEAR if its used in SORT BY
        # Do not use 'DATEADD()' function in a query
        # never convert/cast cover column values to FLOAT.
        # never return Date column if group by data is asked in a query. In that case always apply 'GROUP BY' condition accordingly.
        # never name columns name as Formatted
        # if only sales/revenue is asked then only return values from NetAmount only and do not return any other columns
        # if covers, average spend is asked then return NetAmount, Covers, Average Spend columns only
        # do not return GrossAmount, DiscountAmount Columns if not requested
        # always convert date values in DATE format in a query
        # Date values are in format 'YYYY-mm-dd'
        # all revenue value columns have highest weightage for sort
        # never return a table name
        # avoid returning too many columns and return less columns as possible
        # avoid returning RevenueCenter, covers, averagespend, ServiceChargeAmount, HouseTipsAmount and DayPart if not asked specifically
        # never use 'hardcoded' values in generated query in SELECT clause
        # always FORMAT GrossAmount, NetAmount, DiscountAmount in FORMAT('value', 'N0', 'en-GB')
        # always FORMAT Date in FORMAT('date', 'dd/MM/yyyy')
        # strictly follow SQL table fields and do not use any column in query if its not part of that table  
        # always use exact same values, formulas and format in "GROUP BY" and "ORDER BY" CLAUSE in SQL Query.  
        # for calculating average spend if covers are 0 then replace it by 1  

        ### SQL Column Values:   
        # Month column includes Month names January, February, March, April, May, June, July, August, September, October, November, December
        # DayPart values: Lunch, Dinner, All Day, etc.
        # RevenueCenter values: Restaurant, Bar, Terrace, Room Service, etc.

        ### AVAILABLE COLUMNS FOR {self.table_name}:
        # CheckId - Transaction identifier
        # Date - Transaction date
        # Month - Month name (January, February, etc.)
        # Year - Year number
        # DayPart - Time of day (Lunch, Dinner, All Day, etc.)
        # RevenueCenter - Service location (Restaurant, Bar, Terrace, etc.)
        # Covers - Number of people served
        # GrossAmount - Gross transaction amount
        # NetAmount - Net transaction amount
        # DiscountAmount - Discount applied
        # ServiceChargeAmount - Service charge
        # HouseTipsAmount - House tips
        # SiteCode - Site identifier
        # CompanyCode - Company identifier
        {f"# CategoryId - Category identifier (for joining with master tables)" if self.table_name == 'Vw_SI_SalesDetails' else "# CategoryId - Not available in this table"}

        ### AVAILABLE MASTER TABLES FOR INNER JOIN:
        # dbo.DayPartMst - Contains DayPartName (Lunch, Dinner, All Day, etc.)
        # dbo.Vw_SI_CategoryDetails - Contains CategoryName (category names)
        # dbo.MenuItemCategoryMst - Contains SubCategoryName (sub-category names)
        # dbo.RevenueCenterMst - Contains RevenueCenterName (Restaurant, Bar, Terrace, etc.)
        
        IMPORTANT: Use Vw_SI_CategoryDetails for category joins instead of master tables.

        ### INNER JOIN PATTERNS:
        # When you need DayPartName: INNER JOIN dbo.DayPartMst dp ON main.DayPart = dp.DayPart
        # When you need RevenueCenterName: INNER JOIN dbo.RevenueCenterMst rcm ON main.RevenueCenter = rcm.RevenueCenter
        {f"# When you need CategoryName: INNER JOIN dbo.Vw_SI_CategoryDetails cd ON main.CategoryId = cd.CategoryId" if self.table_name == 'Vw_SI_SalesDetails' else "# CategoryName joins not available for this table (CategoryId column not present)"}
        {f"# When you need SubCategoryName: INNER JOIN dbo.MenuItemCategoryMst micm ON main.CategoryId = micm.CategoryId" if self.table_name == 'Vw_SI_SalesDetails' else "# SubCategoryName joins not available for this table (CategoryId column not present)"}

        SQL GENERATION RULES:
        - ALWAYS limit results to the latest 100 records using TOP 100 at the end of every query
        - Always use appropriate table based on the query requirements
        - Use proper date formatting (YYYY-MM-DD) when filtering by dates
        - Always use appropriate data types (DATETIME for dates, DECIMAL for amounts)
        - Use LIKE for partial string matches in text fields
        - For date ranges, use proper date comparison functions
        - Always include relevant columns in SELECT clause
        - Use appropriate aggregation functions (SUM, COUNT, AVG) for summary queries
        - For aggregation queries, apply TOP 100 after ORDER BY clause
        - Use proper SQL Server date functions (GETDATE(), DATEADD, DATEDIFF)
        - When user asks for DayPartName, CategoryName, SubCategoryName, or RevenueCenterName, use INNER JOIN with master tables
        - For DayPartName: INNER JOIN dbo.DayPartMst dp ON main.DayPart = dp.DayPart
        - For RevenueCenterName: INNER JOIN dbo.RevenueCenterMst rcm ON main.RevenueCenter = rcm.RevenueCenter
        {f"- For CategoryName: INNER JOIN dbo.Vw_SI_CategoryDetails cd ON main.CategoryId = cd.CategoryId" if self.table_name == 'Vw_SI_SalesDetails' else "- CategoryName joins not available for this table (CategoryId column not present)"}
        {f"- For SubCategoryName: INNER JOIN dbo.MenuItemCategoryMst micm ON main.CategoryId = micm.CategoryId" if self.table_name == 'Vw_SI_SalesDetails' else "- SubCategoryName joins not available for this table (CategoryId column not present)"}
        - CRITICAL: Use Vw_SI_CategoryDetails for category joins
        
        MONTH COMPARISON RULES:
        - When user asks for specific month comparison (e.g., "compare January and February", "sales in March vs April"), ONLY query for those specific months
        - DO NOT query for all months or every month when specific months are requested
        - Use Month IN ('Month1', 'Month2') for specific month comparisons
        - For month comparisons, use WHERE Month IN ('January', 'February') instead of GROUP BY Month
        - When comparing specific months, include both months in the same query with proper filtering
        - For month-to-month comparisons, use CASE statements to create separate columns for each month
        - Example: "Compare January and February sales" should use WHERE Month IN ('January', 'February') and GROUP BY with CASE statements
        - If user asks for "all months" or "every month", then use GROUP BY Month to get all months
        - If user asks for "monthly" without specifying which months, use GROUP BY Month to get all months
        - Month names are: January, February, March, April, May, June, July, August, September, October, November, December
        - For CategoryName, always use dbo.Vw_SI_CategoryDetails table
        - For SubCategoryName, always use dbo.MenuItemCategoryMst table

        SQL SERVER-SPECIFIC RULES:
        - Use TOP instead of LIMIT for row restriction
        - Use INNER JOIN, LEFT JOIN, RIGHT JOIN, or FULL OUTER JOIN
        - Ensure all JOIN conditions are properly specified with ON clause
        - Use clear table aliases to avoid column name conflicts
        - Use proper SQL Server date functions (GETDATE, DATEADD, DATEDIFF) for date operations
        - Use proper SQL Server data types (VARCHAR, INT, DECIMAL, DATETIME)
        - Use proper SQL Server string functions (LEN, SUBSTRING, CHARINDEX)
        - Use proper SQL Server aggregation functions with GROUP BY
        - Use proper SQL Server window functions when needed

        COMMON QUERY PATTERNS:
        - Basic data retrieval: SELECT TOP 100 * FROM dbo.{self.table_name}
        - Filtered queries: SELECT TOP 100 * FROM dbo.{self.table_name} WHERE ColumnName = 'Value'
        - Aggregation queries: SELECT TOP 100 ColumnName, COUNT(*) FROM dbo.{self.table_name} GROUP BY ColumnName ORDER BY COUNT(*) DESC
        - Date range queries: SELECT TOP 100 * FROM dbo.{self.table_name} WHERE Date BETWEEN '2024-01-01' AND '2024-12-31'
        - Sales by DayPart: SELECT TOP 100 DayPart, FORMAT(SUM(NetAmount), 'N0', 'en-GB') AS TotalSales FROM dbo.{self.table_name} GROUP BY DayPart ORDER BY TotalSales DESC
        - Sales by RevenueCenter: SELECT TOP 100 RevenueCenter, FORMAT(SUM(NetAmount), 'N0', 'en-GB') AS TotalSales FROM dbo.{self.table_name} GROUP BY RevenueCenter ORDER BY TotalSales DESC
        
        MONTH COMPARISON PATTERNS:
        - Specific month comparison: SELECT TOP 100 Month, FORMAT(SUM(NetAmount), 'N0', 'en-GB') AS TotalSales FROM dbo.{self.table_name} WHERE Month IN ('January', 'February') GROUP BY Month ORDER BY Month
        - Month-to-month comparison with CASE: SELECT TOP 100 FORMAT(SUM(CASE WHEN Month = 'January' THEN NetAmount ELSE 0 END), 'N0', 'en-GB') AS JanuarySales, FORMAT(SUM(CASE WHEN Month = 'February' THEN NetAmount ELSE 0 END), 'N0', 'en-GB') AS FebruarySales FROM dbo.{self.table_name} WHERE Month IN ('January', 'February')
        - All months (when requested): SELECT TOP 100 Month, FORMAT(SUM(NetAmount), 'N0', 'en-GB') AS TotalSales FROM dbo.{self.table_name} GROUP BY Month ORDER BY CASE Month WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3 WHEN 'April' THEN 4 WHEN 'May' THEN 5 WHEN 'June' THEN 6 WHEN 'July' THEN 7 WHEN 'August' THEN 8 WHEN 'September' THEN 9 WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12 END
        
        INNER JOIN PATTERNS:
        - Sales with DayPartName: SELECT TOP 100 main.DayPart, dp.DayPartName, FORMAT(SUM(main.NetAmount), 'N0', 'en-GB') AS TotalSales FROM dbo.{self.table_name} main INNER JOIN dbo.DayPartMst dp ON main.DayPart = dp.DayPart GROUP BY main.DayPart, dp.DayPartName ORDER BY TotalSales DESC
        - Sales with RevenueCenterName: SELECT TOP 100 main.RevenueCenter, rcm.RevenueCenterName, FORMAT(SUM(main.NetAmount), 'N0', 'en-GB') AS TotalSales FROM dbo.{self.table_name} main INNER JOIN dbo.RevenueCenterMst rcm ON main.RevenueCenter = rcm.RevenueCenter GROUP BY main.RevenueCenter, rcm.RevenueCenterName ORDER BY TotalSales DESC
        {f"- Sales with CategoryName: SELECT TOP 100 cd.CategoryName, FORMAT(SUM(main.NetAmount), 'N0', 'en-GB') AS TotalNetAmount, FORMAT(SUM(main.GrossAmount), 'N0', 'en-GB') AS TotalGrossAmount, FORMAT(SUM(main.DiscountAmount), 'N0', 'en-GB') AS TotalDiscountAmount, main.Year FROM dbo.{self.table_name} main INNER JOIN dbo.Vw_SI_CategoryDetails cd ON main.CategoryId = cd.CategoryId WHERE main.Year = 2025 AND main.CompanyCode = 'C1587' AND main.SiteCode = 'L2312' GROUP BY cd.CategoryName, main.Year ORDER BY TotalNetAmount DESC" if self.table_name == 'Vw_SI_SalesDetails' else "# CategoryName joins not available for this table"}
        {f"- Sales with SubCategoryName: SELECT TOP 100 micm.SubCategoryName, FORMAT(SUM(main.NetAmount), 'N0', 'en-GB') AS TotalSales FROM dbo.{self.table_name} main INNER JOIN dbo.MenuItemCategoryMst micm ON main.CategoryId = micm.CategoryId GROUP BY micm.SubCategoryName ORDER BY TotalSales DESC" if self.table_name == 'Vw_SI_SalesDetails' else "# SubCategoryName joins not available for this table"}

        AVAILABLE TABLE:
        - dbo.{self.table_name}: {self.table_context['description']}

        MASTER TABLE QUERIES (for reference):
        - DayPartName: SELECT DISTINCT DayPartName FROM dbo.DayPartMst WHERE CompanyCode='C1587' AND SiteCode='L2312'
        - CategoryName: SELECT DISTINCT CategoryName FROM dbo.Vw_SI_CategoryDetails WHERE CompanyCode='C1587' AND SiteCode='L2312'
        - SubCategoryName: SELECT DISTINCT SubCategoryName FROM dbo.MenuItemCategoryMst WHERE CompanyCode='C1587' AND SiteCode='L2312'
        - RevenueCenterName: SELECT DISTINCT RevenueCenterName FROM dbo.RevenueCenterMst WHERE CompanyCode='C1587' AND SiteCode='L2312'

        IMPORTANT: Every query MUST use TOP 100 to ensure only the latest/most relevant 100 records are returned.

        CRITICAL OUTPUT RULES:
        - Return ONLY SQL queries separated by semicolons
        - NO explanations, comments, markdown, or descriptive text
        - NO "Query 1:", "Query 2:", or similar labels
        - NO "###" headers or formatting
        - NO bullet points, NO descriptions, NO analysis
        - ONLY pure SQL statements
        - Each query must end with a semicolon
        - Multiple queries should be separated by semicolons on the same line or different lines
        - NEVER return data analysis or descriptions
        - NEVER return formatted results or summaries
        - ONLY return executable SQL code
        
        JOIN DECISION RULES:
        - If user asks for DayPartName, CategoryName, SubCategoryName, or RevenueCenterName ALONE, use the direct master table queries
        - If user asks for sales data WITH DayPartName, CategoryName, SubCategoryName, or RevenueCenterName, use INNER JOIN patterns
        - Always use the company_code and site_code from the context when filtering master tables
        - CategoryName and SubCategoryName joins are ONLY available for Vw_SI_SalesDetails table (requires CategoryId column)
        - DayPartName and RevenueCenterName joins are available for all sales tables
        - For CategoryName, use CategoryName column from dbo.Vw_SI_CategoryDetails table
        - For SubCategoryName, use SubCategoryName column from dbo.MenuItemCategoryMst table
        - For DayPartName, use DayPartName column from dbo.DayPartMst table
        - For RevenueCenterName, use RevenueCenterName column from dbo.RevenueCenterMst table

        EXAMPLE CORRECT OUTPUT:
        SELECT TOP 100 CheckId, Date, Month, Year FROM dbo.{self.table_name};

        MONTH COMPARISON EXAMPLES:
        - For "Compare January and February sales": SELECT TOP 100 Month, FORMAT(SUM(NetAmount), 'N0', 'en-GB') AS TotalSales FROM dbo.{self.table_name} WHERE Month IN ('January', 'February') GROUP BY Month ORDER BY Month
        - For "Sales in March vs April": SELECT TOP 100 FORMAT(SUM(CASE WHEN Month = 'March' THEN NetAmount ELSE 0 END), 'N0', 'en-GB') AS MarchSales, FORMAT(SUM(CASE WHEN Month = 'April' THEN NetAmount ELSE 0 END), 'N0', 'en-GB') AS AprilSales FROM dbo.{self.table_name} WHERE Month IN ('March', 'April')
        - For "All months sales": SELECT TOP 100 Month, FORMAT(SUM(NetAmount), 'N0', 'en-GB') AS TotalSales FROM dbo.{self.table_name} GROUP BY Month ORDER BY CASE Month WHEN 'January' THEN 1 WHEN 'February' THEN 2 WHEN 'March' THEN 3 WHEN 'April' THEN 4 WHEN 'May' THEN 5 WHEN 'June' THEN 6 WHEN 'July' THEN 7 WHEN 'August' THEN 8 WHEN 'September' THEN 9 WHEN 'October' THEN 10 WHEN 'November' THEN 11 WHEN 'December' THEN 12 END

        EXAMPLE INCORRECT OUTPUT:
        To get data from the table, I will generate a query:
        ### Query: Fetch data from {self.table_name}
        SELECT TOP 100 CheckId, Date, Month, Year FROM dbo.{self.table_name};

        INPUT JSON:
        {{user_question}}

        SCHEMA DETAILS:
        {chr(10).join(schema_info)}

        FINAL INSTRUCTION: Return ONLY SQL queries separated by semicolons. NO explanations, NO markdown, NO comments, NO descriptive text, NO analysis, NO summaries, NO bullet points. ONLY executable SQL statements that can be run directly against the database.
        """

class QueryExecutorPlugin:
    """Plugin for executing SQL queries"""
    
    @staticmethod
    def __clean_sql_query__(sql_query: str) -> str:
        return sql_query.replace("```sql", "").replace("```", "").strip()
    
    @kernel_function(name="execute_query", description="Executes a SQL Server query")
    async def execute_query(self, sql_query: str) -> str:
        def run_query():
            try:
                print(f"🔍 QUERY EXECUTOR: Starting to execute query: {sql_query}")
                query = self.__clean_sql_query__(sql_query)
                print(f"🔍 QUERY EXECUTOR: Cleaned query: {query}")
                
                conn_str = get_sql_server_connection_string()
                print(f"🔍 QUERY EXECUTOR: Connecting to SQL Server...")
                conn = pyodbc.connect(conn_str)
                cursor = conn.cursor()
                
                print(f"🔍 QUERY EXECUTOR: Executing query...")
                cursor.execute(query)
                columns = [column[0] for column in cursor.description] if cursor.description else []
                rows = cursor.fetchall()
                print(f"🔍 QUERY EXECUTOR: Query executed. Found {len(rows)} rows with {len(columns)} columns")
                
                cursor.close()
                conn.close()
                
                if not rows:
                    print(f"🔍 QUERY EXECUTOR: No results found")
                    return []
                
                # Convert to structured data (list of dictionaries)
                result = []
                for row in rows:
                    row_dict = {}
                    for i, column in enumerate(columns):
                        row_dict[column] = str(row[i]) if row[i] is not None else ""
                    result.append(row_dict)
                
                print(f"🔍 QUERY EXECUTOR: Query completed successfully. Found {len(result)} rows")
                return result
            except Exception as e:
                print(f"🔍 QUERY EXECUTOR: Error executing query: {e}")
                return []

        return await asyncio.to_thread(run_query)

class MultiAgentOrchestrator:
    """Main orchestrator for the multi-agent system"""
    
    def __init__(self):
        self.table_manager = TableDataManager()
        self.router_agent = RouterAgent(self.table_manager)
        self.query_executor = QueryExecutorPlugin()
        
        # Initialize description kernel
        self.description_kernel = Kernel()
        self.description_kernel.add_service(
            AzureChatCompletion(
                deployment_name="o3-mini",
                endpoint=AZURE_OPENAI_ENDPOINT,
                api_key=AZURE_OPENAI_KEY,
                api_version=API_VERSION_GA
            )
        )
    
    async def process_question(self, user_question: str, company_code: str = None, site_code: str = None) -> dict:
        """Process a user question through the multi-agent system"""
        try:
            print(f"\n🚀 MULTI-AGENT ORCHESTRATOR: Starting to process question: '{user_question}'")
            print(f"🚀 MULTI-AGENT ORCHESTRATOR: Company Code: {company_code}")
            print(f"🚀 MULTI-AGENT ORCHESTRATOR: Site Code: {site_code}")
            
            # Step 1: Route the question to appropriate table
            print(f"\n📋 STEP 1: ROUTING - Calling Router Agent...")
            routing_result = await self.router_agent.route_question(user_question)
            selected_table = routing_result['selected_table']
            print(f"📋 STEP 1: ROUTING - Router Agent completed. Selected table: {selected_table}")
            
            # Step 2: Get table context
            print(f"\n📋 STEP 2: TABLE CONTEXT - Getting context for table '{selected_table}'...")
            table_context = self.table_manager.get_table_context(selected_table)
            if not table_context:
                print(f"❌ STEP 2: TABLE CONTEXT - Error: Table {selected_table} not found or accessible")
                return {
                    "error": f"Table {selected_table} not found or accessible",
                    "routing_decision": routing_result
                }
            print(f"✅ STEP 2: TABLE CONTEXT - Successfully retrieved context for table '{selected_table}'")
            
            # Step 3: Create table specialist agent
            print(f"\n📋 STEP 3: TABLE SPECIALIST - Creating Table Specialist Agent...")
            table_agent = TableSpecialistAgent(selected_table, table_context, company_code, site_code)
            print(f"✅ STEP 3: TABLE SPECIALIST - Table Specialist Agent created successfully")
            
            # Step 4: Generate SQL query
            print(f"\n📋 STEP 4: SQL GENERATION - Creating SQL Agent with your original system message...")
            sql_agent = ChatCompletionAgent(
                kernel=table_agent.kernel,
                name=f"{selected_table}SQLAgent",
                instructions=table_agent.generate_table_prompt(),
                plugins=[self.query_executor]
            )
            print(f"📋 STEP 4: SQL GENERATION - SQL Agent created, sending question to GPT-4o...")
            sql_result = await sql_agent.get_response(messages=user_question)
            sql_query = sql_result.content.content.strip()
            print(f"📋 STEP 4: SQL GENERATION - Raw SQL response from GPT-4o: {sql_query}")
            
            # Clean SQL query
            sql_query = QueryExecutorPlugin.__clean_sql_query__(sql_query)
            print(f"✅ STEP 4: SQL GENERATION - Cleaned SQL query: {sql_query}")
            
            # Validate that the response is actually SQL and not descriptive text
            if not sql_query.strip().upper().startswith('SELECT') and not sql_query.strip().upper().startswith('WITH'):
                print(f"❌ STEP 4: SQL GENERATION - Error: Response is not valid SQL. Got: {sql_query[:100]}...")
                return {
                    "error": "Generated response is not valid SQL. Please try again.",
                    "routing_decision": routing_result,
                    "selected_table": selected_table,
                    "raw_response": sql_query
                }
            
            # Validate SQL query against actual table schema
            valid_columns = [col['name'] for col in table_context['schema']]
            print(f"✅ STEP 4: SQL GENERATION - Valid columns: {valid_columns}")
            
            # Step 5: Execute the query
            print(f"\n📋 STEP 5: QUERY EXECUTION - Executing SQL query...")
            query_result = await self.query_executor.execute_query(sql_query)
            print(f"📋 STEP 5: QUERY EXECUTION - Query result length: {len(str(query_result))} characters")
            print(f"📋 STEP 5: QUERY EXECUTION - Query result preview: {str(query_result)[:100]}...")
            
            # Step 6: Generate description
            print(f"\n📋 STEP 6: DESCRIPTION - Generating business description...")
            description = await self.generate_data_description(
                query_result, sql_query, user_question
            )
            print(f"📋 STEP 6: DESCRIPTION - Description length: {len(description)} characters")
            print(f"📋 STEP 6: DESCRIPTION - Description preview: {description[:100]}...")
            
            print(f"\n🎉 MULTI-AGENT ORCHESTRATOR: All steps completed successfully!")
            
            return {
                "routing_decision": routing_result,
                "selected_table": selected_table,
                "sql_query": sql_query,
                "data": query_result,
                "description": description
            }
            
        except Exception as e:
            print(f"\n❌ MULTI-AGENT ORCHESTRATOR: Error occurred: {str(e)}")
            return {
                "error": f"Error processing question: {str(e)}",
                "user_question": user_question
            }
    
    async def generate_data_description(self, data: list, sql_query: str, user_question: str) -> str:
        """Generate description of the data using o3-mini model with original system message"""
        try:
            print(f"📝 DESCRIPTION AGENT: Starting to generate description...")
            print(f"📝 DESCRIPTION AGENT: Data type: {type(data)}")
            print(f"📝 DESCRIPTION AGENT: Data rows: {len(data) if isinstance(data, list) else 'N/A'}")
            print(f"📝 DESCRIPTION AGENT: SQL query: {sql_query}")
            print(f"📝 DESCRIPTION AGENT: User question: {user_question}")
            
            # Convert structured data to string format for the description agent
            if isinstance(data, list) and len(data) > 0:
                # Convert list of dictionaries to tab-separated string
                columns = list(data[0].keys())
                data_str = "\t".join(columns) + "\n"
                data_str += "\n".join("\t".join(str(row.get(col, "")) for col in columns) for row in data)
            else:
                data_str = "No data available"
            
            description_prompt = f"""
            You are a data analyst assistant for Paperchase, a hospitality and restaurant management company.

            Your task is to analyze the provided data and generate a clear markdown formatted, concise description of what the data shows.

            IMPORTANT RULES:
            - If the data is empty, null, or contains no meaningful information, respond ONLY with: "I don't have data for this query. Please try another question."
            - If the SQL query resulted in an error or no results, respond ONLY with: "I don't have data for this query. Please try another question."
            - If the data shows "No results found" or similar error messages, respond ONLY with: "I don't have data for this query. Please try another question."
            - DO NOT generate any analysis, insights, or descriptions if there's no valid data to analyze
            - Only proceed with analysis if you have actual, meaningful data to work with

            DATA ANALYSIS GUIDELINES (ONLY if you have valid data):
            - Focus on key insights and patterns in the data
            - Highlight important metrics, trends, or anomalies
            - Use business-friendly language
            - Keep the description concise, word-to-word, and easy to understand for business users
            - Mention the number of records analyzed
            - If there are specific columns with interesting values, mention them
            - Provide actionable insights when possible
            - Do not go into too much detail; keep it short and to the point

            DATA TO ANALYZE:
            {data_str}

            SQL QUERY EXECUTED:
            {sql_query}

            USER QUESTION:
            {user_question}

            FIRST CHECK: Is the data empty, null, or contains error messages? If yes, respond with "I don't have data for this query. Please try another question."

            If you have valid data, generate a clear, business-focused description of what this data reveals. Focus on insights that would be valuable for restaurant management decisions.
            """
            
            print(f"📝 DESCRIPTION AGENT: Created description prompt, sending to o3-mini...")
            description_agent = ChatCompletionAgent(
                kernel=self.description_kernel,
                name="DataDescriptionAgent",
                instructions=description_prompt,
                plugins=[]
            )
            
            result = await description_agent.get_response(messages=f"Analyze this data: {data_str}")
            
            if result and result.content and result.content.content:
                description = result.content.content.strip()
                print(f"📝 DESCRIPTION AGENT: Received response from o3-mini, length: {len(description)} characters")
                final_description = description if description else "I don't have data for this query. Please try another question."
                print(f"📝 DESCRIPTION AGENT: Final description: {final_description}")
                return final_description
            else:
                print(f"📝 DESCRIPTION AGENT: No valid response from o3-mini, using fallback message")
                return "I don't have data for this query. Please try another question."
                
        except Exception as e:
            print(f"📝 DESCRIPTION AGENT: Error occurred: {str(e)}")
            return "I don't have data for this query. Please try another question."

# Main function to use the orchestrator
async def run_multi_agent_system(question: str, company_code: str = None, site_code: str = None) -> dict:
    """Main function to run the multi-agent system"""
    print(f"\n🎬 MULTI-AGENT SYSTEM: Starting multi-agent system...")
    print(f"🎬 MULTI-AGENT SYSTEM: Question received: '{question}'")
    print(f"🎬 MULTI-AGENT SYSTEM: Company Code: {company_code}")
    print(f"🎬 MULTI-AGENT SYSTEM: Site Code: {site_code}")
    
    if not question or not question.strip():
        print(f"❌ MULTI-AGENT SYSTEM: Error - No question provided")
        return {"error": "No question provided"}
    
    print(f"🎬 MULTI-AGENT SYSTEM: Creating MultiAgentOrchestrator...")
    orchestrator = MultiAgentOrchestrator()
    print(f"🎬 MULTI-AGENT SYSTEM: MultiAgentOrchestrator created successfully")
    print(f"🎬 MULTI-AGENT SYSTEM: Starting to process question...")
    
    result = await orchestrator.process_question(question.strip(), company_code, site_code)
    print(f"🎬 MULTI-AGENT SYSTEM: Processing completed. Result keys: {list(result.keys())}")
    return result 
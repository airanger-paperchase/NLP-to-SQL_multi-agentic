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

def get_database_info():
    """Get comprehensive information about SQL Server database tables"""
    try:
        conn_str = get_sql_server_connection_string()
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Get information about the specified tables
        tables = ['Vw_SI_SalesDetails', 'Vw_SI_SalesSummary', 'View_DiscountDetails']
        db_info = {}
        
        for table_name in tables:
            try:
                # Get column information
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
                
                db_info[table_name] = [
                    {
                        'name': col[0], 
                        'type': col[1], 
                        'nullable': col[2], 
                        'default': col[3]
                    }
                    for col in columns
                ]
            except Exception as e:
                print(f"Error reading table {table_name}: {e}")
                db_info[table_name] = []
        
        cursor.close()
        conn.close()
        return db_info
    except Exception as e:
        print(f"Error connecting to SQL Server: {e}")
        return {}

def get_database_schema():
    """Get schema information for the specified tables"""
    try:
        conn_str = get_sql_server_connection_string()
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        tables = ['Vw_SI_SalesDetails', 'Vw_SI_SalesSummary', 'View_DiscountDetails']
        schema_info = []
        
        for table_name in tables:
            try:
                cursor.execute(f"""
                    SELECT 
                        COLUMN_NAME,
                        DATA_TYPE,
                        IS_NULLABLE
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = '{table_name}'
                    ORDER BY ORDINAL_POSITION
                """)
                columns = cursor.fetchall()
                
                for col in columns:
                    schema_info.append(f"{table_name} - {col[0]} ({col[1]})")
            except Exception as e:
                schema_info.append(f"Error reading schema for {table_name}: {str(e)}")
        
        cursor.close()
        conn.close()
        return schema_info
    except Exception as e:
        return [f"Error connecting to SQL Server: {str(e)}"]

def get_all_databases_schema():
    """Get schema information for all available tables"""
    schema_info = get_database_schema()
    return "\n".join(schema_info)


class GetSchemaPlugin:
    def __init__(self) -> None:
        pass

    @kernel_function(name="get_schema", description="Retrieves the schema of tables from SQL Server database.")
    async def get_schema(self, _):
        def run_schema_query():
            try:
                return get_all_databases_schema()
            except Exception as e:
                return f"Error retrieving schema: {e}"

        return await asyncio.to_thread(run_schema_query)

class QueryPlugin:
    @kernel_function(name="query_input", description="Receives raw input.")
    async def query_input(self, input_text: str) -> str:
        return input_text

class QuerySQLServerPlugin:
    def __init__(self) -> None:
        pass

    @staticmethod
    def __clean_sql_query__(sql_query: str) -> str:
        return sql_query.replace("```sql", "").replace("```", "").strip()

    def __determine_table__(self, sql_query: str) -> str:
        """Determine which table to use based on the query"""
        query_lower = sql_query.lower()
        
        # Check which table is mentioned in the query
        tables = ['Vw_SI_salesdetails', 'Vw_SI_salessummary', 'View_DiscountDetails']
        
        for table in tables:
            if table in query_lower:
                return table
        
        # Default to SalesSummary if no specific table mentioned
        return 'Vw_SI_salessummary'

    @kernel_function(name="query_sqlserver", description="Executes a SQL Server query on the available tables.")
    async def query_sqlserver(self, sql_query: str) -> str:
        def run_query():
            try:
                query = self.__clean_sql_query__(sql_query)
                
                # Connect to SQL Server
                conn_str = get_sql_server_connection_string()
                conn = pyodbc.connect(conn_str)
                cursor = conn.cursor()
                
                # Execute the query
                cursor.execute(query)
                
                # Get column names
                columns = [column[0] for column in cursor.description] if cursor.description else []
                
                # Fetch all rows
                rows = cursor.fetchall()
                
                cursor.close()
                conn.close()
                
                if not rows:
                    return "No results found."
                
                # Format results as tab-separated values
                result = "\t".join(columns) + "\n"
                result += "\n".join("\t".join(str(val) for val in row) for row in rows)
                return result
            except Exception as e:
                return f"Error executing query: {e}"

        return await asyncio.to_thread(run_query)

# Initialize kernel and plugins
kernel = Kernel()
kernel.add_service(
    AzureChatCompletion(
        deployment_name="gpt-4o",
        endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_KEY
    )
)

# Initialize second kernel for o3-mini model
kernel_mini = Kernel()
kernel_mini.add_service(
    AzureChatCompletion(
        deployment_name="o3-mini",
        endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_KEY,
        api_version=API_VERSION_GA
    )
)

schema_plugin = GetSchemaPlugin()
query_plugin = QueryPlugin()
query_executor = QuerySQLServerPlugin()

def generate_dynamic_prompt_template():
    """Generate a dynamic prompt template based on available SQL Server tables"""
    db_info = get_database_info()
    
    # Build table overview
    table_overview = []
    columns_overview = []
    
    for table_name, columns in db_info.items():
        table_overview.append(f"Table: {table_name} - Contains {len(columns)} column(s)")
        
        # Add column information
        columns_overview.append(f"\n{table_name} Table:")
        for col in columns:
            columns_overview.append(f"- {col['name']}: {col['type']}")
            if col['nullable'] == 'NO':
                columns_overview.append("  (NOT NULL)")
            if col['default']:
                columns_overview.append(f"  (Default: {col['default']})")
    
    # SQL QUERY PROMPT TEMPLATE
    return f"""
        You are a domain-specific SQL assistant for Paperchase, a hospitality and restaurant management company.

        You are a SQL expert generating queries specifically for SQL Server (T-SQL). Always follow SQL Server syntax and best practices. Use TOP for row restriction, not LIMIT. Ensure joins are compatible with SQL Server. Use proper SQL Server date functions and data types.

        CRITICAL: You must return ONLY SQL queries. NO explanations, NO markdown, NO comments, NO descriptive text.

        You have access to the following SQL Server tables in the DataWarehouseV2_UK database:

        {chr(10).join(table_overview)}

        COLUMNS OVERVIEW (based on the actual database schema):

        {chr(10).join(columns_overview)}

        SQL GENERATION RULES:
        - ALWAYS limit results to the latest 20 records using TOP 20 at the end of every query
        - Always use appropriate table based on the query requirements
        - Use proper date formatting (YYYY-MM-DD) when filtering by dates
        - Always use appropriate data types (DATETIME for dates, DECIMAL for amounts)
        - Use LIKE for partial string matches in text fields
        - For date ranges, use proper date comparison functions
        - Always include relevant columns in SELECT clause
        - Use appropriate aggregation functions (SUM, COUNT, AVG) for summary queries
        - For aggregation queries, apply TOP 20 after ORDER BY clause
        - Use proper SQL Server date functions (GETDATE(), DATEADD, DATEDIFF)

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
        - Basic data retrieval: SELECT TOP 20 * FROM dbo.Vw_SI_SalesSummary
        - Filtered queries: SELECT TOP 20 * FROM dbo.Vw_SI_SalesSummary WHERE ColumnName = 'Value'
        - Aggregation queries: SELECT TOP 20 ColumnName, COUNT(*) FROM dbo.Vw_SI_SalesSummary GROUP BY ColumnName ORDER BY COUNT(*) DESC
        - Date range queries: SELECT TOP 20 * FROM dbo.Vw_SI_SalesSummary WHERE Date BETWEEN '2024-01-01' AND '2024-12-31'
        - JOIN queries: SELECT TOP 20 t1.Col1, t2.Col2 FROM dbo.Vw_SI_SalesSummary t1 LEFT JOIN dbo.Vw_SI_SalesDetails t2 ON t1.Id = t2.Id

        AVAILABLE TABLES:
        - dbo.Vw_SI_SalesDetails: Detailed sales transaction data
        - dbo.Vw_SI_SalesSummary: Summary sales data and metrics
        - dbo.View_DiscountDetails: Company and master data information

        IMPORTANT: Every query MUST use TOP 20 to ensure only the latest/most relevant 20 records are returned.

        CRITICAL OUTPUT RULES:
        - Return ONLY SQL queries separated by semicolons
        - NO explanations, comments, markdown, or descriptive text
        - NO "Query 1:", "Query 2:", or similar labels
        - NO "###" headers or formatting
        - ONLY pure SQL statements
        - Each query must end with a semicolon
        - Multiple queries should be separated by semicolons on the same line or different lines

        EXAMPLE CORRECT OUTPUT:
        SELECT TOP 20 CheckId, Date, Month, Year FROM dbo.Vw_SI_SalesSummary;
        SELECT TOP 20 CheckId, Date, Month, Year FROM dbo.Vw_SI_SalesDetails;

        EXAMPLE INCORRECT OUTPUT:
        To compare data from both tables, I will generate two queries:
        ### Query 1: Fetch data from Vw_SI_SalesSummary
        SELECT TOP 20 CheckId, Date, Month, Year FROM dbo.Vw_SI_SalesSummary;
        ### Query 2: Fetch data from Vw_SI_SalesDetails  
        SELECT TOP 20 CheckId, Date, Month, Year FROM dbo.Vw_SI_SalesDetails;

        INPUT JSON:
        {{input_text}}

        SCHEMA DETAILS:
        {{schema_details}}

        FINAL INSTRUCTION: Return ONLY SQL queries separated by semicolons. NO explanations, NO markdown, NO comments, NO descriptive text. ONLY SQL statements.
        """

# Use dynamic prompt template
JSON_PROMPT_TEMPLATE = generate_dynamic_prompt_template()

async def run_agent_and_get_queries_and_results(question: str):
    # Require a question to be provided
    if not question or not question.strip():
        return []
    
    # Use the provided question directly
    input_payload = question.strip()

    agent = ChatCompletionAgent(
        kernel=kernel,
        name="SQLAssistantAgent",
        instructions=JSON_PROMPT_TEMPLATE.format(
            schema_details=await schema_plugin.get_schema(None),
            input_text=input_payload
        ),
        plugins=[schema_plugin, query_plugin],
    )

    result = await agent.get_response(messages=input_payload)
    raw_sql = result.content.content.strip()
    
    # Clean up the response to extract only SQL queries
    import re
    
    # Remove markdown code blocks
    raw_sql = re.sub(r'```sql\s*', '', raw_sql)
    raw_sql = re.sub(r'```\s*', '', raw_sql)
    
    # Remove explanatory text and headers
    raw_sql = re.sub(r'###.*?\n', '', raw_sql)
    raw_sql = re.sub(r'Query \d+:.*?\n', '', raw_sql)
    raw_sql = re.sub(r'To compare.*?\n', '', raw_sql)
    raw_sql = re.sub(r'I will generate.*?\n', '', raw_sql)
    raw_sql = re.sub(r'These queries.*?\n', '', raw_sql)
    
    # Extract only SQL statements
    sql_pattern = r'SELECT.*?TOP\s+\d+'
    sql_matches = re.findall(sql_pattern, raw_sql, re.IGNORECASE | re.DOTALL)
    
    if sql_matches:
        # Use the extracted SQL statements
        sql_queries = [match.strip() + ";" for match in sql_matches]
    else:
        # Fallback to original splitting method
        sql_queries = [
            q.strip() for q in raw_sql.split(";")
            if q.strip() and not q.strip().lower().startswith("--") and "SELECT" in q.upper()
        ]

    queries_and_results = []
    
    # Execute each query
    for sql in sql_queries:
        output = await query_executor.query_sqlserver(sql)
        queries_and_results.append((sql, output))
    
    return queries_and_results

# Description generation prompt template
DESCRIPTION_PROMPT_TEMPLATE = """
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
    {data_to_analyze}

    SQL QUERY EXECUTED:
    {sql_query}

    USER QUESTION:
    {user_question}

    FIRST CHECK: Is the data empty, null, or contains error messages? If yes, respond with "I don't have data for this query. Please try another question."

    If you have valid data, generate a clear, business-focused description of what this data reveals. Focus on insights that would be valuable for restaurant management decisions.
    """

async def generate_data_description(data: list, sql_query: str, user_question: str) -> str:
    """Generate a description of the data using o3-mini model"""
    try:
        # Format data for analysis
        if not data:
            return "I don't have data for this query. Please try another question."
        
        # Check if data contains error messages
        if isinstance(data, str) and any(error_msg in data.lower() for error_msg in ['no results found', 'error', 'not found', 'empty']):
            return "I don't have data for this query. Please try another question."
        
        # Check if data is a list with error messages
        if isinstance(data, list) and len(data) == 0:
            return "I don't have data for this query. Please try another question."
        
        # Check if data contains only error information
        if isinstance(data, list) and len(data) == 1 and isinstance(data[0], str) and any(error_msg in data[0].lower() for error_msg in ['no results found', 'error', 'not found', 'empty']):
            return "I don't have data for this query. Please try another question."
        
        # Ensure data is a list
        if not isinstance(data, list):
            data = [data]
        
        # Limit data size to prevent token overflow
        if len(data) > 50:
            data = data[:50]  # Take first 50 records for analysis
        
        # Convert data to a readable format
        try:
            data_str = json.dumps(data, indent=2, default=str)
        except Exception as json_error:
            # Fallback to string representation
            data_str = str(data)
        
        # Create the description agent
        description_agent = ChatCompletionAgent(
            kernel=kernel_mini,
            name="DataDescriptionAgent",
            instructions=DESCRIPTION_PROMPT_TEMPLATE.format(
                data_to_analyze=data_str,
                sql_query=sql_query,
                user_question=user_question
            ),
            plugins=[query_plugin],
        )
        
        # Generate description
        result = await description_agent.get_response(messages=f"Analyze this data: {data_str}")
        
        # Ensure we get a valid response
        if result and result.content and result.content.content:
            description = result.content.content.strip()
            if description:
                return description
            else:
                return "I don't have data for this query. Please try another question."
        else:
            return "I don't have data for this query. Please try another question."
        
    except Exception as e:
        print(f"Error in generate_data_description: {str(e)}")
        return "I don't have data for this query. Please try another question." 
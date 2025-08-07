import os
import asyncio
import json
import sqlite3
from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.open_ai import AzureChatCompletion
from semantic_kernel.functions.kernel_function_decorator import kernel_function
from semantic_kernel.agents import ChatCompletionAgent
# Removed fetch_latest_v2_from_cosmos dependency
from core.config import AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, API_VERSION_GA, SERVER, DATABASE, USERNAME, PASSWORD, AZURE_OPENAI_DEPLOYMENT_NAME, AZURE_OPENAI_DEPLOYMENT_NAME_DESCRIPTION

# Dynamic database detection - No hardcoded paths needed!
def get_workspace_databases():
    """Dynamically detect all SQLite databases in the workspace"""
    import glob
    workspace_path = r"C:\Users\Paperchase.AHM-LT-0006\OneDrive - Paperchase Accountancy\Documents\NLP-to-SQL_multi-agentic"
    db_files = glob.glob(os.path.join(workspace_path, "*.db"))
    return db_files

def get_database_info():
    """Get comprehensive information about all databases"""
    db_files = get_workspace_databases()
    db_info = {}
    
    for db_path in db_files:
        db_name = os.path.basename(db_path)
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Get all tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            
            db_info[db_name] = {
                'path': db_path,
                'tables': {}
            }
            
            for table in tables:
                table_name = table[0]
                cursor.execute(f"PRAGMA table_info({table_name});")
                columns = cursor.fetchall()
                
                db_info[db_name]['tables'][table_name] = [
                    {'name': col[1], 'type': col[2], 'not_null': col[3], 'default': col[4]}
                    for col in columns
                ]
            
            cursor.close()
            conn.close()
        except Exception as e:
            print(f"Error reading database {db_name}: {e}")
    
    return db_info

def get_database_schema(db_path):
    """Get schema information for a specific database"""
    try:
        if not os.path.exists(db_path):
            return []
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        schema_info = []
        for table in tables:
            table_name = table[0]
            cursor.execute(f"PRAGMA table_info({table_name});")
            columns = cursor.fetchall()
            
            for col in columns:
                schema_info.append(f"{table_name} - {col[1]} ({col[2]})")
        
        cursor.close()
        conn.close()
        return schema_info
    except Exception as e:
        return [f"Error reading schema for {db_path}: {str(e)}"]

def get_all_databases_schema():
    """Get schema information for all available databases"""
    all_schema = []
    db_files = get_workspace_databases()
    
    for db_path in db_files:
        db_name = os.path.basename(db_path)
        all_schema.append(f"\n--- Database: {db_name} ---")
        schema_info = get_database_schema(db_path)
        all_schema.extend(schema_info)
    
    return "\n".join(all_schema)


class GetSchemaPlugin:
    def __init__(self) -> None:
        # No static database paths - fully dynamic
        pass

    @kernel_function(name="get_schema", description="Retrieves the schema of tables from SQLite databases.")
    async def get_schema(self, _):
        def run_schema_query():
            try:
                # Use dynamic schema detection
                return get_all_databases_schema()
            except Exception as e:
                return f"Error retrieving schema: {e}"

        return await asyncio.to_thread(run_schema_query)

class QueryPlugin:
    @kernel_function(name="query_input", description="Receives raw input.")
    async def query_input(self, input_text: str) -> str:
        return input_text

class QuerySQLitePlugin:
    def __init__(self) -> None:
        # No static database paths - fully dynamic
        pass

    @staticmethod
    def __clean_sql_query__(sql_query: str) -> str:
        return sql_query.replace("```sql", "").replace("```", "").strip()

    def __determine_database__(self, sql_query: str) -> str:
        """Dynamically determine which database to use based on the query"""
        query_lower = sql_query.lower()
        
        # Try to find the database by checking which tables exist in each database
        available_dbs = get_workspace_databases()
        table_to_db_mapping = {}
        
        # First, build a mapping of which tables exist in which databases
        for db_path in available_dbs:
            try:
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = [table[0].lower() for table in cursor.fetchall()]
                cursor.close()
                conn.close()
                
                for table in tables:
                    table_to_db_mapping[table] = db_path
            except:
                continue
        
        # Check if this is a JOIN query
        if any(join_type in query_lower for join_type in ['join', 'left join', 'inner join', 'cross join']):
            # Extract table names from the query (simplified extraction)
            import re
            table_pattern = r'from\s+(\w+)|join\s+(\w+)'
            matches = re.findall(table_pattern, query_lower)
            tables_in_query = []
            for match in matches:
                if match[0]:  # FROM clause
                    tables_in_query.append(match[0])
                if match[1]:  # JOIN clause
                    tables_in_query.append(match[1])
            
            # Check if tables are in different databases
            databases_needed = set()
            for table in tables_in_query:
                if table in table_to_db_mapping:
                    databases_needed.add(table_to_db_mapping[table])
            
            if len(databases_needed) > 1:
                # Cross-database JOIN detected - return error message
                return "CROSS_DATABASE_JOIN_ERROR"
        
        # For single database queries, find the appropriate database
        for table_name, db_path in table_to_db_mapping.items():
            if table_name in query_lower:
                return db_path
        
        # Default to first available database if no match found
        if available_dbs:
            return available_dbs[0]
        else:
            raise Exception("No databases found in workspace")
    
    def get_tables_by_database(self, sql_query: str) -> dict:
        """Get tables mentioned in query grouped by their databases"""
        query_lower = sql_query.lower()
        available_dbs = get_workspace_databases()
        table_to_db_mapping = {}
        db_to_tables = {}
        
        # Build mapping of tables to databases
        for db_path in available_dbs:
            try:
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = [table[0] for table in cursor.fetchall()]
                cursor.close()
                conn.close()
                
                for table in tables:
                    table_to_db_mapping[table.lower()] = db_path
                    if db_path not in db_to_tables:
                        db_to_tables[db_path] = []
                    db_to_tables[db_path].append(table)
            except:
                continue
        
        # Extract table names from query
        import re
        table_pattern = r'from\s+(\w+)|join\s+(\w+)'
        matches = re.findall(table_pattern, query_lower)
        tables_in_query = []
        for match in matches:
            if match[0]:  # FROM clause
                tables_in_query.append(match[0])
            if match[1]:  # JOIN clause
                tables_in_query.append(match[1])
        
        # Group tables by database
        result = {}
        for table in tables_in_query:
            if table in table_to_db_mapping:
                db_path = table_to_db_mapping[table]
                if db_path not in result:
                    result[db_path] = []
                result[db_path].append(table)
        
        return result
    
    def generate_separate_queries_for_databases(self, original_query: str, user_question: str) -> list:
        """Generate separate queries for each database when cross-database JOIN is needed"""
        tables_by_db = self.get_tables_by_database(original_query)
        
        if len(tables_by_db) <= 1:
            return [original_query]
        
        # Common fields that can be used for comparison
        common_fields = ['CheckId', 'Date', 'Month', 'Year', 'DayPart', 'RevenueCenter', 'CompanyCode', 'SiteCode']
        
        separate_queries = []
        
        for db_path, tables in tables_by_db.items():
            db_name = os.path.basename(db_path)
            
            # Generate a query for each table in this database
            for table in tables:
                # Create a query that selects common fields for comparison
                query = f"SELECT {', '.join(common_fields)} FROM {table} LIMIT 20"
                separate_queries.append(query)
        
        return separate_queries

    @kernel_function(name="query_sqlite", description="Executes a SQLite query on the available databases.")
    async def query_sqlite(self, sql_query: str) -> str:
        def run_query():
            try:
                query = self.__clean_sql_query__(sql_query)
                
                # Dynamically determine which database to use
                db_path = self.__determine_database__(query)
                
                # Check for cross-database JOIN error
                if db_path == "CROSS_DATABASE_JOIN_ERROR":
                    # Instead of returning an error, provide guidance for separate queries
                    tables_by_db = self.get_tables_by_database(query)
                    if len(tables_by_db) > 1:
                        guidance = "Multi-database query detected. Here are the tables by database:\n"
                        for db_path, tables in tables_by_db.items():
                            db_name = os.path.basename(db_path)
                            guidance += f"\nDatabase: {db_name}\nTables: {', '.join(tables)}\n"
                        guidance += "\nPlease generate separate queries for each database using common fields for comparison."
                        return guidance
                    else:
                        return "Error: Cross-database JOIN detected. SQLite does not support joining tables from different databases. Please query tables from the same database or use separate queries."
                
                if not os.path.exists(db_path):
                    return f"Database file {db_path} not found."
                
                conn = sqlite3.connect(db_path)
                cur = conn.cursor()
                cur.execute(query)
                col_names = [desc[0] for desc in cur.description] if cur.description else []
                rows = cur.fetchall()
                cur.close()
                conn.close()
                
                if not rows:
                    return "No results found."
                
                result = "\t".join(col_names) + "\n"
                result += "\n".join("\t".join(str(val) for val in row) for row in rows)
                return result
            except Exception as e:
                return f"Error executing query: {e}"

        return await asyncio.to_thread(run_query)

# Initialize kernel and plugins
kernel = Kernel()
kernel.add_service(
    AzureChatCompletion(
        deployment_name=AZURE_OPENAI_DEPLOYMENT_NAME,
        endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_KEY
    )
)

# Initialize second kernel for o3-mini model
kernel_mini = Kernel()
kernel_mini.add_service(
    AzureChatCompletion(
        deployment_name=AZURE_OPENAI_DEPLOYMENT_NAME_DESCRIPTION,
        endpoint=AZURE_OPENAI_ENDPOINT,
        api_key=AZURE_OPENAI_KEY,
        api_version=API_VERSION_GA
    )
)

schema_plugin = GetSchemaPlugin()
query_plugin = QueryPlugin()
query_executor = QuerySQLitePlugin()

def generate_dynamic_prompt_template():
    """Generate a dynamic prompt template based on available databases"""
    db_info = get_database_info()
    
    # Build database overview
    db_overview = []
    columns_overview = []
    
    for db_name, db_data in db_info.items():
        db_overview.append(f"{len(db_data['tables'])}. {db_name} - Contains {len(db_data['tables'])} table(s)")
        
        for table_name, columns in db_data['tables'].items():
            db_overview.append(f"   - Table: {table_name}")
            
            # Add column information
            columns_overview.append(f"\n{table_name} Table:")
            for col in columns:
                columns_overview.append(f"- {col['name']}: {col['type']}")
                if col['not_null']:
                    columns_overview.append("  (NOT NULL)")
                if col['default']:
                    columns_overview.append(f"  (Default: {col['default']})")
    
    # SQL QUERY PROMPT TEMPLATE
    return f"""
        You are a domain-specific SQL assistant for Paperchase, a hospitality and restaurant management company.

        You are a SQL expert generating queries specifically for SQLite (sqlite3). Always follow SQLite syntax and limitations. Use LIMIT for row restriction, not TOP. Ensure joins are compatible with SQLite. Avoid unsupported features like FULL OUTER JOIN or procedural elements. Use column aliases clearly. 

        CRITICAL: You must return ONLY SQL queries. NO explanations, NO markdown, NO comments, NO descriptive text.

        You have access to multiple SQLite databases:

        {chr(10).join(db_overview)}

        COLUMNS OVERVIEW (based on the actual database schema):

        {chr(10).join(columns_overview)}

        MULTI-DATABASE QUERY HANDLING:
        When a question requires data from tables in different databases, you MUST:
        1. Analyze the question to identify which tables are needed from which databases
        2. Generate SEPARATE queries for each database
        3. Each query should focus on the tables available in that specific database
        4. Use common fields (like CheckId, Date, CompanyCode, SiteCode) to enable later data correlation
        5. Generate queries that can be compared or combined in the analysis phase

        EXAMPLE MULTI-DATABASE SCENARIO:
        If asked to compare Vw_SI_SalesSummary and Vw_SI_SalesDetails tables:
        SELECT CheckId, Date, Month, Year, DayPart, RevenueCenter, CompanyCode, SiteCode FROM Vw_SI_SalesSummary LIMIT 20;
        SELECT CheckId, Date, Month, Year, DayPart, RevenueCenter, CompanyCode, SiteCode FROM Vw_SI_SalesDetails LIMIT 20;

        SQL GENERATION RULES:
        - ALWAYS limit results to the latest 20 records using LIMIT 20 at the end of every query
        - Always use appropriate database based on the query requirements
        - Use proper date formatting (DD-MM-YYYY) when filtering by dates
        - Always use appropriate data types (TEXT for dates, INTEGER for amounts)
        - Use LIKE for partial string matches in text fields
        - For date ranges, use proper date comparison functions
        - Always include relevant columns in SELECT clause
        - Use appropriate aggregation functions (SUM, COUNT, AVG) for summary queries
        - For aggregation queries, apply LIMIT 20 after GROUP BY and ORDER BY clauses
        - For multi-database scenarios, generate separate queries with matching column structures

        INTELLIGENT DATABASE SELECTION:
        - Analyze the question to identify required tables and their databases
        - If tables are in different databases, generate separate queries
        - Each query should be self-contained and focused on one database
        - Use common identifier columns to enable data correlation

        SQLITE-SPECIFIC RULES:
        - Use LIMIT instead of TOP for row restriction
        - Use INNER JOIN, LEFT JOIN, or CROSS JOIN (avoid FULL OUTER JOIN - not supported in SQLite)
        - Ensure all JOIN conditions are properly specified with ON clause
        - Use clear table aliases to avoid column name conflicts
        - Use proper SQLite date functions (strftime, date) for date operations
        - Avoid complex subqueries that might cause performance issues
        - Use proper column aliasing to distinguish between joined tables
        - Ensure all referenced columns exist in the joined tables
        - IMPORTANT: All tables in a JOIN must be from the same database - SQLite does not support cross-database joins
        - If you need data from multiple databases, use separate queries instead of JOINs

        COMMON QUERY PATTERNS:
        - Basic data retrieval: SELECT * FROM TableName LIMIT 20
        - Filtered queries: SELECT * FROM TableName WHERE ColumnName = 'Value' LIMIT 20
        - Aggregation queries: SELECT ColumnName, COUNT(*) FROM TableName GROUP BY ColumnName LIMIT 20
        - Date range queries: SELECT * FROM TableName WHERE Date BETWEEN '01-01-2024' AND '31-12-2024' LIMIT 20
        - JOIN queries: SELECT t1.Col1, t2.Col2 FROM Table1 t1 LEFT JOIN Table2 t2 ON t1.Id = t2.Id LIMIT 20
        - Multi-database queries: Generate separate queries for each database with matching column structures

        IMPORTANT: Every query MUST end with LIMIT 20 to ensure only the latest/most relevant 20 records are returned.

        CRITICAL OUTPUT RULES:
        - Return ONLY SQL queries separated by semicolons
        - NO explanations, comments, markdown, or descriptive text
        - NO "Query 1:", "Query 2:", or similar labels
        - NO "###" headers or formatting
        - ONLY pure SQL statements
        - Each query must end with a semicolon
        - Multiple queries should be separated by semicolons on the same line or different lines

        EXAMPLE CORRECT OUTPUT:
        SELECT CheckId, Date, Month, Year FROM Vw_SI_SalesSummary LIMIT 20;
        SELECT CheckId, Date, Month, Year FROM Vw_SI_SalesDetails LIMIT 20;

        EXAMPLE INCORRECT OUTPUT:
        To compare data from both tables, I will generate two queries:
        ### Query 1: Fetch data from Vw_SI_SalesSummary
        SELECT CheckId, Date, Month, Year FROM Vw_SI_SalesSummary LIMIT 20;
        ### Query 2: Fetch data from Vw_SI_SalesDetails  
        SELECT CheckId, Date, Month, Year FROM Vw_SI_SalesDetails LIMIT 20;

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
    # Remove any markdown formatting, explanations, or comments
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
    sql_pattern = r'SELECT.*?LIMIT\s+\d+'
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
    
    # Check if any query would result in cross-database JOIN
    for sql in sql_queries:
        # Check if this query would cause cross-database JOIN
        db_path = query_executor.__determine_database__(sql)
        
        if db_path == "CROSS_DATABASE_JOIN_ERROR":
            # Generate separate queries for each database
            separate_queries = query_executor.generate_separate_queries_for_databases(sql, input_payload)
            
            # Execute each separate query
            for separate_sql in separate_queries:
                output = await query_executor.query_sqlite(separate_sql)
                queries_and_results.append((separate_sql, output))
        else:
            # Execute the original query
            output = await query_executor.query_sqlite(sql)
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

    MULTI-DATABASE ANALYSIS HANDLING:
    - If multiple queries were executed (from different databases), analyze each dataset separately first
    - Look for common fields between datasets (like CheckId, Date, CompanyCode, SiteCode) to enable comparison
    - Compare data patterns, trends, and insights across different databases
    - Provide insights on how data from different sources relates to each other
    - If comparing similar tables from different databases, highlight differences and similarities

    INTELLIGENT DATABASE SELECTION:
    - The system has analyzed your question and selected the most appropriate database(s)
    - If multiple databases were queried, each query focused on tables from a specific database
    - Use common identifier columns to correlate data across different databases
    - Provide insights that combine information from multiple data sources when possible

    DATA ANALYSIS GUIDELINES (ONLY if you have valid data):
    - Focus on key insights and patterns in the data
    - Highlight important metrics, trends, or anomalies
    - Use business-friendly language
    - Keep the description concise, word-to-word, and easy to understand for business users
    - Mention the number of records analyzed
    - If there are specific columns with interesting values, mention them
    - Provide actionable insights when possible
    - Do not go into too much detail; keep it short and to the point
    - For multi-database scenarios, provide comparative insights and highlight data relationships

    DATA TO ANALYZE:
    {data_to_analyze}

    SQL QUERY EXECUTED:
    {sql_query}

    USER QUESTION:
    {user_question}

    FIRST CHECK: Is the data empty, null, or contains error messages? If yes, respond with "I don't have data for this query. Please try another question."

    If you have valid data, generate a clear, business-focused description of what this data reveals. Focus on insights that would be valuable for restaurant management decisions. If multiple datasets are present, provide comparative analysis and highlight relationships between different data sources.
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
#query_generator.py
import os
import asyncio
import json
import sqlite3
from semantic_kernel import Kernel
from semantic_kernel.connectors.ai.open_ai import AzureChatCompletion
from semantic_kernel.functions.kernel_function_decorator import kernel_function
from semantic_kernel.agents import ChatCompletionAgent
from backend import fetch_latest_v2_from_cosmos
from app.core.config import AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY

# SQLite Database paths
SALES_DETAILS_DB = "Vw_SI_SalesDetails 1.db"
SALES_SUMMARY_DB = "Vw_SI_SalesSummary 1.db"

class GetSchemaPlugin:
    def __init__(self) -> None:
        self.sales_details_db = SALES_DETAILS_DB
        self.sales_summary_db = SALES_SUMMARY_DB

    @kernel_function(name="get_schema", description="Retrieves the schema of tables from SQLite databases.")
    async def get_schema(self, _):
        def run_schema_query():
            try:
                schema_info = []
                
                # Get schema from Sales Details database
                if os.path.exists(self.sales_details_db):
                    conn = sqlite3.connect(self.sales_details_db)
                    cur = conn.cursor()
                    
                    # Get schema for Vw_SI_SalesDetails table
                    cur.execute("PRAGMA table_info(Vw_SI_SalesDetails);")
                    columns = cur.fetchall()
                    for col in columns:
                        schema_info.append(f"Vw_SI_SalesDetails - {col[1]} ({col[2]})")
                    
                    cur.close()
                    conn.close()
                
                # Get schema from Sales Summary database
                if os.path.exists(self.sales_summary_db):
                    conn = sqlite3.connect(self.sales_summary_db)
                    cur = conn.cursor()
                    
                    # Get schema for Vw_SI_SalesSummary table
                    cur.execute("PRAGMA table_info(Vw_SI_SalesSummary);")
                    columns = cur.fetchall()
                    for col in columns:
                        schema_info.append(f"Vw_SI_SalesSummary - {col[1]} ({col[2]})")
                    
                    cur.close()
                    conn.close()
                
                if not schema_info:
                    return "No schema information found. Please ensure the database files exist."
                
                return "\n".join(schema_info)
            except Exception as e:
                return f"Error retrieving schema: {e}"

        return await asyncio.to_thread(run_schema_query)

class QueryPlugin:
    @kernel_function(name="query_input", description="Receives raw input.")
    async def query_input(self, input_text: str) -> str:
        return input_text

class QuerySQLitePlugin:
    def __init__(self) -> None:
        self.sales_details_db = SALES_DETAILS_DB
        self.sales_summary_db = SALES_SUMMARY_DB

    @staticmethod
    def __clean_sql_query__(sql_query: str) -> str:
        return sql_query.replace("```sql", "").replace("```", "").strip()

    @kernel_function(name="query_sqlite", description="Executes a SQLite query on the sales databases.")
    async def query_sqlite(self, sql_query: str) -> str:
        def run_query():
            try:
                query = self.__clean_sql_query__(sql_query)
                
                # Determine which database to use based on the query
                if "Vw_SI_SalesDetails" in query:
                    db_path = self.sales_details_db
                elif "Vw_SI_SalesSummary" in query:
                    db_path = self.sales_summary_db
                else:
                    # Default to SalesDetails if no specific table mentioned
                    db_path = self.sales_details_db
                
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

kernel = Kernel()
kernel.add_service(
    AzureChatCompletion(
        deployment_name=AZURE_OPENAI_DEPLOYMENT_NAME,
        endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
        api_key=os.getenv("AZURE_OPENAI_KEY")
    )
)

schema_plugin = GetSchemaPlugin()
query_plugin = QueryPlugin()
query_executor = QuerySQLitePlugin()

JSON_PROMPT_TEMPLATE = """
You are a domain-specific SQL assistant for Paperchase, a hospitality and restaurant management company.

You have access to two SQLite databases:

1. Vw_SI_SalesDetails 1.db - Contains detailed sales transaction data
   - Table: Vw_SI_SalesDetails
2. Vw_SI_SalesSummary 1.db - Contains summarized sales data
   - Table: Vw_SI_SalesSummary

COLUMNS OVERVIEW (based on the data samples provided):

Vw_SI_SalesDetails Table:
- CheckId: Transaction identifiers (e.g., 'K-2303617', 'TMC-1231', 'J-2406349')
- Date: Transaction dates in DD-MM-YYYY format
- Month: Full month names (e.g., 'July', 'March', 'December')
- Year: Transaction years (e.g., '2024', '2023')
- DayPart: Time of day (e.g., 'Lunch', 'Dinner')
- RevenueCenter: Service location (e.g., 'Chiringuito', 'Restaurant', 'Terrace', 'Room Service')
- MenuItem: Food/beverage items (e.g., 'Wagyu Steak', 'Mixed Leaf salad', 'Sweet Corn salad')
- CategoryId: Unique category identifiers (GUIDs)
- Quantity: Number of items sold
- NetAmount: Net price of items
- GrossAmount: Gross price of items
- DiscountAmount: Discount applied (usually 0)
- CompanyCode: Company identifier
- SiteCode: Site/location identifier

Vw_SI_SalesSummary Table:
- CheckId: Transaction identifiers
- Date: Transaction dates
- Month: Month names
- Year: Transaction years
- DayPart: Time of day
- RevenueCenter: Service location
- Covers: Number of people served
- NetAmount: Net transaction amount
- GrossAmount: Gross transaction amount
- DiscountAmount: Discount applied
- ServiceChargeAmount: Service charge
- HouseTipsAmount: House tips
- SiteCode: Site identifier
- CompanyCode: Company identifier

SQL GENERATION RULES:
- Always use appropriate database based on the query requirements
- For detailed item-level analysis, use Vw_SI_SalesDetails table
- For summary-level analysis, use Vw_SI_SalesSummary table
- Use proper date formatting (DD-MM-YYYY) when filtering by dates
- Always use appropriate data types (TEXT for dates, INTEGER for amounts)
- Use LIKE for partial string matches in MenuItem, RevenueCenter, etc.
- For date ranges, use proper date comparison functions
- Always include relevant columns in SELECT clause
- Use appropriate aggregation functions (SUM, COUNT, AVG) for summary queries

COMMON QUERY PATTERNS:
- Sales by date range: WHERE Date BETWEEN '01-01-2024' AND '31-12-2024'
- Sales by revenue center: WHERE RevenueCenter LIKE '%Restaurant%'
- Sales by day part: WHERE DayPart = 'Dinner'
- Top selling items: GROUP BY MenuItem ORDER BY SUM(Quantity) DESC
- Revenue analysis: GROUP BY Month, Year ORDER BY SUM(NetAmount) DESC

Return only the SQL query. Do not include markdown, explanations, or comments.

INPUT JSON:
{input_text}

SCHEMA DETAILS:
{schema_details}

Return only SQL queries. Do not include markdown or explanation.
"""

async def run_agent_and_get_queries_and_results():
    v2_json_str = fetch_latest_v2_from_cosmos()

    if not v2_json_str:
        return []

    try:
        json_data = json.loads(v2_json_str)
    except json.JSONDecodeError:
        return []

    input_payload = json.dumps(json_data, indent=2)

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
    raw_sql = result.content.content.strip().rstrip(";")

    sql_queries = [
        q.strip() for q in raw_sql.split(";")
        if q.strip() and not q.strip().lower().startswith("--")
    ]

    queries_and_results = []
    for sql in sql_queries:
        output = await query_executor.query_sqlite(sql)
        queries_and_results.append((sql, output))
    print(queries_and_results)
    return queries_and_results


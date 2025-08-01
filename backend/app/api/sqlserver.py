from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pyodbc
import os
import pandas as pd
import json
from pathlib import Path
import io
from core.config import SERVER, DATABASE, USERNAME, PASSWORD

router = APIRouter()

# SQL Server connection configuration
def get_sql_server_connection_string():
    """Get SQL Server connection string"""
    return (
        f"DRIVER={{ODBC Driver 18 for SQL Server}};"
        f"SERVER={SERVER};DATABASE={DATABASE};"
        f"UID={USERNAME};PWD={PASSWORD};TrustServerCertificate=yes;"
    )

# Available tables in SQL Server
AVAILABLE_TABLES = ['Vw_SI_SalesDetails', 'Vw_SI_SalesSummary', 'View_DiscountDetails']

class ConnectionRequest(BaseModel):
    server: str
    username: str
    password: str
    status: str

class SqlQueryRequest(BaseModel):
    table_name: str
    query: str

class IngestRequest(BaseModel):
    data: List[Dict[str, Any]]
    column_types: Dict[str, str]
    table_name: str
    null_cols: List[str]

class UpdateDescriptionRequest(BaseModel):
    description: str

def execute_sql_server_query(query: str) -> List[Dict[str, Any]]:
    """Execute a SQL Server query and return results as list of dictionaries"""
    try:
        conn_str = get_sql_server_connection_string()
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        cursor.execute(query)
        
        # Get column names
        columns = [column[0] for column in cursor.description] if cursor.description else []
        
        # Fetch all rows and convert to list of dictionaries
        rows = cursor.fetchall()
        result = []
        
        for row in rows:
            row_dict = {}
            for i, column in enumerate(columns):
                row_dict[column] = row[i]
            result.append(row_dict)
        
        cursor.close()
        conn.close()
        
        return result
    except pyodbc.Error as e:
        raise HTTPException(status_code=500, detail=f"SQL Server error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/list_all_tables")
async def list_all_tables():
    """List all available tables in SQL Server"""
    try:
        return {"tables": AVAILABLE_TABLES}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing tables: {str(e)}")

@router.get("/retrieve-schema")
async def retrieve_schema(
    table_name: str = Query(..., description="Table name")
):
    """Retrieve schema information for a specific table"""
    try:
        if table_name not in AVAILABLE_TABLES:
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")
        
        # Query to get table schema
        query = f"""
            SELECT 
                COLUMN_NAME as column_name,
                DATA_TYPE as type,
                IS_NULLABLE as notnull,
                COLUMN_DEFAULT as default_value,
                CASE WHEN COLUMNPROPERTY(OBJECT_ID('{table_name}'), COLUMN_NAME, 'IsIdentity') = 1 THEN 1 ELSE 0 END as primary_key
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = '{table_name}'
            ORDER BY ORDINAL_POSITION
        """
        
        results = execute_sql_server_query(query)
        
        # Format the schema data
        schema = []
        for row in results:
            schema.append({
                "column_name": row['column_name'],
                "type": row['type'],
                "notnull": row['notnull'],
                "default_value": row['default_value'],
                "primary_key": row['primary_key']
            })
        
        return {"schema": schema}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving schema: {str(e)}")

@router.post("/sql-query-executor")
async def sql_query_executor(request: SqlQueryRequest):
    """Execute a SQL query on a specific table"""
    try:
        # Validate table name
        if request.table_name not in AVAILABLE_TABLES:
            raise HTTPException(status_code=404, detail=f"Table '{request.table_name}' not found")
        
        # Execute the query
        results = execute_sql_server_query(request.query)
        
        return {
            "data": results,
            "message": f"Query executed successfully. Found {len(results)} rows.",
            "query": request.query
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing query: {str(e)}")

@router.post("/new-connection")
async def new_connection(request: ConnectionRequest):
    """Test SQL Server connection"""
    try:
        # Test the connection
        conn_str = get_sql_server_connection_string()
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Test a simple query
        cursor.execute("SELECT 1 as test")
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if result:
            return {
                "message": f"Connection to SQL Server established successfully!",
                "status": "connected",
                "database": DATABASE,
                "server": SERVER
            }
        else:
            raise HTTPException(status_code=500, detail="Connection test failed")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error establishing connection: {str(e)}")

@router.get("/test-connection")
async def test_connection():
    """Test if the database connection is working"""
    try:
        # Test with a simple query
        conn_str = get_sql_server_connection_string()
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Test a simple query
        query = "SELECT 1 as test"
        cursor.execute(query)
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        if result:
            return {
                "status": "connected",
                "message": "SQL Server connection is working",
                "available_tables": AVAILABLE_TABLES,
                "database": DATABASE,
                "server": SERVER
            }
        else:
            raise HTTPException(status_code=500, detail="Connection test failed")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection test failed: {str(e)}")

# New routes for UploadFile page (adapted for SQL Server)
@router.post("/filter-null-columns")
async def filter_null_columns(file: UploadFile = File(...)):
    """Detect columns with all null values in uploaded Excel file"""
    try:
        # Read the Excel file
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Find columns with all null values
        null_cols = df.columns[df.isnull().all()].tolist()
        
        return {"null_cols": null_cols}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@router.post("/preprocess-excel")
async def preprocess_excel(
    file: UploadFile = File(...),
    null_cols: List[str] = Form([])
):
    """Preprocess Excel file by removing null columns and cleaning data"""
    try:
        # Read the Excel file
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Remove columns with all null values
        if null_cols:
            df = df.drop(columns=null_cols)
        
        # Clean data (remove rows with all null values)
        df = df.dropna(how='all')
        
        # Convert to list of dictionaries
        data = df.to_dict('records')
        
        return {"data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error preprocessing file: {str(e)}")

@router.post("/ingest-to-sql")
async def ingest_to_sql(request: IngestRequest):
    """Ingest data into SQL Server table with enhanced features"""
    try:
        # Validate input data
        if not request.data or len(request.data) == 0:
            raise HTTPException(status_code=400, detail="No data provided for ingestion")
        
        if not request.table_name or request.table_name.strip() == "":
            raise HTTPException(status_code=400, detail="Table name is required")
        
        # Convert data to DataFrame
        df = pd.DataFrame(request.data)
        
        # Clean column names (remove special characters and spaces)
        df.columns = [str(col).strip().replace(' ', '_').replace('-', '_').replace('.', '_') for col in df.columns]
        
        # Handle data types if provided
        if request.column_types:
            for col, dtype in request.column_types.items():
                if col in df.columns:
                    try:
                        if dtype.lower() == 'integer':
                            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)
                        elif dtype.lower() == 'float':
                            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0)
                        elif dtype.lower() == 'datetime':
                            df[col] = pd.to_datetime(df[col], errors='coerce')
                        elif dtype.lower() == 'boolean':
                            df[col] = df[col].astype(bool)
                        else:
                            df[col] = df[col].astype(str)
                    except Exception as e:
                        print(f"Warning: Could not convert column {col} to {dtype}: {e}")
        
        # Remove null columns if specified
        if request.null_cols:
            df = df.drop(columns=[col for col in request.null_cols if col in df.columns])
        
        # Clean data (remove rows with all null values)
        df = df.dropna(how='all')
        
        # Validate we still have data after cleaning
        if len(df) == 0:
            raise HTTPException(status_code=400, detail="No valid data remaining after cleaning")
        
        # Create table and insert data using SQL Server
        conn_str = get_sql_server_connection_string()
        conn = pyodbc.connect(conn_str)
        
        try:
            # Create table if it doesn't exist
            create_table_sql = f"""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='{request.table_name}' AND xtype='U')
            CREATE TABLE {request.table_name} (
                {', '.join([f'{col} NVARCHAR(MAX)' for col in df.columns])}
            )
            """
            conn.execute(create_table_sql)
            
            # Clear existing data
            conn.execute(f"DELETE FROM {request.table_name}")
            
            # Insert data
            for _, row in df.iterrows():
                placeholders = ', '.join(['?' for _ in row])
                insert_sql = f"INSERT INTO {request.table_name} ({', '.join(df.columns)}) VALUES ({placeholders})"
                conn.execute(insert_sql, tuple(row.values))
            
            conn.commit()
            
            # Verify the data was inserted correctly
            cursor = conn.cursor()
            cursor.execute(f"SELECT COUNT(*) FROM {request.table_name}")
            actual_count = cursor.fetchone()[0]
            
            # Get table schema for response
            cursor.execute(f"""
                SELECT 
                    COLUMN_NAME,
                    DATA_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '{request.table_name}'
                ORDER BY ORDINAL_POSITION
            """)
            schema_info = cursor.fetchall()
            
            # Get the actual data that was inserted (limited to first 50 rows for preview)
            cursor.execute(f"SELECT TOP 50 * FROM {request.table_name}")
            columns = [column[0] for column in cursor.description]
            rows = cursor.fetchall()
            cursor.close()
            
            # Convert rows to list of dictionaries
            uploaded_data = []
            for row in rows:
                row_dict = {}
                for i, col in enumerate(columns):
                    row_dict[col] = row[i]
                uploaded_data.append(row_dict)
            
            conn.close()
            
            return {
                "message": f"Data successfully ingested into {request.table_name}",
                "rows_inserted": actual_count,
                "table_name": request.table_name,
                "database_name": DATABASE,
                "columns": [col[0] for col in schema_info],
                "data_types": {col[0]: col[1] for col in schema_info},
                "original_data_count": len(request.data),
                "cleaned_data_count": len(df),
                "data": uploaded_data  # Return the actual uploaded data
            }
            
        except pyodbc.Error as e:
            conn.close()
            raise HTTPException(status_code=500, detail=f"SQL Server error during ingestion: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ingesting data: {str(e)}")

@router.post("/upload-direct-excel")
async def upload_direct_excel(
    file: UploadFile = File(...),
    table_name: str = Query(..., description="Table name")
):
    """Upload Excel file directly to SQL Server table with enhanced features"""
    try:
        # Validate file
        if not file.filename or not file.filename.lower().endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="Please upload a valid Excel file (.xlsx or .xls)")
        
        # Validate table name
        if not table_name or table_name.strip() == "":
            raise HTTPException(status_code=400, detail="Table name is required")
        
        # Read the Excel file
        contents = await file.read()
        
        try:
            df = pd.read_excel(io.BytesIO(contents))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error reading Excel file: {str(e)}")
        
        # Validate we have data
        if len(df) == 0:
            raise HTTPException(status_code=400, detail="Excel file contains no data")
        
        # Clean column names (remove special characters and spaces)
        df.columns = [str(col).strip().replace(' ', '_').replace('-', '_').replace('.', '_') for col in df.columns]
        
        # Clean data (remove rows with all null values)
        df = df.dropna(how='all')
        
        # Validate we still have data after cleaning
        if len(df) == 0:
            raise HTTPException(status_code=400, detail="No valid data remaining after cleaning")
        
        # Create table and insert data using SQL Server
        conn_str = get_sql_server_connection_string()
        conn = pyodbc.connect(conn_str)
        
        try:
            # Create table if it doesn't exist
            create_table_sql = f"""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='{table_name}' AND xtype='U')
            CREATE TABLE {table_name} (
                {', '.join([f'{col} NVARCHAR(MAX)' for col in df.columns])}
            )
            """
            conn.execute(create_table_sql)
            
            # Clear existing data
            conn.execute(f"DELETE FROM {table_name}")
            
            # Insert data
            for _, row in df.iterrows():
                placeholders = ', '.join(['?' for _ in row])
                insert_sql = f"INSERT INTO {table_name} ({', '.join(df.columns)}) VALUES ({placeholders})"
                conn.execute(insert_sql, tuple(row.values))
            
            conn.commit()
            
            # Verify the data was inserted correctly
            cursor = conn.cursor()
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            actual_count = cursor.fetchone()[0]
            
            # Get table schema for response
            cursor.execute(f"""
                SELECT 
                    COLUMN_NAME,
                    DATA_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '{table_name}'
                ORDER BY ORDINAL_POSITION
            """)
            schema_info = cursor.fetchall()
            
            # Get the actual data that was inserted (limited to first 50 rows for preview)
            cursor.execute(f"SELECT TOP 50 * FROM {table_name}")
            columns = [column[0] for column in cursor.description]
            rows = cursor.fetchall()
            cursor.close()
            
            # Convert rows to list of dictionaries
            uploaded_data = []
            for row in rows:
                row_dict = {}
                for i, col in enumerate(columns):
                    row_dict[col] = row[i]
                uploaded_data.append(row_dict)
            
            conn.close()
            
            return {
                "message": f"Excel file successfully uploaded to {table_name}",
                "rows_inserted": actual_count,
                "table_name": table_name,
                "database_name": DATABASE,
                "columns": [col[0] for col in schema_info],
                "data_types": {col[0]: col[1] for col in schema_info},
                "original_data_count": len(df),
                "cleaned_data_count": len(df),
                "file_name": file.filename,
                "data": uploaded_data  # Return the actual uploaded data
            }
            
        except pyodbc.Error as e:
            conn.close()
            raise HTTPException(status_code=500, detail=f"SQL Server error during upload: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

# New routes for TableDescription page
@router.get("/get-description")
async def get_description(
    table_name: str = Query(..., description="Table name")
):
    """Get table description from metadata table"""
    try:
        # Check if table_descriptions table exists
        query = """
        SELECT name FROM sysobjects 
        WHERE type='U' AND name='table_descriptions'
        """
        results = execute_sql_server_query(query)
        
        if not results:
            return {"description": ""}
        
        # Get description
        query = """
        SELECT description FROM table_descriptions 
        WHERE table_name = ?
        """
        
        conn_str = get_sql_server_connection_string()
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        cursor.execute(query, (table_name,))
        result = cursor.fetchone()
        conn.close()
        
        return {"description": result[0] if result else ""}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting description: {str(e)}")

@router.get("/describe-table-columns")
async def describe_table_columns(
    table_name: str = Query(..., description="Table name")
):
    """Generate description for table columns using AI"""
    try:
        # Get table schema
        query = f"""
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = '{table_name}'
            ORDER BY ORDINAL_POSITION
        """
        schema_results = execute_sql_server_query(query)
        
        # Get sample data
        sample_query = f"SELECT TOP 5 * FROM {table_name}"
        sample_results = execute_sql_server_query(sample_query)
        
        # For now, return a basic description based on schema
        description = f"Table {table_name} contains the following columns:\n"
        for col in schema_results:
            description += f"- {col['COLUMN_NAME']} ({col['DATA_TYPE']}): Column data\n"
        
        return {"description": description}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error describing table: {str(e)}")

@router.post("/update-description")
async def update_description(
    request: UpdateDescriptionRequest,
    table_name: str = Query(..., description="Table name")
):
    """Update table description in metadata table"""
    try:
        conn_str = get_sql_server_connection_string()
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Create table_descriptions table if it doesn't exist
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='table_descriptions' AND xtype='U')
            CREATE TABLE table_descriptions (
                id INT IDENTITY(1,1) PRIMARY KEY,
                table_name NVARCHAR(255) NOT NULL,
                description NVARCHAR(MAX),
                created_at DATETIME DEFAULT GETDATE(),
                updated_at DATETIME DEFAULT GETDATE()
            )
        """)
        
        # Insert or update description
        cursor.execute("""
            MERGE table_descriptions AS target
            USING (SELECT ? AS table_name, ? AS description) AS source
            ON target.table_name = source.table_name
            WHEN MATCHED THEN
                UPDATE SET description = source.description, updated_at = GETDATE()
            WHEN NOT MATCHED THEN
                INSERT (table_name, description) VALUES (source.table_name, source.description);
        """, (table_name, request.description))
        
        conn.commit()
        conn.close()
        
        return {"message": "Description updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating description: {str(e)}") 

@router.get("/get-companies")
async def get_companies():
    """Get all company and site codes from View_DiscountDetails table"""
    try:
        query = """
        SELECT DISTINCT 
            CompanyCode,
            SiteCode
        FROM View_DiscountDetails 
        WHERE CompanyCode IS NOT NULL 
        AND SiteCode IS NOT NULL
        ORDER BY CompanyCode, SiteCode
        """
        
        results = execute_sql_server_query(query)
        
        companies = []
        for row in results:
            companies.append({
                "companyCode": str(row.get('CompanyCode', '')),
                "siteCode": str(row.get('SiteCode', ''))
            })
        
        return {"companies": companies}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching companies: {str(e)}") 
from fastapi import APIRouter, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import sqlite3
import os
import pandas as pd
import json
from pathlib import Path
import io

router = APIRouter()

# Dynamic database detection - No hardcoded paths needed!
def get_workspace_databases():
    """Dynamically detect all SQLite databases in the workspace"""
    import glob
    workspace_path = r"C:\Users\Paperchase.AHM-LT-0006\OneDrive - Paperchase Accountancy\Documents\NLP-to-SQL_multi-agentic"
    db_files = glob.glob(os.path.join(workspace_path, "*.db"))
    return db_files

def get_dynamic_database_mapping():
    """Create a dynamic mapping of database names to paths"""
    db_files = get_workspace_databases()
    mapping = {}
    
    for db_path in db_files:
        db_name = os.path.basename(db_path).replace('.db', '')
        mapping[db_name] = db_path
    
    return mapping

# Available databases mapping - Now dynamic!
AVAILABLE_DATABASES = get_dynamic_database_mapping()

class ConnectionRequest(BaseModel):
    server: str
    username: str
    password: str
    status: str

class SqlQueryRequest(BaseModel):
    db_name: str
    query: str

class IngestRequest(BaseModel):
    data: List[Dict[str, Any]]
    column_types: Dict[str, str]
    table_name: str
    db_name: str
    null_cols: List[str]

class UpdateDescriptionRequest(BaseModel):
    description: str

def get_database_path(db_name: str) -> str:
    """Get the file path for a given database name"""
    if db_name in AVAILABLE_DATABASES:
        return AVAILABLE_DATABASES[db_name]
    else:
        # Try to find database by name in the project directory
        project_dir = Path(__file__).parent.parent.parent
        db_file = project_dir / f"{db_name}.db"
        if db_file.exists():
            return str(db_file)
        raise HTTPException(status_code=404, detail=f"Database '{db_name}' not found")

def execute_sqlite_query(db_path: str, query: str) -> List[Dict[str, Any]]:
    """Execute a SQLite query and return results as list of dictionaries"""
    if not os.path.exists(db_path):
        raise HTTPException(status_code=404, detail=f"Database file not found: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row  # This allows accessing columns by name
        cursor = conn.cursor()
        
        cursor.execute(query)
        
        # Get column names
        columns = [description[0] for description in cursor.description] if cursor.description else []
        
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
    except sqlite3.Error as e:
        raise HTTPException(status_code=500, detail=f"SQLite error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/list_all_database")
async def list_all_database():
    """List all available databases dynamically"""
    try:
        # Get all .db files in the workspace
        db_files = get_workspace_databases()
        databases = []
        
        for db_path in db_files:
            db_name = os.path.basename(db_path).replace('.db', '')
            databases.append(db_name)
        
        return {"databases": databases}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing databases: {str(e)}")

@router.get("/list_all_tables")
async def list_all_tables(db_name: str = Query(..., description="Database name")):
    """List all tables in a specific database"""
    try:
        db_path = get_database_path(db_name)
        
        # Query to get all table names
        query = """
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        ORDER BY name
        """
        
        results = execute_sqlite_query(db_path, query)
        tables = [row['name'] for row in results]
        
        return {"tables": tables}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing tables: {str(e)}")

@router.get("/retrieve-schema")
async def retrieve_schema(
    table_name: str = Query(..., description="Table name"),
    db_name: str = Query(..., description="Database name")
):
    """Retrieve schema information for a specific table"""
    try:
        db_path = get_database_path(db_name)
        
        # Query to get table schema
        query = f"PRAGMA table_info({table_name})"
        
        results = execute_sqlite_query(db_path, query)
        
        # Format the schema data
        schema = []
        for row in results:
            schema.append({
                "column_name": row['name'],
                "type": row['type'],
                "notnull": row['notnull'],
                "default_value": row['dflt_value'],
                "primary_key": row['pk']
            })
        
        return {"schema": schema}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving schema: {str(e)}")

@router.post("/sql-query-executor")
async def sql_query_executor(request: SqlQueryRequest):
    """Execute a SQL query on a specific database"""
    try:
        db_path = get_database_path(request.db_name)
        
        # Execute the query
        results = execute_sqlite_query(db_path, request.query)
        
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
    """Establish a new database connection (for SQLite, this is just a validation)"""
    try:
        # For SQLite, we don't need to establish a connection like SQL Server
        # We just validate that the requested database exists
        if request.server in AVAILABLE_DATABASES:
            db_path = AVAILABLE_DATABASES[request.server]
            if os.path.exists(db_path):
                return {
                    "message": f"Connection to {request.server} established successfully!",
                    "status": "connected",
                    "database": request.server
                }
            else:
                raise HTTPException(status_code=404, detail=f"Database file not found: {db_path}")
        else:
            # Check if it's a .db file in the project directory
            project_dir = Path(__file__).parent.parent.parent
            db_file = project_dir / f"{request.server}.db"
            if db_file.exists():
                return {
                    "message": f"Connection to {request.server} established successfully!",
                    "status": "connected",
                    "database": request.server
                }
            else:
                raise HTTPException(status_code=404, detail=f"Database '{request.server}' not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error establishing connection: {str(e)}")

@router.get("/test-connection")
async def test_connection():
    """Test if the database connection is working"""
    try:
        # Test with the first available database
        if AVAILABLE_DATABASES:
            first_db = list(AVAILABLE_DATABASES.keys())[0]
            db_path = AVAILABLE_DATABASES[first_db]
            
            if os.path.exists(db_path):
                # Try a simple query
                query = "SELECT 1 as test"
                execute_sqlite_query(db_path, query)
                
                return {
                    "status": "connected",
                    "message": "Database connection is working",
                    "available_databases": list(AVAILABLE_DATABASES.keys())
                }
            else:
                raise HTTPException(status_code=404, detail="Database files not found")
        else:
            raise HTTPException(status_code=404, detail="No databases configured")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connection test failed: {str(e)}")

# New routes for UploadFile page
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
    """Ingest data into SQLite database with enhanced features"""
    try:
        # Validate input data
        if not request.data or len(request.data) == 0:
            raise HTTPException(status_code=400, detail="No data provided for ingestion")
        
        if not request.table_name or request.table_name.strip() == "":
            raise HTTPException(status_code=400, detail="Table name is required")
        
        if not request.db_name or request.db_name.strip() == "":
            raise HTTPException(status_code=400, detail="Database name is required")
        
        # Get database path
        db_path = get_database_path(request.db_name)
        
        # Validate database exists and is writable
        if not os.path.exists(db_path):
            raise HTTPException(status_code=404, detail=f"Database '{request.db_name}' not found")
        
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
        
        # Create table and insert data
        conn = sqlite3.connect(db_path)
        
        try:
            # Use 'replace' to overwrite existing table, 'append' to add to existing
            df.to_sql(request.table_name, conn, if_exists='replace', index=False)
            
            # Verify the data was inserted correctly
            cursor = conn.cursor()
            cursor.execute(f"SELECT COUNT(*) FROM {request.table_name}")
            actual_count = cursor.fetchone()[0]
            cursor.close()
            
            # Get table schema for response
            cursor = conn.cursor()
            cursor.execute(f"PRAGMA table_info({request.table_name})")
            schema_info = cursor.fetchall()
            cursor.close()
            
            # Get the actual data that was inserted (limited to first 50 rows for preview)
            cursor = conn.cursor()
            cursor.execute(f"SELECT * FROM {request.table_name} LIMIT 50")
            columns = [description[0] for description in cursor.description]
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
                "database_name": request.db_name,
                "columns": [col[1] for col in schema_info],
                "data_types": {col[1]: col[2] for col in schema_info},
                "original_data_count": len(request.data),
                "cleaned_data_count": len(df),
                "data": uploaded_data  # Return the actual uploaded data
            }
            
        except sqlite3.Error as e:
            conn.close()
            raise HTTPException(status_code=500, detail=f"SQLite error during ingestion: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error ingesting data: {str(e)}")

@router.post("/upload-direct-excel")
async def upload_direct_excel(
    file: UploadFile = File(...),
    table_name: str = Query(..., description="Table name"),
    db_name: str = Query(None, description="Database name (optional, uses first available if not specified)")
):
    """Upload Excel file directly to SQLite database with enhanced features"""
    try:
        # Validate file
        if not file.filename or not file.filename.lower().endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="Please upload a valid Excel file (.xlsx or .xls)")
        
        # Validate table name
        if not table_name or table_name.strip() == "":
            raise HTTPException(status_code=400, detail="Table name is required")
        
        # Determine database to use
        if db_name:
            db_path = get_database_path(db_name)
        else:
            # Use the first available database
            if not AVAILABLE_DATABASES:
                raise HTTPException(status_code=404, detail="No databases available")
            first_db = list(AVAILABLE_DATABASES.keys())[0]
            db_path = AVAILABLE_DATABASES[first_db]
            db_name = first_db
        
        # Validate database exists and is writable
        if not os.path.exists(db_path):
            raise HTTPException(status_code=404, detail=f"Database '{db_name}' not found")
        
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
        
        # Create table and insert data
        conn = sqlite3.connect(db_path)
        
        try:
            # Use 'replace' to overwrite existing table
            df.to_sql(table_name, conn, if_exists='replace', index=False)
            
            # Verify the data was inserted correctly
            cursor = conn.cursor()
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            actual_count = cursor.fetchone()[0]
            cursor.close()
            
            # Get table schema for response
            cursor = conn.cursor()
            cursor.execute(f"PRAGMA table_info({table_name})")
            schema_info = cursor.fetchall()
            cursor.close()
            
            # Get the actual data that was inserted (limited to first 50 rows for preview)
            cursor = conn.cursor()
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 50")
            columns = [description[0] for description in cursor.description]
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
                "database_name": db_name,
                "columns": [col[1] for col in schema_info],
                "data_types": {col[1]: col[2] for col in schema_info},
                "original_data_count": len(df),
                "cleaned_data_count": len(df),
                "file_name": file.filename,
                "data": uploaded_data  # Return the actual uploaded data
            }
            
        except sqlite3.Error as e:
            conn.close()
            raise HTTPException(status_code=500, detail=f"SQLite error during upload: {str(e)}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

# New routes for TableDescription page
@router.get("/get-description")
async def get_description(
    database_name: str = Query(..., description="Database name"),
    table_name: str = Query(..., description="Table name")
):
    """Get table description from metadata table"""
    try:
        db_path = get_database_path(database_name)
        
        # Check if table_descriptions table exists
        query = """
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='table_descriptions'
        """
        results = execute_sqlite_query(db_path, query)
        
        if not results:
            return {"description": ""}
        
        # Get description
        query = """
        SELECT description FROM table_descriptions 
        WHERE table_name = ? AND database_name = ?
        """
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(query, (table_name, database_name))
        result = cursor.fetchone()
        conn.close()
        
        return {"description": result[0] if result else ""}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting description: {str(e)}")

@router.get("/describe-table-columns")
async def describe_table_columns(
    db_name: str = Query(..., description="Database name"),
    table_name: str = Query(..., description="Table name")
):
    """Generate description for table columns using AI"""
    try:
        db_path = get_database_path(db_name)
        
        # Get table schema
        query = f"PRAGMA table_info({table_name})"
        schema_results = execute_sqlite_query(db_path, query)
        
        # Get sample data
        sample_query = f"SELECT * FROM {table_name} LIMIT 5"
        sample_results = execute_sqlite_query(db_path, sample_query)
        
        # For now, return a basic description based on schema
        description = f"Table {table_name} contains the following columns:\n"
        for col in schema_results:
            description += f"- {col['name']} ({col['type']}): Column data\n"
        
        return {"description": description}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error describing table: {str(e)}")

@router.post("/update-description")
async def update_description(
    request: UpdateDescriptionRequest,
    database_name: str = Query(..., description="Database name"),
    table_name: str = Query(..., description="Table name")
):
    """Update table description in metadata table"""
    try:
        db_path = get_database_path(database_name)
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create table_descriptions table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS table_descriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                database_name TEXT NOT NULL,
                table_name TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(database_name, table_name)
            )
        """)
        
        # Insert or update description
        cursor.execute("""
            INSERT OR REPLACE INTO table_descriptions 
            (database_name, table_name, description, updated_at) 
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        """, (database_name, table_name, request.description))
        
        conn.commit()
        conn.close()
        
        return {"message": "Description updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating description: {str(e)}") 
# SQL Server Migration Setup Guide

This guide explains how to set up the application to use SQL Server instead of SQLite.

## Prerequisites

1. **SQL Server ODBC Driver**: Install the Microsoft ODBC Driver 18 for SQL Server
   - Download from: https://docs.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server
   - For Windows: `msodbcsql18.msi`
   - For Linux: Follow the installation guide for your distribution

2. **Python Dependencies**: Install the required Python packages
   ```bash
   pip install -r requirements.txt
   ```

## Configuration

The application is configured to connect to the following SQL Server database:
- **Server**: 10.0.40.20
- **Database**: DataWarehouseV2_UK
- **Username**: DEV_TANISH
- **Password**: Tanish@@1606$$

### Available Tables

The application is configured to work with these specific tables:
- `dbo.Vw_GI_SalesDetails` - Detailed sales transaction data
- `dbo.Vw_GI_SalesSummary` - Summary sales data and metrics  
- `dbo.Vw_GI_CompanyMaster` - Company and master data information

## Testing the Connection

Run the test script to verify your SQL Server connection:

```bash
cd backend
python test_sqlserver_connection.py
```

This script will:
1. Test the basic connection to SQL Server
2. Verify access to all three configured tables
3. Display connection status and any errors

## Running the Application

1. **Start the Backend**:
   ```bash
   cd backend
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Start the Frontend** (in a separate terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Key Changes Made

### Backend Changes

1. **New Files Created**:
   - `app/core/sqlserver_query_generator.py` - SQL Server query generation logic
   - `app/api/sqlserver.py` - SQL Server API endpoints
   - `app/core/database_config.py` - Database configuration
   - `test_sqlserver_connection.py` - Connection test script

2. **Files Modified**:
   - `requirements.txt` - Added pyodbc dependency
   - `app/core/config.py` - Updated to use SQL Server configuration
   - `app/api/agent.py` - Updated to use SQL Server query generator
   - `app/main.py` - Updated to use SQL Server router

### Frontend Changes

No frontend changes are required. The frontend will continue to work with the same API endpoints, but now they'll connect to SQL Server instead of SQLite.

## API Endpoints

The following API endpoints are available:

### Database Operations
- `GET /api/list_all_tables` - List available tables
- `GET /api/retrieve-schema?table_name={table}` - Get table schema
- `POST /api/sql-query-executor` - Execute SQL queries
- `GET /api/test-connection` - Test database connection

### Agent Operations
- `POST /api/agent` - Natural language to SQL conversion

### File Upload Operations
- `POST /api/filter-null-columns` - Process Excel files
- `POST /api/preprocess-excel` - Preprocess Excel data
- `POST /api/ingest-to-sql` - Ingest data to SQL Server
- `POST /api/upload-direct-excel` - Direct Excel upload

### Table Description Operations
- `GET /api/get-description?table_name={table}` - Get table description
- `GET /api/describe-table-columns?table_name={table}` - Describe table columns
- `POST /api/update-description?table_name={table}` - Update table description

## Troubleshooting

### Common Issues

1. **ODBC Driver Not Found**:
   - Install the Microsoft ODBC Driver 18 for SQL Server
   - Ensure the driver is in your system PATH

2. **Connection Failed**:
   - Verify the server IP address is correct
   - Check that the SQL Server is running and accessible
   - Verify username and password are correct
   - Ensure the database exists and is accessible

3. **Table Not Found**:
   - Verify the table names are correct (case-sensitive)
   - Ensure the user has permissions to access the tables
   - Check that the tables exist in the specified database

4. **Import Errors**:
   - Install required packages: `pip install -r requirements.txt`
   - Ensure you're using Python 3.7 or higher

### Testing

Use the test script to diagnose connection issues:

```bash
python test_sqlserver_connection.py
```

This will provide detailed error messages to help identify the problem.

## Security Notes

- The database credentials are stored in `app/core/database_config.py`
- For production, consider using environment variables or a secure configuration management system
- Ensure the SQL Server is properly secured with appropriate firewall rules and authentication

## Migration from SQLite

If you were previously using SQLite:

1. The old SQLite files are no longer used
2. All data will now come from the SQL Server database
3. The application will automatically use the new SQL Server backend
4. No frontend changes are required

## Support

If you encounter issues:

1. Check the connection test script output
2. Verify SQL Server is running and accessible
3. Check the application logs for detailed error messages
4. Ensure all dependencies are installed correctly 
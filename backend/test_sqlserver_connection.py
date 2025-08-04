#!/usr/bin/env python3
"""
Test script to verify SQL Server connection
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

try:
    import pyodbc
    from app.core.config import SERVER, DATABASE, USERNAME, PASSWORD
    
    print("Testing SQL Server connection...")
    print(f"Server: {SERVER}")
    print(f"Database: {DATABASE}")
    print(f"Username: {USERNAME}")
    
    # Create connection string
    conn_str = (
        f"DRIVER={{ODBC Driver 18 for SQL Server}};"
        f"SERVER={SERVER};DATABASE={DATABASE};"
        f"UID={USERNAME};PWD={PASSWORD};TrustServerCertificate=yes;"
    )
    
    print("Attempting to connect...")
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    # Test basic connection
    cursor.execute("SELECT 1 as test")
    result = cursor.fetchone()
    print(f"Connection test result: {result}")
    
    # Test querying the available tables
    tables = ['Vw_SI_SalesDetails', 'Vw_SI_SalesSummary', 'View_DiscountDetails']
    
    for table in tables:
        try:
            cursor.execute(f"SELECT TOP 1 * FROM {table}")
            result = cursor.fetchone()
            print(f"✓ Successfully queried {table}: {len(result)} columns")
        except Exception as e:
            print(f"✗ Error querying {table}: {e}")
    
    cursor.close()
    conn.close()
    print("✓ SQL Server connection test completed successfully!")
    
except ImportError as e:
    print(f"Import error: {e}")
    print("Please install required packages: pip install pyodbc")
except Exception as e:
    print(f"Connection error: {e}")
    print("Please check your SQL Server connection details and ensure the server is accessible.") 
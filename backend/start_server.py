#!/usr/bin/env python3
"""
Startup script for the SQL Server backend
"""

import uvicorn
import sys
import os

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

if __name__ == "__main__":
    print("Starting Paperchase ERP Backend with SQL Server...")
    print("Server: 10.0.40.20")
    print("Database: DataWarehouseV2_UK")
    print("Available Tables: Vw_SI_SalesDetails, Vw_SI_SalesSummary, View_DiscountDetails")
    print("\nStarting server on http://localhost:8000")
    print("Press Ctrl+C to stop the server")
    
    try:
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"Error starting server: {e}")
        print("Please check your configuration and try again") 
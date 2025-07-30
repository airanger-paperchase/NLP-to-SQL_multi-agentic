# NLP-to-SQL Multi-Agentic FastAPI Application

A FastAPI application that provides an agent-based SQL query generation system for Polycab wire manufacturing data.

## Project Structure

```
NLP-to-SQL_multi-agentic/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── api/
│   │   ├── __init__.py
│   │   └── agent.py         # Agent API routes
│   └── core/
│       ├── __init__.py
│       ├── config.py        # Configuration and environment variables
│       ├── backend.py       # Cosmos DB integration
│       └── query_generator.py # Main agent logic
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Create a `.env` file with your configuration:
   ```env
   SERVER=your_sql_server
   DATABASE=your_database
   USERNAME=your_username
   PASSWORD=your_password
   AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
   AZURE_OPENAI_KEY=your_azure_openai_key
   ```

3. Run the FastAPI application:
   ```bash
   uvicorn app.main:app --reload
   ```

## API Endpoints

- `GET /` - Health check endpoint
- `POST /agent/run` - Run the SQL agent to generate and execute queries

## Adding New Routes

To add new API routes:

1. Create a new file in `app/api/` (e.g., `app/api/new_feature.py`)
2. Define your router with endpoints
3. Import and include the router in `app/main.py`

Example:
```python
# app/api/new_feature.py
from fastapi import APIRouter

router = APIRouter()

@router.get("/new-endpoint")
def new_endpoint():
    return {"message": "New endpoint"}

# app/main.py
from app.api.new_feature import router as new_feature_router
app.include_router(new_feature_router, prefix="/new-feature")
```

## Development

The application uses:
- **FastAPI** for the web framework
- **Semantic Kernel** for AI agent functionality
- **PyODBC** for SQL Server connections
- **Azure Cosmos DB** for data storage (placeholder implementation)
- **Python-dotenv** for environment variable management
# Multi-Agent Routing Flow & Backend Architecture

## 🏗️ **Complete Backend Architecture**

### **Main Application Files:**

```
backend/
├── app/
│   ├── main.py                    # 🚀 MAIN ENTRY POINT - FastAPI app
│   ├── api/
│   │   ├── agent.py              # 📡 Original single-agent endpoint (/api/agent)
│   │   ├── sqlserver.py          # 📡 SQL Server utilities
│   │   └── multi_agent.py        # 📡 NEW: Multi-agent endpoint (/api/multi-agent)
│   └── core/
│       ├── config.py             # ⚙️ Configuration settings
│       ├── sqlserver_query_generator.py  # 🔧 Original single-agent system
│       └── multi_agent_orchestrator.py   # 🔧 NEW: Multi-agent orchestration
├── test_multi_agent.py           # 🧪 Test script
├── start_server.py               # 🚀 Server startup script
└── requirements.txt              # 📦 Dependencies
```

## 🔄 **Complete Request Flow**

### **Step 1: Frontend Request**
```javascript
// Frontend sends request to:
POST http://localhost:8000/api/multi-agent
{
    "question": "Show me total sales by month"
}
```

### **Step 2: FastAPI Routing**
```python
# main.py routes to:
app.include_router(multi_agent_router, prefix="/api")
# This creates: /api/multi-agent endpoint
```

### **Step 3: Multi-Agent API Handler**
```python
# api/multi_agent.py handles the request:
@router.post("/multi-agent")
async def run_multi_agent(request: QuestionRequest):
    result = await run_multi_agent_system(request.question)
    # Returns structured response
```

### **Step 4: Multi-Agent Orchestrator**
```python
# core/multi_agent_orchestrator.py processes:
async def process_question(self, user_question: str):
    # Step 1: Router Agent decides which table
    routing_result = await self.router_agent.route_question(user_question)
    
    # Step 2: Get table context (schema + sample data)
    table_context = self.table_manager.get_table_context(selected_table)
    
    # Step 3: Table Specialist Agent generates SQL
    table_agent = TableSpecialistAgent(selected_table, table_context)
    
    # Step 4: Execute SQL query
    query_result = await self.query_executor.execute_query(sql_query)
    
    # Step 5: Generate description
    description = await self.generate_data_description(...)
```

## 🤖 **Agent Routing Process**

### **Router Agent Decision Making:**

```python
# Router Agent analyzes the question:
"Show me total sales by month"

# Available tables:
- Vw_SI_SalesDetails: Detailed sales transaction data
- Vw_SI_SalesSummary: Summary sales data and metrics  
- View_DiscountDetails: Company and master data

# Router Agent decides:
{
    "selected_table": "Vw_SI_SalesSummary",
    "confidence": "high",
    "reasoning": "Question asks for totals and summaries"
}
```

### **Table Specialist Agent Creation:**

```python
# For each table, a specialized agent is created with:
class TableSpecialistAgent:
    def __init__(self, table_name: str, table_context: dict):
        # Gets:
        # - Complete table schema
        # - 5 sample records
        # - Business context
        # - Table-specific prompt
```

## 📡 **Available API Endpoints**

### **Current Backend Routes:**

| Endpoint | Method | Purpose | File |
|----------|--------|---------|------|
| `/` | GET | Health check | `main.py` |
| `/api/test` | GET | API test | `main.py` |
| `/api/agent` | POST | **Original single-agent system** | `api/agent.py` |
| `/api/sqlserver/*` | Various | SQL Server utilities | `api/sqlserver.py` |
| `/api/multi-agent` | POST | **NEW: Multi-agent system** | `api/multi_agent.py` |
| `/api/multi-agent/status` | GET | Multi-agent status | `api/multi_agent.py` |

## 🚀 **How to Run the Complete Application**

### **1. Start the Backend Server:**
```bash
cd backend
python start_server.py
# OR
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### **2. Available Endpoints:**
- **Original System**: `POST /api/agent` (single-agent)
- **New System**: `POST /api/multi-agent` (multi-agent orchestration)

### **3. Test the Multi-Agent System:**
```bash
cd backend
python test_multi_agent.py
```

## 🔍 **Detailed Routing Example**

### **User Question:** "Show me total sales by month"

### **Step 1: Router Agent Analysis**
```python
# Router Agent receives: "Show me total sales by month"
# Analyzes keywords: "total", "sales", "month"
# Checks table descriptions:
# - SalesDetails: "Detailed sales transaction data" ❌
# - SalesSummary: "Summary sales data and metrics" ✅
# - CompanyMaster: "Company and master data" ❌

# Returns:
{
    "selected_table": "Vw_SI_SalesSummary",
    "confidence": "high", 
    "reasoning": "Question asks for totals and summaries"
}
```

### **Step 2: Table Context Retrieval**
```python
# TableDataManager gets:
# - Schema: All columns from Vw_SI_SalesSummary
# - Sample Data: 5 sample records
# - Business Context: "Contains aggregated sales information..."

table_context = {
    'table_name': 'Vw_SI_SalesSummary',
    'schema': [...],  # All columns
    'sample_data': [...],  # 5 sample records
    'business_context': 'Contains aggregated sales information...'
}
```

### **Step 3: Table Specialist Agent**
```python
# Creates specialized agent with:
# - Table-specific prompt
# - Actual schema
# - Sample data
# - Business context

# Generates SQL:
"SELECT TOP 20 Month, SUM(TotalAmount) as TotalSales 
 FROM dbo.Vw_SI_SalesSummary 
 GROUP BY Month 
 ORDER BY Month"
```

### **Step 4: Query Execution & Description**
```python
# Executes SQL → Gets results
# Description Agent analyzes → Provides business insights
# Returns complete response
```

## 🎯 **Key Benefits of Multi-Agent System**

### **vs Single Agent System:**
1. **Intelligent Routing**: Automatically selects the right table
2. **Specialized Context**: Each agent has deep knowledge of its table
3. **Better SQL**: More accurate queries with table-specific prompts
4. **Faster Processing**: No need to process all table schemas
5. **Transparency**: Shows routing decisions and confidence levels

## 🔧 **Configuration Files**

### **Environment Variables (.env):**
```env
AZURE_OPENAI_ENDPOINT=your_endpoint
AZURE_OPENAI_KEY=your_key
API_VERSION_GA=2024-02-15-preview
SERVER=your_server
DATABASE=your_database
USERNAME=your_username
PASSWORD=your_password
```

### **Table Configuration:**
```python
# In multi_agent_orchestrator.py
self.table_configs = {
    'Vw_SI_SalesDetails': {
        'description': 'Detailed sales transaction data...',
        'business_context': 'Contains granular sales data...'
    },
    'Vw_SI_SalesSummary': {
        'description': 'Summary sales data and metrics',
        'business_context': 'Contains aggregated sales information...'
    },
    'View_DiscountDetails': {
        'description': 'Company and master data information',
        'business_context': 'Contains company details...'
    }
}
```

## 🧪 **Testing the System**

### **Test Different Question Types:**
```python
test_questions = [
    "Show me total sales by month",           # → SalesSummary
    "What items were sold in transaction 123", # → SalesDetails  
    "Give me company information",             # → CompanyMaster
    "Show me detailed sales transactions",     # → SalesDetails
    "What are the top selling products?",      # → SalesDetails
    "Show me sales summary data"               # → SalesSummary
]
```

## 🎉 **Summary**

The multi-agent system provides:
- **Intelligent routing** based on question content
- **Specialized agents** for each table
- **Dynamic context** with real schema and sample data
- **Better accuracy** through table-specific knowledge
- **Transparent decisions** with confidence scoring

**Main Entry Point**: `backend/app/main.py` runs the complete FastAPI application with all routes including the new multi-agent system. 
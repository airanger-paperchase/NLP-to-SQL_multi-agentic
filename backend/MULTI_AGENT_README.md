# Multi-Agent Orchestration System for NLP-to-SQL

## Overview

This is a sophisticated multi-agent orchestration system built with Semantic Kernel that intelligently routes user questions to specialized table agents for optimal SQL query generation and data analysis.

## Architecture

### 🤖 Agent Hierarchy

```
User Question
    ↓
Router Agent (GPT-4o)
    ↓
Table Specialist Agent (GPT-4o)
    ↓
Query Executor Plugin
    ↓
Description Agent (o3-mini)
    ↓
Final Response
```

### 🏗️ System Components

1. **Router Agent** - Analyzes user questions and determines which table to use
2. **Table Specialist Agents** - Specialized agents for each table with their own schema and context
3. **Query Executor Plugin** - Executes SQL queries against SQL Server
4. **Description Agent** - Generates business-friendly descriptions of results

## 🎯 Key Features

### Intelligent Routing
- **Smart Table Selection**: Router agent analyzes questions and selects the most appropriate table
- **Confidence Scoring**: Each routing decision includes confidence level and reasoning
- **Fallback Handling**: Graceful fallback to default table if routing fails

### Specialized Table Agents
- **Per-Table Context**: Each table has its own agent with specific schema and business context
- **Sample Data Integration**: Agents have access to sample data for better understanding
- **Optimized Prompts**: Tailored prompts for each table's specific use case

### Dynamic Schema Management
- **Real-time Schema**: Fetches actual database schema dynamically
- **Sample Data**: Retrieves sample data for context and reference
- **Business Context**: Includes business descriptions for each table

## 📊 Available Tables

| Table | Description | Business Context |
|-------|-------------|------------------|
| `Vw_SI_SalesDetails` | Detailed sales transaction data | Individual line items, quantities, prices |
| `Vw_SI_SalesSummary` | Summary sales data and metrics | Aggregated totals, business metrics |
| `View_DiscountDetails` | Company and master data | Company details, reference information |

## 🚀 Usage

### API Endpoints

#### Process Question
```http
POST /api/multi-agent
Content-Type: application/json

{
    "question": "Show me total sales by month"
}
```

#### Check System Status
```http
GET /api/multi-agent/status
```

### Example Response

```json
{
    "success": true,
    "routing_decision": {
        "selected_table": "Vw_SI_SalesSummary",
        "confidence": "high",
        "reasoning": "Question asks for totals and summaries"
    },
    "selected_table": "Vw_SI_SalesSummary",
    "sql_query": "SELECT TOP 20 Month, SUM(TotalAmount) as TotalSales FROM dbo.Vw_SI_SalesSummary GROUP BY Month ORDER BY Month",
    "data": [
        {
            "Month": "January",
            "TotalSales": "125000.00"
        }
    ],
    "description": "The data shows total sales by month, with January generating £125,000 in revenue.",
    "error_messages": [],
    "agent_system": "multi-agent-orchestration"
}
```

## 🧪 Testing

### Run Test Script
```bash
cd backend
python test_multi_agent.py
```

### Test Questions
The system is tested with various question types:
- "Show me total sales by month" → Routes to SalesSummary
- "What items were sold in the last transaction?" → Routes to SalesDetails
- "Give me company information" → Routes to CompanyMaster

## 🔧 Configuration

### Environment Variables
Ensure these are set in your `.env` file:
```env
AZURE_OPENAI_ENDPOINT=your_endpoint
AZURE_OPENAI_KEY=your_key
API_VERSION_GA=2024-02-15-preview
SERVER=your_server
DATABASE=your_database
USERNAME=your_username
PASSWORD=your_password
```

### Model Configuration
- **Router Agent**: GPT-4o (for intelligent routing)
- **Table Specialist Agents**: GPT-4o (for SQL generation)
- **Description Agent**: o3-mini (for cost-effective descriptions)

## 🏛️ System Architecture Details

### Router Agent
```python
class RouterAgent:
    - Analyzes user questions
    - Determines appropriate table
    - Returns JSON with routing decision
    - Includes confidence and reasoning
```

### Table Specialist Agent
```python
class TableSpecialistAgent:
    - Has complete table context
    - Generates table-specific SQL
    - Uses actual schema and sample data
    - Optimized for specific table use cases
```

### Multi-Agent Orchestrator
```python
class MultiAgentOrchestrator:
    - Coordinates all agents
    - Manages data flow
    - Handles error scenarios
    - Returns structured responses
```

## 🔄 Process Flow

1. **Question Analysis**: Router agent analyzes the user question
2. **Table Selection**: Determines which table is most appropriate
3. **Context Retrieval**: Gets schema and sample data for selected table
4. **SQL Generation**: Table specialist generates optimized SQL
5. **Query Execution**: Executes SQL against SQL Server
6. **Data Analysis**: Description agent analyzes results
7. **Response Formatting**: Returns structured response with all details

## 🎯 Benefits

### Compared to Single Agent System
- **Better Accuracy**: Specialized agents for each table
- **Faster Processing**: No need to process all table schemas
- **Improved Context**: Each agent has deep knowledge of its table
- **Scalable**: Easy to add new tables and agents

### Business Value
- **Intelligent Routing**: Automatically selects the right data source
- **Better SQL**: More accurate and optimized queries
- **Clear Explanations**: Business-friendly descriptions
- **Confidence Scoring**: Transparency in decision-making

## 🔮 Future Enhancements

### Planned Features
- **Multi-Table Queries**: Support for queries spanning multiple tables
- **Dynamic Table Discovery**: Automatically discover new tables
- **Query Optimization**: Advanced SQL optimization
- **Caching**: Cache frequently used schemas and data
- **Analytics Dashboard**: Monitor agent performance and routing accuracy

### Extensibility
- **Custom Agents**: Easy to add new specialized agents
- **Plugin System**: Extensible plugin architecture
- **Configuration Management**: Dynamic configuration updates
- **Monitoring**: Comprehensive logging and monitoring

## 🛠️ Development

### Adding New Tables
1. Update `TableDataManager.table_configs`
2. Add table description and business context
3. Test routing with sample questions
4. Verify SQL generation accuracy

### Customizing Agents
1. Modify agent prompts in respective classes
2. Adjust routing logic in `RouterAgent`
3. Update business context descriptions
4. Test with various question types

## 📈 Performance Considerations

### Optimization Strategies
- **Schema Caching**: Cache table schemas to reduce database calls
- **Sample Data Limits**: Limit sample data size for performance
- **Async Processing**: All operations are async for better performance
- **Error Handling**: Graceful fallbacks for better user experience

### Monitoring
- **Routing Accuracy**: Track routing decision accuracy
- **Query Performance**: Monitor SQL execution times
- **Agent Response Times**: Track individual agent performance
- **Error Rates**: Monitor and analyze error patterns

## 🔒 Security

### Data Protection
- **Connection Security**: Secure SQL Server connections
- **Query Sanitization**: Clean and validate SQL queries
- **Access Control**: Proper database access controls
- **Error Handling**: No sensitive data in error messages

## 📚 API Documentation

### Complete API Reference
- **POST /api/multi-agent**: Process questions through multi-agent system
- **GET /api/multi-agent/status**: Get system status and available tables

### Error Handling
- **400 Bad Request**: Invalid question or routing error
- **500 Internal Server Error**: System or database errors
- **Graceful Degradation**: Fallback to default table on errors

## 🎉 Conclusion

This multi-agent orchestration system provides a sophisticated, scalable, and intelligent approach to NLP-to-SQL conversion. By leveraging specialized agents for each table, the system achieves higher accuracy, better performance, and more meaningful business insights. 
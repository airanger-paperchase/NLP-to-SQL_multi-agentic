from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.multi_agent_orchestrator import run_multi_agent_system
from fastapi.responses import JSONResponse
import asyncio

router = APIRouter()

class QuestionRequest(BaseModel):
    question: str
    company_code: str = None
    company_name: str = None

@router.post("/multi-agent")
async def run_multi_agent(request: QuestionRequest):
    """
    Process a question using the multi-agent orchestration system.
    
    The system uses:
    1. Router Agent - Analyzes the question and determines which table to use
    2. Table Specialist Agent - Generates SQL for the specific table
    3. Query Executor - Executes the SQL query
    4. Description Agent - Generates business-friendly description of results
    """
    try:
        # Process the question through the multi-agent system
        print(f"🤖 Multi-Agent: Processing question: {request.question}")
        print(f"🤖 Multi-Agent: Company Code: {request.company_code}")
        print(f"🤖 Multi-Agent: Country: {request.company_name}")
        result = await run_multi_agent_system(request.question, request.company_code, request.company_name)
        selected_table = result.get("selected_table", "")
        sql_query = result.get("sql_query", "")
        print(f"Selected Table: {selected_table}")
        print(f"SQL Query: {sql_query}")
        
        if "error" in result:
            return JSONResponse(
                status_code=400,
                content={
                    "error": result["error"],
                    "success": False
                }
            )
        
        # Extract components from the result
        routing_decision = result.get("routing_decision", {})
        selected_table = result.get("selected_table", "")
        sql_query = result.get("sql_query", "")
        query_result = result.get("query_result", "")
        description = result.get("description", "")
        
        # Process the query result to convert to structured data
        processed_data = []
        error_messages = []
        
        if isinstance(query_result, str):
            if any(error_msg in query_result.lower() for error_msg in ['error', 'no results found', 'not found', 'empty']):
                error_messages.append(query_result)
            elif '\t' in query_result:
                # Handle tab-separated multi-column data
                lines = query_result.strip().split('\n')
                if len(lines) > 1:
                    headers = lines[0].split('\t')
                    rows = []
                    for line in lines[1:]:
                        values = line.split('\t')
                        row = {}
                        for i, header in enumerate(headers):
                            row[header.strip()] = values[i] if i < len(values) else ''
                        rows.append(row)
                    processed_data.extend(rows)
            elif '\n' in query_result and '\t' not in query_result:
                # Handle single-column results with newline-separated header and value
                lines = query_result.strip().split('\n')
                if len(lines) == 2:  # Header and value
                    header = lines[0].strip()
                    value = lines[1].strip()
                    if header and value:
                        row = {header: value}
                        processed_data.append(row)
                elif len(lines) > 2:
                    # Handle multiple lines without tabs
                    header = "Result"
                    value = query_result.strip()
                    row = {header: value}
                    processed_data.append(row)
                else:
                    # Single line result
                    processed_data.append(query_result)
            else:
                # Handle single string results
                row = {"Result": query_result}
                processed_data.append(row)
        else:
            # Handle non-string results
            processed_data.append(query_result)
        
        # Prepare the response
        response_data = {
            "success": True,
            "routing_decision": {
                "selected_table": routing_decision.get("selected_table", ""),
                "confidence": routing_decision.get("confidence", ""),
                "reasoning": routing_decision.get("reasoning", "")
            },
            "selected_table": selected_table,
            "sql_query": sql_query,
            "data": processed_data,
            "answer": description,  # Changed from "description" to "answer" to match frontend
            "description": description,  # Keep both for compatibility
            "error_messages": error_messages,
            "agent_system": "multi-agent-orchestration",
            "company_info": {
                "company_code": request.company_code,
                "country": request.company_name
            }
        }
        
        print(f"🤖 Multi-Agent: Final response: {response_data}")
        return JSONResponse(content=response_data)
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "error": f"Internal server error: {str(e)}",
                "success": False
            }
        )

@router.get("/multi-agent/status")
async def get_multi_agent_status():
    """Get the status of the multi-agent system"""
    return JSONResponse(content={
        "status": "operational",
        "system": "multi-agent-orchestration",
        "agents": [
            "router-agent",
            "table-specialist-agent", 
            "query-executor",
            "description-agent"
        ],
        "available_tables": [
            "Vw_GI_SalesDetails",
            "Vw_GI_SalesSummary", 
            "Vw_GI_CompanyMaster"
        ]
    }) 
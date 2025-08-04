from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.multi_agent_orchestrator import run_multi_agent_system
from fastapi.responses import JSONResponse
import asyncio

router = APIRouter()

class QuestionRequest(BaseModel):
    question: str
    company_code: str = None
    site_code: str = None

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
        print(f"🤖 Multi-Agent: Site Code: {request.site_code}")
        result = await run_multi_agent_system(request.question, request.company_code, request.site_code)
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
        data = result.get("data", [])  # New format: data is already structured
        description = result.get("description", "")
        answer = result.get("answer", "")
        
        # Use the data directly from the result (already structured)
        processed_data = data if isinstance(data, list) else []
        error_messages = result.get("error_messages", [])
        
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
                "site_code": request.site_code
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
            "Vw_SI_SalesDetails",
            "Vw_SI_SalesSummary", 
            "View_DiscountDetails",
            "DayPartMst",
            "PaperchaseCategoryMaster",
            "MenuItemCategoryMst",
            "RevenueCenterMst"
        ]
    }) 
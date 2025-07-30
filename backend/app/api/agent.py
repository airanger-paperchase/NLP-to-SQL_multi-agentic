from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.query_generator import run_agent_and_get_queries_and_results, generate_data_description
from fastapi.responses import JSONResponse
import asyncio

router = APIRouter()

class QuestionRequest(BaseModel):
    question: str

@router.post("/agent")
async def run_agent(request: QuestionRequest):
    try:
        queries_and_results = await run_agent_and_get_queries_and_results(request.question)
        
        # Format the response to match frontend expectations
        if queries_and_results:
            # Extract SQL queries and results
            sql_queries = [item[0] for item in queries_and_results]
            results = [item[1] for item in queries_and_results]
            
            # Check if any results contain cross-database JOIN errors
            has_cross_db_error = any(
                isinstance(result, str) and "Cross-database JOIN detected" in result 
                for result in results
            )
            
            # Process results to convert tab-separated strings to structured data
            processed_data = []
            error_messages = []
            
            for result in results:
                if isinstance(result, str) and "Cross-database JOIN detected" in result:
                    error_messages.append(result)
                elif isinstance(result, str) and '\t' in result:
                    # Handle tab-separated multi-column data
                    lines = result.strip().split('\n')
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
                elif isinstance(result, str) and '\n' in result and '\t' not in result:
                    # Handle single-column results with newline-separated header and value
                    lines = result.strip().split('\n')
                    if len(lines) == 2:  # Header and value
                        header = lines[0].strip()
                        value = lines[1].strip()
                        # Skip if header or value is empty
                        if header and value:
                            row = {header: value}
                            processed_data.append(row)
                    elif len(lines) > 2:
                        # Handle multiple lines without tabs (treat as single column)
                        header = "Result"
                        value = result.strip()
                        row = {header: value}
                        processed_data.append(row)
                    else:
                        # Single line result
                        processed_data.append(result)
                elif isinstance(result, str):
                    # Handle single string results
                    if any(error_msg in result.lower() for error_msg in ['error', 'no results found', 'not found', 'empty']):
                        error_messages.append(result)
                    else:
                        # Treat as single column result
                        row = {"Result": result}
                        processed_data.append(row)
                else:
                    # Handle non-string results
                    processed_data.append(result)
            
            # Generate description using the second agent (o3-mini)
            # Clean up SQL queries for display (remove semicolons and extra formatting)
            cleaned_sql_queries = []
            for sql in sql_queries:
                # Remove trailing semicolon and clean up
                cleaned_sql = sql.rstrip(';').strip()
                if cleaned_sql:
                    cleaned_sql_queries.append(cleaned_sql)
            
            combined_sql = "\n".join(cleaned_sql_queries)
            
            # Handle cross-database scenarios
            if has_cross_db_error:
                # For cross-database scenarios, provide a helpful response
                data_description = (
                    "I detected that your question requires data from multiple databases. "
                    "I've generated separate queries for each database to retrieve the relevant information. "
                    "The data from different databases can be compared and analyzed together. "
                    f"Retrieved {len(processed_data)} records across multiple databases."
                )
            elif processed_data:
                try:
                    print(f"SQL Query: {combined_sql}")
                    print(f"Generating description for {len(processed_data)} records")
                    data_description = await generate_data_description(
                        processed_data, 
                        combined_sql, 
                        request.question
                    )
                    print(f"Generated description: {data_description}")
                    
                    # If description generation fails, use a fallback
                    if data_description.startswith("Error generating description"):
                        data_description = f"Successfully retrieved {len(processed_data)} records from the database. The data shows various sales transactions and business metrics that can be analyzed in the visualization below."
                except Exception as desc_error:
                    print(f"Description generation error: {desc_error}")
                    data_description = f"Successfully retrieved {len(processed_data)} records from the database. The data shows various sales transactions and business metrics that can be analyzed in the visualization below."
            else:
                data_description = "No data was found for your query. Please try a different question."
            
            print(f"Final answer being sent: {data_description}")
            # Create a formatted response
            response_data = {
                "sql_query": combined_sql,
                "data": processed_data,
                "answer": data_description,  # Use the generated description
                "original_answer": f"Generated {len(sql_queries)} SQL queries and executed them successfully. Found {len(processed_data)} results."
            }
        else:
            response_data = {
                "sql_query": "",
                "data": [],
                "answer": "No queries were generated for your question. Please try rephrasing your question.",
                "original_answer": "No queries were generated for your question."
            }
        
        return JSONResponse(content=response_data)
    except Exception as e:
        print(f"Agent error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
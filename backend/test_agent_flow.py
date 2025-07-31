import asyncio
import sys
import os

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from core.multi_agent_orchestrator import run_multi_agent_system

async def test_agent_flow():
    """Test the multi-agent flow with detailed logging"""
    
    print("🧪 TESTING MULTI-AGENT FLOW")
    print("=" * 60)
    
    # Test questions for different tables
    test_questions = [
        "Show me total sales by month",
        "What items were sold in the last transaction",
        "Give me company information"
    ]
    
    for i, question in enumerate(test_questions, 1):
        print(f"\n{'='*60}")
        print(f"🧪 TEST {i}: {question}")
        print(f"{'='*60}")
        
        try:
            result = await run_multi_agent_system(question)
            
            print(f"\n📊 TEST {i} RESULTS:")
            print(f"Selected Table: {result.get('selected_table', 'N/A')}")
            print(f"SQL Query: {result.get('sql_query', 'N/A')}")
            print(f"Description: {result.get('description', 'N/A')[:100]}...")
            
            if 'error' in result:
                print(f"❌ Error: {result['error']}")
            
        except Exception as e:
            print(f"❌ Test {i} failed with error: {e}")
        
        print(f"\n{'='*60}")
        print(f"🧪 TEST {i} COMPLETED")
        print(f"{'='*60}")

if __name__ == "__main__":
    asyncio.run(test_agent_flow()) 
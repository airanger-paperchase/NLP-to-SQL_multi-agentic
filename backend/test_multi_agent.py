import asyncio
import sys
import os

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from core.multi_agent_orchestrator import run_multi_agent_system

async def test_multi_agent_system():
    """Test the multi-agent system with different types of questions"""
    
    test_questions = [
        "Show me total sales by month",
        "What items were sold in the last transaction?",
        "Give me company information",
        "Show me detailed sales transactions",
        "What are the top selling products?",
        "Show me sales summary data"
    ]
    
    print("🧪 Testing Multi-Agent Orchestration System")
    print("=" * 60)
    
    for i, question in enumerate(test_questions, 1):
        print(f"\n📝 Test {i}: {question}")
        print("-" * 40)
        
        try:
            result = await run_multi_agent_system(question)
            
            if "error" in result:
                print(f"❌ Error: {result['error']}")
            else:
                print(f"✅ Routing Decision: {result['routing_decision']}")
                print(f"📊 Selected Table: {result['selected_table']}")
                print(f"🔍 SQL Query: {result['sql_query']}")
                print(f"📈 Query Result: {result['query_result'][:200]}..." if len(result['query_result']) > 200 else f"📈 Query Result: {result['query_result']}")
                print(f"📝 Description: {result['description']}")
                
        except Exception as e:
            print(f"❌ Exception: {str(e)}")
        
        print("-" * 40)

if __name__ == "__main__":
    asyncio.run(test_multi_agent_system()) 
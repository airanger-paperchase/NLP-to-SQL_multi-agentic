import asyncio
import sys
import os

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from core.multi_agent_orchestrator import run_multi_agent_system

async def test_company_integration():
    """Test the company integration with multi-agent system"""
    
    print("🧪 TESTING COMPANY INTEGRATION")
    print("=" * 60)
    
    # Test questions with different company codes and countries
    test_cases = [
        {
            "question": "Show me total sales by month",
            "company_code": "93",
            "country": "UNITED STATES"
        },
        {
            "question": "What items were sold in the last transaction",
            "company_code": "33", 
            "country": "UNITED STATES"
        },
        {
            "question": "Give me company information",
            "company_code": None,
            "country": None
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{'='*60}")
        print(f"🧪 TEST {i}: {test_case['question']}")
        print(f"🧪 COMPANY CODE: {test_case['company_code']}")
        print(f"🧪 COUNTRY: {test_case['country']}")
        print(f"{'='*60}")
        
        try:
            result = await run_multi_agent_system(
                test_case['question'], 
                test_case['company_code'],
                test_case['country']
            )
            
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
    asyncio.run(test_company_integration()) 
import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from core.multi_agent_orchestrator import run_multi_agent_system

async def test_master_tables():
    """Test the master tables and INNER JOIN functionality"""
    
    print("🧪 Testing Master Tables and INNER JOIN Functionality")
    print("=" * 60)
    
    # Test cases for different scenarios
    test_cases = [
        {
            "name": "Get DayPartName only",
            "question": "Show me all DayPartName values",
            "company_code": "C1587",
            "site_code": "L2312"
        },
        {
            "name": "Get CategoryName only", 
            "question": "Show me all PaperchaseCategoryName values",
            "company_code": "C1587",
            "site_code": "L2312"
        },
        {
            "name": "Get SubCategoryName only",
            "question": "Show me all SubCategoryName values", 
            "company_code": "C1587",
            "site_code": "L2312"
        },
        {
            "name": "Get RevenueCenterName only",
            "question": "Show me all RevenueCenterName values",
            "company_code": "C1587", 
            "site_code": "L2312"
        },
        {
            "name": "Sales with DayPartName",
            "question": "Show me sales data with DayPartName",
            "company_code": "C1587",
            "site_code": "L2312"
        },
        {
            "name": "Sales with CategoryName",
            "question": "Show me sales data with PaperchaseCategoryName",
            "company_code": "C1587",
            "site_code": "L2312"
        },
        {
            "name": "Sales with SubCategoryName",
            "question": "Show me sales data with SubCategoryName",
            "company_code": "C1587",
            "site_code": "L2312"
        },
        {
            "name": "Sales with RevenueCenterName",
            "question": "Show me sales data with RevenueCenterName",
            "company_code": "C1587",
            "site_code": "L2312"
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n🧪 Test {i}: {test_case['name']}")
        print("-" * 40)
        print(f"Question: {test_case['question']}")
        print(f"Company Code: {test_case['company_code']}")
        print(f"Site Code: {test_case['site_code']}")
        
        try:
            result = await run_multi_agent_system(
                test_case['question'],
                test_case['company_code'],
                test_case['site_code']
            )
            
            if "error" in result:
                print(f"❌ Error: {result['error']}")
            else:
                print(f"✅ Success!")
                print(f"Selected Table: {result.get('selected_table', 'N/A')}")
                print(f"SQL Query: {result.get('sql_query', 'N/A')}")
                print(f"Data Rows: {len(result.get('data', []))}")
                print(f"Description: {result.get('description', 'N/A')[:100]}...")
                
                # Show first few rows of data
                data = result.get('data', [])
                if data:
                    print(f"First 3 rows of data:")
                    for j, row in enumerate(data[:3]):
                        print(f"  Row {j+1}: {row}")
                
        except Exception as e:
            print(f"❌ Exception: {str(e)}")
        
        print()

if __name__ == "__main__":
    asyncio.run(test_master_tables()) 
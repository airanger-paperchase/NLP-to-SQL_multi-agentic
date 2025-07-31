import asyncio
import sys
import os
import requests
import json

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

def test_multi_agent_endpoint():
    """Test the multi-agent endpoint to ensure it works with frontend"""
    
    # Test questions that should route to different tables
    test_questions = [
        "Show me total sales by month",
        "What items were sold in the last transaction?",
        "Give me company information"
    ]
    
    print("🧪 Testing Multi-Agent Frontend Integration")
    print("=" * 60)
    
    for i, question in enumerate(test_questions, 1):
        print(f"\n📝 Test {i}: {question}")
        print("-" * 40)
        
        try:
            # Make request to the multi-agent endpoint
            response = requests.post(
                'http://localhost:8000/api/multi-agent',
                json={'question': question},
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                
                print(f"✅ Status: {response.status_code}")
                print(f"📊 Selected Table: {data.get('selected_table', 'N/A')}")
                print(f"🎯 Confidence: {data.get('routing_decision', {}).get('confidence', 'N/A')}")
                print(f"🔍 SQL Query: {data.get('sql_query', 'N/A')}")
                print(f"📈 Data Records: {len(data.get('data', []))}")
                print(f"📝 Answer: {data.get('answer', 'N/A')[:100]}...")
                
                # Check if response structure matches frontend expectations
                required_fields = ['sql_query', 'data', 'answer']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    print(f"❌ Missing fields: {missing_fields}")
                else:
                    print("✅ Response structure matches frontend expectations")
                    
            else:
                print(f"❌ Error: {response.status_code}")
                print(f"Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Exception: {str(e)}")
        
        print("-" * 40)

def test_frontend_compatibility():
    """Test if the response structure is compatible with frontend"""
    
    print("\n🔍 Testing Frontend Compatibility")
    print("=" * 40)
    
    try:
        response = requests.post(
            'http://localhost:8000/api/multi-agent',
            json={'question': 'Show me total sales by month'},
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Check frontend interface compatibility
            frontend_interface = {
                'sql_query': 'string',
                'data': 'array',
                'answer': 'string'
            }
            
            print("Frontend Interface Requirements:")
            for field, expected_type in frontend_interface.items():
                if field in data:
                    actual_type = type(data[field]).__name__
                    if expected_type == 'string' and isinstance(data[field], str):
                        status = "✅"
                    elif expected_type == 'array' and isinstance(data[field], list):
                        status = "✅"
                    else:
                        status = "❌"
                    print(f"  {status} {field}: {actual_type} (expected: {expected_type})")
                else:
                    print(f"  ❌ {field}: Missing")
            
            print(f"\n📊 Sample Response Structure:")
            print(json.dumps(data, indent=2)[:500] + "...")
            
        else:
            print(f"❌ Server error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")

if __name__ == "__main__":
    print("🚀 Starting Frontend Integration Tests")
    print("Make sure your backend server is running on http://localhost:8000")
    print()
    
    test_multi_agent_endpoint()
    test_frontend_compatibility()
    
    print("\n🎉 Frontend Integration Tests Complete!")
    print("\nTo test with your frontend:")
    print("1. Start backend: cd backend && python start_server.py")
    print("2. Start frontend: cd frontend && npm run dev")
    print("3. Go to http://localhost:5173 and test the chat functionality") 
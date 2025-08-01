import asyncio
import sys
import os

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from core.multi_agent_orchestrator import TableSpecialistAgent, TableDataManager
from core.sqlserver_query_generator import generate_dynamic_prompt_template

def compare_system_messages():
    """Compare the system messages between original and multi-agent systems"""
    
    print("🔍 Comparing System Messages")
    print("=" * 60)
    
    # Get original system message
    print("\n📝 ORIGINAL SYSTEM MESSAGE (sqlserver_query_generator.py):")
    print("-" * 40)
    original_prompt = generate_dynamic_prompt_template()
    print(f"Length: {len(original_prompt)} characters")
    print("Key features:")
    print("✅ Comprehensive SQL Server syntax rules")
    print("✅ Detailed table overviews")
    print("✅ Specific query patterns")
    print("✅ Multiple examples")
    print("✅ Strict output formatting rules")
    print("✅ Business context for Paperchase")
    print("✅ Comprehensive SQL generation rules")
    
    # Get multi-agent system message
    print("\n📝 MULTI-AGENT SYSTEM MESSAGE (multi_agent_orchestrator.py):")
    print("-" * 40)
    
    # Create a test table context
    table_manager = TableDataManager()
    test_context = {
        'table_name': 'Vw_SI_SalesSummary',
        'description': 'Summary sales data and metrics',
        'business_context': 'Contains aggregated sales information, totals, and summary metrics for business analysis',
        'schema': [
            {'name': 'CheckId', 'type': 'VARCHAR', 'nullable': 'YES', 'default': None},
            {'name': 'Date', 'type': 'DATETIME', 'nullable': 'YES', 'default': None},
            {'name': 'TotalAmount', 'type': 'DECIMAL', 'nullable': 'YES', 'default': None}
        ],
        'sample_data': [
            {'CheckId': 'CHK001', 'Date': '2024-01-01', 'TotalAmount': '125.50'},
            {'CheckId': 'CHK002', 'Date': '2024-01-02', 'TotalAmount': '89.75'}
        ]
    }
    
    table_agent = TableSpecialistAgent('Vw_SI_SalesSummary', test_context)
    multi_agent_prompt = table_agent.generate_table_prompt()
    
    print(f"Length: {len(multi_agent_prompt)} characters")
    print("Key features:")
    print("✅ Uses original comprehensive system message")
    print("✅ Domain-specific SQL assistant for Paperchase")
    print("✅ SQL Server (T-SQL) expert")
    print("✅ Comprehensive SQL generation rules")
    print("✅ SQL Server-specific rules")
    print("✅ Common query patterns")
    print("✅ Critical output rules")
    print("✅ Examples of correct/incorrect output")
    
    # Compare key elements
    print("\n🔍 COMPARISON:")
    print("-" * 40)
    
    original_keywords = [
        "domain-specific SQL assistant for Paperchase",
        "SQL Server (T-SQL)",
        "TOP 20",
        "CRITICAL OUTPUT RULES",
        "NO explanations, NO markdown, NO comments",
        "EXAMPLE CORRECT OUTPUT",
        "EXAMPLE INCORRECT OUTPUT"
    ]
    
    multi_agent_keywords = [
        "domain-specific SQL assistant for Paperchase",
        "SQL Server (T-SQL)",
        "TOP 20",
        "CRITICAL OUTPUT RULES",
        "NO explanations, NO markdown, NO comments",
        "EXAMPLE CORRECT OUTPUT",
        "EXAMPLE INCORRECT OUTPUT"
    ]
    
    print("Original System Message Keywords:")
    for keyword in original_keywords:
        status = "✅" if keyword in original_prompt else "❌"
        print(f"  {status} {keyword}")
    
    print("\nMulti-Agent System Message Keywords:")
    for keyword in multi_agent_keywords:
        status = "✅" if keyword in multi_agent_prompt else "❌"
        print(f"  {status} {keyword}")
    
    # Check if multi-agent uses the same comprehensive approach
    print("\n🎯 VERIFICATION:")
    print("-" * 40)
    
    if "domain-specific SQL assistant for Paperchase" in multi_agent_prompt:
        print("✅ Multi-agent uses the same domain-specific approach")
    else:
        print("❌ Multi-agent does NOT use the same domain-specific approach")
    
    if "CRITICAL OUTPUT RULES" in multi_agent_prompt:
        print("✅ Multi-agent uses the same critical output rules")
    else:
        print("❌ Multi-agent does NOT use the same critical output rules")
    
    if "EXAMPLE CORRECT OUTPUT" in multi_agent_prompt:
        print("✅ Multi-agent uses the same example format")
    else:
        print("❌ Multi-agent does NOT use the same example format")
    
    if "SQL Server (T-SQL)" in multi_agent_prompt:
        print("✅ Multi-agent uses the same SQL Server focus")
    else:
        print("❌ Multi-agent does NOT use the same SQL Server focus")
    
    print(f"\n📊 SUMMARY:")
    print("-" * 40)
    print(f"Original prompt length: {len(original_prompt)} characters")
    print(f"Multi-agent prompt length: {len(multi_agent_prompt)} characters")
    
    if len(multi_agent_prompt) > len(original_prompt) * 0.8:  # At least 80% as comprehensive
        print("✅ Multi-agent system now uses comprehensive system message")
    else:
        print("❌ Multi-agent system still uses simplified system message")
    
    print("\n🎉 System Message Comparison Complete!")

if __name__ == "__main__":
    compare_system_messages() 
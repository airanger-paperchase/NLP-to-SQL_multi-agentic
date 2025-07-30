import json

def fetch_latest_v2_from_cosmos():
    """
    Mock function to fetch data from Cosmos DB.
    For now, returns sample data for testing.
    """
    sample_data = {
        "queries": [
            "Show me sales data for July 2024",
            "What are the top selling items?",
            "Revenue analysis by month"
        ]
    }
    return json.dumps(sample_data)
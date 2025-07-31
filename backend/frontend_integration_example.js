// Frontend Integration Example for Multi-Agent System
// This shows how to integrate with the new multi-agent endpoint

// Example 1: Using the new multi-agent endpoint
async function askMultiAgentQuestion(question) {
    try {
        const response = await fetch('http://localhost:8000/api/multi-agent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: question
            })
        });

        const result = await response.json();
        
        if (result.success) {
            console.log('🤖 Multi-Agent Response:');
            console.log('📊 Selected Table:', result.selected_table);
            console.log('🎯 Routing Decision:', result.routing_decision);
            console.log('🔍 SQL Query:', result.sql_query);
            console.log('📈 Data:', result.data);
            console.log('📝 Description:', result.description);
            
            return result;
        } else {
            console.error('❌ Error:', result.error);
            return null;
        }
    } catch (error) {
        console.error('❌ Network Error:', error);
        return null;
    }
}

// Example 2: Using the original single-agent endpoint (for comparison)
async function askSingleAgentQuestion(question) {
    try {
        const response = await fetch('http://localhost:8000/api/agent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: question
            })
        });

        const result = await response.json();
        console.log('🤖 Single-Agent Response:', result);
        return result;
    } catch (error) {
        console.error('❌ Network Error:', error);
        return null;
    }
}

// Example 3: Check multi-agent system status
async function checkMultiAgentStatus() {
    try {
        const response = await fetch('http://localhost:8000/api/multi-agent/status');
        const status = await response.json();
        console.log('🔍 Multi-Agent Status:', status);
        return status;
    } catch (error) {
        console.error('❌ Status Check Error:', error);
        return null;
    }
}

// Example 4: Test different question types
async function testMultiAgentSystem() {
    const testQuestions = [
        "Show me total sales by month",
        "What items were sold in the last transaction?",
        "Give me company information",
        "Show me detailed sales transactions",
        "What are the top selling products?"
    ];

    console.log('🧪 Testing Multi-Agent System...');
    
    for (const question of testQuestions) {
        console.log(`\n📝 Question: ${question}`);
        const result = await askMultiAgentQuestion(question);
        
        if (result) {
            console.log(`✅ Routed to: ${result.selected_table}`);
            console.log(`🎯 Confidence: ${result.routing_decision.confidence}`);
            console.log(`💡 Reasoning: ${result.routing_decision.reasoning}`);
        }
        
        // Wait a bit between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Example 5: React component example
function MultiAgentChatComponent() {
    const [question, setQuestion] = useState('');
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        const result = await askMultiAgentQuestion(question);
        setResponse(result);
        setLoading(false);
    };

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask a question..."
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Processing...' : 'Ask Multi-Agent'}
                </button>
            </form>

            {response && (
                <div>
                    <h3>🤖 Multi-Agent Response</h3>
                    <p><strong>Selected Table:</strong> {response.selected_table}</p>
                    <p><strong>Confidence:</strong> {response.routing_decision.confidence}</p>
                    <p><strong>Reasoning:</strong> {response.routing_decision.reasoning}</p>
                    <p><strong>SQL Query:</strong> {response.sql_query}</p>
                    <p><strong>Description:</strong> {response.description}</p>
                    
                    <h4>📊 Data:</h4>
                    <pre>{JSON.stringify(response.data, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}

// Example 6: Comparison between single and multi-agent
async function compareAgents(question) {
    console.log('🔄 Comparing Single vs Multi-Agent...');
    
    console.log('\n🤖 Single Agent:');
    const singleResult = await askSingleAgentQuestion(question);
    
    console.log('\n🤖 Multi Agent:');
    const multiResult = await askMultiAgentQuestion(question);
    
    console.log('\n📊 Comparison:');
    console.log('Single Agent - No routing info, processes all tables');
    console.log('Multi Agent - Intelligent routing, specialized context');
    
    return { single: singleResult, multi: multiResult };
}

// Usage Examples:
// 1. Check system status
// checkMultiAgentStatus();

// 2. Ask a question
// askMultiAgentQuestion("Show me total sales by month");

// 3. Test the system
// testMultiAgentSystem();

// 4. Compare agents
// compareAgents("Show me total sales by month");

export {
    askMultiAgentQuestion,
    askSingleAgentQuestion,
    checkMultiAgentStatus,
    testMultiAgentSystem,
    compareAgents,
    MultiAgentChatComponent
}; 
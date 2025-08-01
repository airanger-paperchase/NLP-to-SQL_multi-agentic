# Paperchase ERP Chat System Setup

This guide will help you set up the frontend and backend for the Paperchase ERP Chat System.

## Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. **Database Connection**: The system is configured to connect to your existing SQLite databases:
   - `Vw_SI_SalesDetails 1.db` (31MB) - Contains detailed sales transaction data
   - `Vw_SI_SalesSummary 1.db` (2.7MB) - Contains summarized sales data
   
   These databases are located in the root directory and contain your existing tables and data.

4. Create a `.env` file in the backend directory with your Azure OpenAI credentials:
   ```
   AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
   AZURE_OPENAI_KEY=your_azure_openai_key
   ```

5. Start the backend server:
   ```bash
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 5000
   ```

## Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the frontend development server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173` and will automatically proxy API requests to the backend at `http://localhost:5000`.

## Usage

1. Open your browser and go to `http://localhost:5173`
2. Navigate to the Chat page
3. Type your question about sales data in the chat input
4. The system will generate SQL queries and return results from your existing database

## Example Questions

- "What are the total sales for today?"
- "Show me sales by revenue center"
- "What are the top selling menu items?"
- "How many covers did we serve for dinner?"
- "Show me sales data for July 2024"
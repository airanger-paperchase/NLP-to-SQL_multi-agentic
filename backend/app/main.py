from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.agent import router as agent_router
from api.sqlite import router as sqlite_router

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Paperchase ERP Backend is running"}

@app.get("/api/test")
def test_endpoint():
    return {"status": "ok", "message": "API endpoint is working"}

app.include_router(agent_router, prefix="/api")
app.include_router(sqlite_router, prefix="/api")
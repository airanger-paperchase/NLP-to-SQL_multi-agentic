import os
from dotenv import load_dotenv
from .database_config import *

load_dotenv(override=True)

# Use database_config values, but allow environment variables to override
SERVER = os.getenv("SERVER", SERVER)
DATABASE = os.getenv("DATABASE", DATABASE)
USERNAME = os.getenv("USERNAME", USERNAME)
PASSWORD = os.getenv("PASSWORD", PASSWORD)
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", AZURE_OPENAI_ENDPOINT)
AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY", AZURE_OPENAI_KEY)
API_VERSION_GA = os.getenv("API_VERSION_GA", API_VERSION_GA)
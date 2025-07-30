import os
from dotenv import load_dotenv

load_dotenv(override=True)

SERVER = os.getenv("SERVER")
DATABASE = os.getenv("DATABASE")
USERNAME = os.getenv("USERNAME")
PASSWORD = os.getenv("PASSWORD")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY")
API_VERSION_GA = os.getenv("API_VERSION_GA")
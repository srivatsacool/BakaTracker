import os
import sys
from dotenv import load_dotenv

# Load env variables for local development
load_dotenv()

class Config:
    PROJECT_NAME = "BakaTracker MCP"
    VERSION = "1.0.1"
    PORT = int(os.getenv("PORT", "8080"))
    DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    
    # Apps Script URL and key (the bridge to Sheets)
    GOOGLE_APPS_SCRIPT_URL = os.getenv("GOOGLE_APPS_SCRIPT_URL", "")
    GOOGLE_APPS_SCRIPT_API_KEY = os.getenv("GOOGLE_APPS_SCRIPT_API_KEY", "")
    
    # Bearer auth token for clients (React / MCP clients)
    AUTH_TOKEN = os.getenv("AUTH_TOKEN", "")
    
    TIMEOUT = float(os.getenv("TIMEOUT", "10.0"))

config = Config()

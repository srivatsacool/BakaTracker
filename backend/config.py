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
    
    # Auth Mode & Owner Configuration
    AUTH_MODE = os.getenv("AUTH_MODE", "legacy")
    OWNER_EMAIL = os.getenv("OWNER_EMAIL", "")

    # Auth0 Configuration
    AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN", "")
    AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE", "")
    AUTH0_ISSUER = os.getenv("AUTH0_ISSUER", "")
    AUTH0_CLIENT_ID = os.getenv("AUTH0_CLIENT_ID", "")

    def validate(self):
        """
        Validate critical configuration parameters.
        Raises ValueError if any settings are invalid.
        """
        # Validate AUTH_MODE
        if self.AUTH_MODE not in ("legacy", "jwt"):
            raise ValueError(f"Invalid AUTH_MODE: '{self.AUTH_MODE}'. Must be 'legacy' or 'jwt'.")

        # In legacy mode, ensure AUTH_TOKEN is set
        if self.AUTH_MODE == "legacy" and not self.AUTH_TOKEN:
            raise ValueError("AUTH_TOKEN must be configured in legacy mode.")

        # In jwt mode, validate Auth0 configuration
        if self.AUTH_MODE == "jwt":
            if not self.AUTH0_DOMAIN:
                raise ValueError("AUTH0_DOMAIN must be configured in jwt mode.")
            if "://" in self.AUTH0_DOMAIN:
                raise ValueError("AUTH0_DOMAIN must be a host name only, e.g., 'tenant.auth0.com' (no protocol).")

            if not self.AUTH0_AUDIENCE:
                raise ValueError("AUTH0_AUDIENCE must be configured in jwt mode.")

            if not self.AUTH0_ISSUER:
                raise ValueError("AUTH0_ISSUER must be configured in jwt mode.")
            if not self.AUTH0_ISSUER.startswith("https://"):
                raise ValueError("AUTH0_ISSUER must be an HTTPS URL starting with https://.")

            if not self.AUTH0_CLIENT_ID:
                raise ValueError("AUTH0_CLIENT_ID must be configured in jwt mode.")

            if not self.OWNER_EMAIL:
                raise ValueError("OWNER_EMAIL must be configured in jwt mode.")
            if "@" not in self.OWNER_EMAIL:
                raise ValueError("OWNER_EMAIL must be a valid email address.")


config = Config()

import time
import logging
import httpx
from typing import Dict, Any
from config import config

logger = logging.getLogger("bakatracker")

class SheetsClient:
    def __init__(self):
        self.url = config.GOOGLE_APPS_SCRIPT_URL
        self.api_key = config.GOOGLE_APPS_SCRIPT_API_KEY

    def _verify_config(self):
        if not self.url:
            logger.error("GOOGLE_APPS_SCRIPT_URL configuration is missing")
            raise ValueError("GOOGLE_APPS_SCRIPT_URL configuration is missing")

    def _execute_with_retry(self, operation: str, method: str, url: str, **kwargs) -> httpx.Response:
        """
        Executes an HTTP request with a 10s timeout, up to 3 retries, and exponential backoff.
        """
        retries = 3
        backoff = 0.5
        last_exception = None

        for attempt in range(retries + 1):
            if attempt > 0:
                sleep_time = backoff * (2 ** (attempt - 1))
                logger.warning(f"Retrying {operation} (attempt {attempt}/{retries}) in {sleep_time}s after failure: {last_exception}")
                time.sleep(sleep_time)

            try:
                with httpx.Client(timeout=config.TIMEOUT) as httpx_client:
                    if method == "GET":
                        response = httpx_client.get(url, **kwargs)
                    elif method == "POST":
                        response = httpx_client.post(url, **kwargs)
                    else:
                        raise ValueError(f"Unsupported HTTP method: {method}")

                # If we get a response, inspect status
                if response.status_code == 200:
                    return response
                
                # Check for transient HTTP server errors (5xx)
                if 500 <= response.status_code < 600:
                    last_exception = f"HTTP {response.status_code} Server Error"
                else:
                    # Do not retry client errors (e.g. 401, 403, 404)
                    logger.error(f"HTTP {response.status_code} client error during {operation}. Not retrying.")
                    return response

            except (httpx.TimeoutException, httpx.NetworkError, httpx.ConnectError) as e:
                last_exception = f"Network failure: {str(e)}"
            except Exception as e:
                last_exception = f"Unexpected error: {str(e)}"

        logger.error(f"Failed to execute {operation} after {retries} retries. Final error: {last_exception}")
        raise RuntimeError(f"Failed to connect to Google Sheets bridge: {last_exception}")

    def fetch_db(self) -> Dict[str, Any]:
        """
        Fetches the complete database from the Google Sheets Apps Script Web App.
        """
        self._verify_config()
        logger.info("Fetching database payload from Apps Script Web App")
        params = {"action": "getAll"}
        if self.api_key:
            params["apiKey"] = self.api_key

        response = self._execute_with_retry(
            operation="fetch_db",
            method="GET",
            url=self.url,
            params=params
        )

        if response.status_code != 200:
            raise RuntimeError(f"Failed to fetch data from Sheets. HTTP Status: {response.status_code}")
            
        result = response.json()
        if result.get("status") == "success":
            logger.info("Database fetched successfully")
            return result.get("data", {})
        else:
            msg = result.get("message", "Unknown error")
            logger.error(f"Google Sheets API Error: {msg}")
            raise RuntimeError(f"Google Sheets API Error: {msg}")

    def save_db(self, data: Dict[str, Any]) -> bool:
        """
        Overwrites the sheets database with the updated collections payload.
        """
        self._verify_config()
        logger.info("Syncing updated database payload to Sheets")
        payload = {
            "action": "sync",
            "data": data
        }
        if self.api_key:
            payload["apiKey"] = self.api_key

        response = self._execute_with_retry(
            operation="save_db",
            method="POST",
            url=self.url,
            json=payload
        )
            
        if response.status_code != 200:
            raise RuntimeError(f"Failed to save data to Sheets. HTTP Status: {response.status_code}")
            
        result = response.json()
        if result.get("status") == "success":
            logger.info("Database synced successfully")
            return True
        else:
            msg = result.get("message", "Unknown error")
            logger.error(f"Google Sheets API Sync Error: {msg}")
            raise RuntimeError(f"Google Sheets API Sync Error: {msg}")

# Export singleton client under 'client' to match existing MCP server imports
client = SheetsClient()

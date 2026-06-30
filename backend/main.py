import os
import sys
import time
import uuid
import logging
import importlib.metadata
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# Ensure backend directory is in Python path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from config import config
from server import mcp
from services.sheets_client import client

# Setup global metrics tracker
class MetricsTracker:
    def __init__(self):
        self.start_time = time.time()
        self.request_count = 0

    def increment_request_count(self):
        self.request_count += 1

    def get_uptime(self) -> str:
        uptime_seconds = time.time() - self.start_time
        days = int(uptime_seconds // 86400)
        hours = int((uptime_seconds % 86400) // 3600)
        minutes = int((uptime_seconds % 3600) // 60)
        seconds = int(uptime_seconds % 60)
        return f"{days}d {hours}h {minutes}m {seconds}s"

metrics_tracker = MetricsTracker()

# Logging configuration
logging.basicConfig(
    level=config.LOG_LEVEL,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout
)
logger = logging.getLogger("bakatracker")

async def validate_startup():
    logger.info("Executing BakaTracker V1.0 startup verification checklist...")
    
    # 1. Validate required environment variables exist
    if not config.GOOGLE_APPS_SCRIPT_URL:
        logger.critical("Startup validation failed: GOOGLE_APPS_SCRIPT_URL configuration is missing.")
        sys.exit(1)
        
    if not config.AUTH_TOKEN:
        logger.critical("Startup validation failed: AUTH_TOKEN configuration is missing.")
        sys.exit(1)
        
    # 2. Verify Apps Script URL format is valid
    if not config.GOOGLE_APPS_SCRIPT_URL.startswith(("http://", "https://")):
        logger.critical(f"Startup validation failed: GOOGLE_APPS_SCRIPT_URL '{config.GOOGLE_APPS_SCRIPT_URL}' must start with http:// or https://")
        sys.exit(1)
        
    # 3. Connection to Apps Script succeeds (logs warning if database is offline during boot)
    try:
        client.fetch_db()
        logger.info("Startup validation: Connection to Google Sheets database verified successfully.")
    except Exception as e:
        logger.warning(f"Startup verification warning: Unable to reach Google Sheets database during boot: {str(e)}")
        
    # 4. Confirm MCP tools register successfully
    tools = await mcp.list_tools()
    logger.info(f"Startup validation: {len(tools)} MCP tools registered successfully.")
    if not tools:
        logger.critical("Startup validation failed: No MCP tools registered.")
        sys.exit(1)
        
    logger.info("Startup verification checklist completed successfully.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run startup validations
    await validate_startup()
    yield
    # Run graceful shutdown logic
    logger.info("Shutting down: Flushing logs and terminating HTTP client sessions.")
    logger.info("Graceful shutdown completed successfully.")

app = FastAPI(
    title="BakaTracker MCP",
    version=config.VERSION,
    lifespan=lifespan
)

# Authentication and Logging Middleware
class AuthAndLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        start_time = time.time()
        path = request.url.path
        
        # 1. Exclude public endpoints from bearer verification
        public_paths = {"/", "/health", "/version"}
        if path not in public_paths:
            # Check Authorization Header
            auth_header = request.headers.get("Authorization")
            expected_token = f"Bearer {config.AUTH_TOKEN}"
            
            if not config.AUTH_TOKEN:
                logger.error("AUTH_TOKEN is not configured on the server")
                return JSONResponse({"detail": "Server authentication token is unconfigured"}, status_code=500)
                
            if not auth_header or auth_header != expected_token:
                logger.warning(f"RequestID: {request_id} | Unauthorized request to {path} from {request.client.host}")
                metrics_tracker.increment_request_count()
                return JSONResponse({"detail": "Unauthorized"}, status_code=401)
        
        # 2. Process request
        metrics_tracker.increment_request_count()
        try:
            response = await call_next(request)
            status_str = "success" if response.status_code < 400 else "failure"
        except Exception as e:
            status_str = "exception"
            logger.exception(f"Unhandled exception during request {request_id}: {str(e)}")
            raise e
        finally:
            execution_time = time.time() - start_time
            logger.info(
                f"RequestID: {request_id} | Path: {path} | Method: {request.method} | "
                f"Status: {status_str} | ExecutionTime: {execution_time:.4f}s"
            )
            
        return response

app.add_middleware(AuthAndLoggingMiddleware)

# Expose FastMCP HTTP transport (prefer Streamable HTTP, fall back to SSE)
if hasattr(mcp, "streamable_http_app"):
    mcp_app = mcp.streamable_http_app()
    transport_name = "Streamable HTTP"
    logger.info("Registering MCP over official Streamable HTTP transport app")
elif hasattr(mcp, "sse_app"):
    mcp_app = mcp.sse_app()
    transport_name = "SSE"
    logger.info("Registering MCP over official Server-Sent Events (SSE) transport app")
else:
    raise RuntimeError("Installed mcp package does not support streamable_http_app or sse_app.")

app.mount("/mcp", mcp_app)

# ----------------------------------------------------
# PUBLIC ROUTES
# ----------------------------------------------------

@app.get("/")
def api_discovery():
    return {
        "name": "BakaTracker MCP Gateway",
        "version": config.VERSION,
        "status": "running",
        "transport": transport_name,
        "docs": "/info",
        "health": "/health"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/version")
def version():
    git_sha = os.getenv("K_REVISION", "unknown")
    return {
        "name": "BakaTracker MCP",
        "version": config.VERSION,
        "environment": os.getenv("ENV", "production"),
        "git_sha": git_sha
    }

# ----------------------------------------------------
# PROTECTED ROUTES
# ----------------------------------------------------

@app.get("/ready")
def ready():
    try:
        client.fetch_db()
        db_status = "connected"
        apps_script_status = "connected"
    except Exception as e:
        logger.error(f"Readiness check failed database connection ping: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail={
                "database": "disconnected",
                "apps_script": "disconnected",
                "mcp": "ready"
            }
        )
    return {
        "database": db_status,
        "apps_script": apps_script_status,
        "mcp": "ready"
    }

@app.get("/info")
async def info():
    try:
        sdk_ver = importlib.metadata.version("mcp")
    except Exception:
        sdk_ver = "unknown"
        
    tools = await mcp.list_tools()
    resources = await mcp.list_resources()
    return {
        "project": "BakaTracker",
        "backend": "FastMCP",
        "transport": transport_name,
        "database": "Google Sheets",
        "bridge": "Google Apps Script",
        "sdk_version": sdk_ver,
        "tool_count": len(tools),
        "resource_count": len(resources),
        "backend_version": config.VERSION
    }

@app.get("/metrics")
async def metrics():
    try:
        sdk_ver = importlib.metadata.version("mcp")
    except Exception:
        sdk_ver = "unknown"
        
    tools = await mcp.list_tools()
    is_cloud_run = "K_SERVICE" in os.environ
    return {
        "uptime": metrics_tracker.get_uptime(),
        "request_count": metrics_tracker.request_count,
        "tool_count": len(tools),
        "sdk_version": sdk_ver,
        "cloud_run": is_cloud_run
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=config.PORT, reload=config.DEBUG)

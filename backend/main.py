import os
import sys
import time
import uuid
import logging
import importlib.metadata
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

# Ensure backend directory is in Python path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from config import config
from server import mcp
from services.sheets_client import client
from auth.middleware import JWTAuthMiddleware
from mcp.server.fastmcp.server import StreamableHTTPASGIApp
from mcp.server.sse import SseServerTransport

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
    
    # Validate core authentication settings first
    try:
        config.validate()
    except ValueError as e:
        logger.critical(f"Startup validation failed: {str(e)}")
        raise

    # 1. Validate required environment variables exist
    if not config.GOOGLE_APPS_SCRIPT_URL:
        logger.critical("Startup validation failed: GOOGLE_APPS_SCRIPT_URL configuration is missing.")
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
    await validate_startup()

    # Only run the streamable HTTP session manager context if it was initialized
    if getattr(mcp, "_session_manager", None) is not None:
        async with mcp.session_manager.run():
            yield
    else:
        yield

    logger.info("Shutting down: Flushing logs and terminating HTTP client sessions.")
    logger.info("Graceful shutdown completed successfully.")

app = FastAPI(
    title="BakaTracker MCP",
    version=config.VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication and Logging Middleware
class AuthAndLoggingMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive)
        request_id = str(uuid.uuid4())
        
        if "state" not in scope:
            scope["state"] = {}
        scope["state"]["request_id"] = request_id

        path = request.url.path

        # Public endpoints and prefixes
        public_paths = {
            "/",
            "/health",
            "/version",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/info",
            "/routes",
        }

        public_prefixes = (
            "/.well-known",
        )

        is_public = (
            path in public_paths
            or any(path.startswith(prefix) for prefix in public_prefixes)
        )

        # Protect only management endpoints
        if not is_public and request.method != "OPTIONS":
            if config.AUTH_MODE == "legacy":
                auth_header = request.headers.get("Authorization")
                expected = f"Bearer {config.AUTH_TOKEN}"

                if auth_header != expected:
                    logger.warning(
                        f"RequestID: {request_id} | Unauthorized request to {path} (legacy mode)"
                    )

                    metrics_tracker.increment_request_count()

                    response = JSONResponse(
                        status_code=401,
                        content={"detail": "Unauthorized"},
                    )
                    await response(scope, receive, send)
                    return
                    
                scope["state"]["auth_mode"] = "legacy"
                
                # Bind legacy context variables
                from auth import context
                from auth.models import AuthenticatedUser
                dummy_user = AuthenticatedUser(
                    id="legacy_owner",
                    email=config.OWNER_EMAIL or "owner@bakatracker.local",
                    name="Owner",
                    provider="legacy"
                )
                scope["state"]["user"] = dummy_user
                context.current_user.set(dummy_user)
                context.auth_mode.set("legacy")

        metrics_tracker.increment_request_count()
        start_time = time.time()
        status_code = [200]

        async def logging_send(message):
            if message["type"] == "http.response.start":
                status_code[0] = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, logging_send)
        except Exception:
            logger.exception(
                f"Unhandled exception during request {request_id}"
            )
            raise
        finally:
            execution_time = time.time() - start_time
            logger.info(
                f"RequestID: {request_id} | "
                f"{request.method} {path} | "
                f"{status_code[0]} | "
                f"{execution_time:.4f}s"
            )

app.add_middleware(AuthAndLoggingMiddleware)
app.add_middleware(
    JWTAuthMiddleware,
    exclude_paths={
        "/",
        "/health",
        "/version",
        "/docs",
        "/redoc",
        "/openapi.json",
        "/info",
        "/routes",
    },
    exclude_prefixes={
        "/.well-known",
    }
)

# Wrapper class to bypass Starlette's request_response wrapper check for ASGI apps
class ASGIAppWrapper:
    def __init__(self, asgi_app):
        self.asgi_app = asgi_app
    async def __call__(self, scope, receive, send):
        await self.asgi_app(scope, receive, send)

# Initialize session manager for Streamable HTTP transport
if hasattr(mcp, "streamable_http_app"):
    if mcp._session_manager is None:
        from mcp.server.streamable_http_manager import StreamableHTTPSessionManager
        mcp._session_manager = StreamableHTTPSessionManager(
            app=mcp._mcp_server,
            event_store=mcp._event_store,
            retry_interval=mcp._retry_interval,
            json_response=mcp.settings.json_response,
            stateless=mcp.settings.stateless_http,
            security_settings=mcp.settings.transport_security,
        )
    streamable_http_asgi = StreamableHTTPASGIApp(mcp.session_manager)
    app.mount("/mcp/http", streamable_http_asgi)
    app.add_route("/mcp/http", ASGIAppWrapper(streamable_http_asgi), methods=["GET", "POST", "DELETE", "OPTIONS"])
    logger.info("Mounted FastMCP Streamable HTTP ASGI app directly on /mcp/http")
else:
    logger.warning("Installed mcp package does not support streamable_http_app.")

# Expose FastMCP SSE transport directly
sse_transport = SseServerTransport(
    endpoint="/mcp/messages/",
    security_settings=mcp.settings.transport_security
)

async def sse_get_handler(scope, receive, send):
    async with sse_transport.connect_sse(scope, receive, send) as streams:
        await mcp._mcp_server.run(
            streams[0],
            streams[1],
            mcp._mcp_server.create_initialization_options(),
        )
    return Response()

app.mount("/mcp/sse", sse_get_handler)
app.add_route("/mcp/sse", ASGIAppWrapper(sse_get_handler), methods=["GET", "OPTIONS"])

app.mount("/mcp/messages", sse_transport.handle_post_message)
app.add_route("/mcp/messages", ASGIAppWrapper(sse_transport.handle_post_message), methods=["POST", "OPTIONS"])

app.add_route("/mcp", ASGIAppWrapper(sse_get_handler), methods=["GET", "OPTIONS"])

logger.info("Mounted FastMCP SSE transport app directly on /mcp, /mcp/sse, and /mcp/messages")

transport_name = "SSE + Streamable HTTP"

# ----------------------------------------------------
# OIDC / OAUTH DISCOVERY ENDPOINTS (ChatGPT / Auth0)
# ----------------------------------------------------

@app.get("/.well-known/oauth-authorization-server")
@app.get("/.well-known/openid-configuration")
def oauth_discovery(request: Request):
    return {
        "issuer": config.AUTH0_ISSUER,
        "authorization_endpoint": f"https://{config.AUTH0_DOMAIN}/authorize",
        "token_endpoint": f"https://{config.AUTH0_DOMAIN}/oauth/token",
        "userinfo_endpoint": f"https://{config.AUTH0_DOMAIN}/userinfo",
        "jwks_uri": f"https://{config.AUTH0_DOMAIN}/.well-known/jwks.json",
        "scopes_supported": ["openid", "profile", "email", "offline_access"],
        "response_types_supported": ["code", "token", "id_token"],
        "grant_types_supported": ["authorization_code", "refresh_token", "implicit"],
        "code_challenge_methods_supported": ["S256"],
        "token_endpoint_auth_methods_supported": ["client_secret_post", "client_secret_basic", "none"],
        "subject_types_supported": ["public"],
        "id_token_signing_alg_values_supported": ["RS256"],
        "claims_supported": ["sub", "iss", "aud", "exp", "iat", "email", "email_verified", "name", "picture"],
        "client_id": config.AUTH0_CLIENT_ID,
        "audience": config.AUTH0_AUDIENCE
    }

# ----------------------------------------------------
# PUBLIC ROUTES
# ----------------------------------------------------

@app.get("/")
def api_discovery():
    return {
        "name": "BakaTracker MCP Gateway",
        "version": config.VERSION,
        "status": "running",
        "transports": {
            "sse": "/mcp",
            "streamable_http": "/mcp/http"
        },
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

@app.get("/state")
def fetch_db():
    try:
        data = client.fetch_db()
        return {"status": "success", "data": data}
    except Exception as e:
        logger.error(f"Failed to fetch database: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch database from Sheets: {str(e)}"
        )

@app.post("/state")
async def save_db(request: Request):
    try:
        body = await request.json()
        data = body.get("data")
        if not data:
            raise HTTPException(
                status_code=400,
                detail="Missing data payload"
            )
        success = client.save_db(data)
        if success:
            return {"status": "success"}
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to sync database to Sheets"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to save database: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to sync database to Sheets: {str(e)}"
        )


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
    
@app.get("/routes")
def routes():
    return [
        {
            "path": route.path,
            "name": route.name,
            "methods": list(route.methods) if hasattr(route, "methods") else []
        }
        for route in app.routes
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=config.PORT, reload=config.DEBUG)

from fastapi.responses import JSONResponse
from config import config

# RFC 9728: Build the resource metadata URL from the server's canonical resource URI.
# This is used in WWW-Authenticate headers to point MCP clients to the Protected Resource Metadata endpoint.
def _get_resource_metadata_url() -> str:
    audience = config.AUTH0_AUDIENCE
    if audience and audience.startswith("https://"):
        # Use the audience as the canonical resource URI
        base = audience.rstrip("/")
        return f"{base}/.well-known/oauth-protected-resource"
    # Fallback if AUTH0_AUDIENCE is not configured
    return ""

def unauthorized(detail: str = "Unauthorized") -> JSONResponse:
    """Returns a 401 Unauthorized response with RFC 9728 WWW-Authenticate header."""
    resource_metadata_url = _get_resource_metadata_url()
    if resource_metadata_url:
        www_authenticate = f'Bearer resource_metadata="{resource_metadata_url}"'
    else:
        www_authenticate = "Bearer"
    return JSONResponse(
        status_code=401,
        headers={"WWW-Authenticate": www_authenticate},
        content={"detail": detail}
    )

def forbidden(detail: str = "Forbidden") -> JSONResponse:
    """Returns a 403 Forbidden response."""
    return JSONResponse(
        status_code=403,
        content={"detail": detail}
    )

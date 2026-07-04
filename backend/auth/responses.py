from fastapi.responses import JSONResponse

def unauthorized(detail: str = "Unauthorized") -> JSONResponse:
    """Returns a 401 Unauthorized response with WWW-Authenticate header."""
    return JSONResponse(
        status_code=401,
        headers={"WWW-Authenticate": "Bearer"},
        content={"detail": detail}
    )

def forbidden(detail: str = "Forbidden") -> JSONResponse:
    """Returns a 403 Forbidden response."""
    return JSONResponse(
        status_code=403,
        content={"detail": detail}
    )

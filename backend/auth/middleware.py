from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.concurrency import run_in_threadpool
import logging
from typing import Set

from backend.config import config
from backend.core.security import authenticate_request
from backend.auth.exceptions import AuthError, ForbiddenUser
from backend.auth.responses import unauthorized, forbidden

logger = logging.getLogger("bakatracker.auth")

class JWTAuthMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        exclude_paths: Set[str] = None,
        exclude_prefixes: Set[str] = None
    ):
        super().__init__(app)
        self.exclude_paths = exclude_paths or set()
        self.exclude_prefixes = exclude_prefixes or set()

    async def dispatch(self, request: Request, call_next):
        # Skip authentication for OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)

        # Dynamically check the auth mode flag for seamless migration/testing
        if config.AUTH_MODE != "jwt":
            return await call_next(request)

        path = request.url.path

        # Check if route is excluded from authentication
        is_excluded = path in self.exclude_paths or any(
            path.startswith(prefix) for prefix in self.exclude_prefixes
        )

        if is_excluded:
            return await call_next(request)

        # Enforce JWT authentication
        try:
            user = await run_in_threadpool(authenticate_request, request)
            request.state.user = user
            request.state.auth_mode = "jwt"
            
            # Set global context variables for tools/sheetsclient
            from backend.auth import context
            context.current_user.set(user)
            context.auth_mode.set("jwt")
            
            logger.info(
                f"Authentication success | User ID: {user.id} | Mode: jwt"
            )
        except ForbiddenUser as e:
            logger.error(
                f"Authentication forbidden | Mode: jwt | Error: {str(e)}"
            )
            return forbidden(detail=str(e))
        except AuthError as e:
            logger.error(
                f"Authentication failure | Mode: jwt | Error: {str(e)}"
            )
            return unauthorized(detail=str(e))
        except Exception as e:
            logger.exception(
                f"Unexpected error during authentication | Mode: jwt | Error: {str(e)}"
            )
            return unauthorized(detail="Internal authentication error.")

        return await call_next(request)

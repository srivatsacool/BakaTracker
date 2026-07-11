from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.concurrency import run_in_threadpool
import logging
from typing import Set

from config import config
from core.security import authenticate_request
from auth.exceptions import AuthError, ForbiddenUser
from auth.responses import unauthorized, forbidden

logger = logging.getLogger("bakatracker.auth")

class JWTAuthMiddleware:
    def __init__(
        self,
        app,
        exclude_paths: Set[str] = None,
        exclude_prefixes: Set[str] = None
    ):
        self.app = app
        self.exclude_paths = exclude_paths or set()
        self.exclude_prefixes = exclude_prefixes or set()

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive)

        # Skip authentication for OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            await self.app(scope, receive, send)
            return

        # Dynamically check the auth mode flag for seamless migration/testing
        if config.AUTH_MODE != "jwt":
            await self.app(scope, receive, send)
            return

        path = request.url.path

        # Check if route is excluded from authentication
        is_excluded = path in self.exclude_paths or any(
            path.startswith(prefix) for prefix in self.exclude_prefixes
        )

        if is_excluded:
            await self.app(scope, receive, send)
            return

        # Enforce JWT authentication
        try:
            user = await run_in_threadpool(authenticate_request, request)
            if "state" not in scope:
                scope["state"] = {}
            scope["state"]["user"] = user
            scope["state"]["auth_mode"] = "jwt"
            
            # Set global context variables for tools/sheetsclient
            from auth import context
            context.current_user.set(user)
            context.auth_mode.set("jwt")
            
            logger.info(
                f"Authentication success | User ID: {user.id} | Mode: jwt"
            )
        except ForbiddenUser as e:
            logger.error(
                f"Authentication forbidden | Mode: jwt | Error: {str(e)}"
            )
            response = forbidden(detail=str(e))
            await response(scope, receive, send)
            return
        except AuthError as e:
            logger.error(
                f"Authentication failure | Mode: jwt | Error: {str(e)}"
            )
            response = unauthorized(detail=str(e))
            await response(scope, receive, send)
            return
        except Exception as e:
            logger.exception(
                f"Unexpected error during authentication | Mode: jwt | Error: {str(e)}"
            )
            response = unauthorized(detail="Internal authentication error.")
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)

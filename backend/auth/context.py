from contextvars import ContextVar
from typing import Optional
from auth.models import AuthenticatedUser

# Global context variables for tracking request-level authentication state
current_user: ContextVar[Optional[AuthenticatedUser]] = ContextVar("current_user", default=None)
auth_mode: ContextVar[Optional[str]] = ContextVar("auth_mode", default=None)

def get_current_user() -> Optional[AuthenticatedUser]:
    """Retrieve the active authenticated user from the context."""
    return current_user.get()

def get_auth_mode() -> Optional[str]:
    """Retrieve the current active authentication mode from the context."""
    return auth_mode.get()

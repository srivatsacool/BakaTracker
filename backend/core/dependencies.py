from typing import Annotated
from fastapi import Depends, Request, HTTPException
from backend.auth.models import AuthenticatedUser

async def get_current_user(request: Request) -> AuthenticatedUser:
    """
    FastAPI dependency to retrieve the current authenticated user from request state.
    """
    user = getattr(request.state, "user", None)
    if not user or not isinstance(user, AuthenticatedUser):
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please configure your Authorization header."
        )
    return user

CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]

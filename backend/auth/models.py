from pydantic import BaseModel
from typing import Optional

class AuthenticatedUser(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    provider: str = "auth0"

from fastapi import Request
from auth.jwt import verify_jwt
from auth.owner import verify_owner
from auth.models import AuthenticatedUser
from auth.exceptions import InvalidToken

def authenticate_request(request: Request) -> AuthenticatedUser:
    """
    Authenticate the request by checking and verifying the Authorization Bearer JWT.
    Verifies signature, issuer, audience, expiry, and owner verification.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise InvalidToken("Missing Authorization header.")

    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise InvalidToken("Invalid Authorization header. Expected Format: Bearer <TOKEN>")

    token = parts[1]
    
    # 1. Decode & Verify signature, aud, iss, exp
    claims = verify_jwt(token)

    email = claims.get("email")
    sub = claims.get("sub")
    name = claims.get("name") or claims.get("nickname")
    picture = claims.get("picture")

    if not email:
        raise InvalidToken("Token payload is missing an 'email' claim.")
    if not sub:
        raise InvalidToken("Token payload is missing a 'sub' claim.")

    # 2. Check owner permission
    verify_owner(email)

    return AuthenticatedUser(
        id=sub,
        email=email,
        name=name,
        picture=picture,
        provider="auth0"
    )

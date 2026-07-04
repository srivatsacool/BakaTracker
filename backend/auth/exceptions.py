class AuthError(Exception):
    """Base exception for all authentication-related errors."""
    pass

class InvalidToken(AuthError):
    """Raised when the token is invalid (e.g. invalid signature, malformed)."""
    pass

class ExpiredToken(AuthError):
    """Raised when the token has expired."""
    pass

class InvalidAudience(AuthError):
    """Raised when the token audience does not match the configured audience."""
    pass

class InvalidIssuer(AuthError):
    """Raised when the token issuer does not match the configured issuer."""
    pass

class MissingKey(AuthError):
    """Raised when the JWKS does not contain the key matching the token's kid header."""
    pass

class ForbiddenUser(AuthError):
    """Raised when the authenticated user is not authorized (not the owner)."""
    pass

import time
import httpx
import jwt
import threading
from jwt.algorithms import RSAAlgorithm
from typing import Dict, Any, Optional

from auth.exceptions import (
    AuthError,
    InvalidToken,
    ExpiredToken,
    InvalidAudience,
    InvalidIssuer,
    MissingKey,
)
from config import config

class JWKSKeyManager:
    def __init__(self, domain: str, cache_ttl: int = 86400):
        self.domain = domain
        self.cache_ttl = cache_ttl
        self.jwks_url = f"https://{domain}/.well-known/jwks.json"
        self._keys: Dict[str, Dict[str, Any]] = {}
        self._last_fetch_time: float = 0.0
        self._lock = threading.Lock()

    def _fetch_jwks(self) -> Dict[str, Any]:
        """Fetch JWKS keys directly from Auth0."""
        try:
            response = httpx.get(self.jwks_url, timeout=10.0)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            raise InvalidToken(f"Failed to fetch JWKS from Auth0: {str(e)}") from e

    def get_public_key_data(self, kid: str) -> Dict[str, Any]:
        """Get public key data for the given kid, refetching JWKS if expired or missing."""
        now = time.time()
        
        # Check conditions without lock first (double-checked locking optimization)
        cache_expired = (now - self._last_fetch_time) > self.cache_ttl
        key_missing_and_ratelimit_passed = kid not in self._keys and (now - self._last_fetch_time) > 10.0

        if cache_expired or key_missing_and_ratelimit_passed:
            with self._lock:
                now = time.time()
                cache_expired = (now - self._last_fetch_time) > self.cache_ttl
                key_missing_and_ratelimit_passed = kid not in self._keys and (now - self._last_fetch_time) > 10.0
                
                if cache_expired or key_missing_and_ratelimit_passed:
                    jwks = self._fetch_jwks()
                    self._keys = {key["kid"]: key for key in jwks.get("keys", []) if "kid" in key}
                    self._last_fetch_time = now

        with self._lock:
            if kid not in self._keys:
                raise MissingKey(f"Key with kid '{kid}' not found in JWKS.")
            return self._keys[kid]

_key_manager: Optional[JWKSKeyManager] = None

def get_key_manager() -> JWKSKeyManager:
    global _key_manager
    if _key_manager is None:
        if not config.AUTH0_DOMAIN:
            raise InvalidToken("AUTH0_DOMAIN is not configured on the server.")
        _key_manager = JWKSKeyManager(config.AUTH0_DOMAIN)
    return _key_manager

def verify_jwt(token: str) -> Dict[str, Any]:
    """
    Verify the given JWT token:
    1. Extract the kid from the unverified header.
    2. Get the matching public key from the cached JWKS.
    3. Decode the token and verify the RS256 signature, issuer, audience, and expiration.
    4. Return the validated claims.
    """
    if not token:
        raise InvalidToken("Empty token supplied.")

    try:
        unverified_header = jwt.get_unverified_header(token)
    except Exception as e:
        raise InvalidToken(f"Invalid token structure: {str(e)}") from e

    kid = unverified_header.get("kid")
    if not kid:
        raise InvalidToken("Token is missing the 'kid' header.")

    domain = config.AUTH0_DOMAIN
    audience = config.AUTH0_AUDIENCE
    issuer = config.AUTH0_ISSUER

    if not domain or not audience or not issuer:
        raise InvalidToken("Auth0 server configuration (DOMAIN, AUDIENCE, ISSUER) is incomplete.")

    key_manager = get_key_manager()
    jwk_data = key_manager.get_public_key_data(kid)
    public_key = RSAAlgorithm.from_jwk(jwk_data)

    try:
        claims = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=audience,
            issuer=issuer,
            leeway=60,
            options={
                "verify_signature": True,
                "verify_aud": True,
                "verify_iss": True,
                "verify_exp": True,
            }
        )
        return claims
    except jwt.ExpiredSignatureError as e:
        raise ExpiredToken("The token has expired.") from e
    except jwt.InvalidAudienceError as e:
        raise InvalidAudience(f"Invalid audience: {str(e)}") from e
    except jwt.InvalidIssuerError as e:
        raise InvalidIssuer(f"Invalid issuer: {str(e)}") from e
    except jwt.InvalidTokenError as e:
        raise InvalidToken(f"Invalid token: {str(e)}") from e

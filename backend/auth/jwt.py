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
    2. If the token is a JWE (alg: dir) or opaque token (no kid), fall back to
       Auth0's /userinfo endpoint for validation.
    3. Otherwise, get the matching public key from the cached JWKS.
    4. Decode the token and verify the RS256 signature, issuer, audience, and expiration.
    5. Return the validated claims.
    """
    if not token:
        raise InvalidToken("Empty token supplied.")

    try:
        unverified_header = jwt.get_unverified_header(token)
    except Exception:
        # Token might be fully opaque (not even valid JWE/JWS structure)
        # Try the /userinfo fallback
        return _validate_via_userinfo(token)

    kid = unverified_header.get("kid")
    alg = unverified_header.get("alg", "")

    if not kid:
        import logging
        logger = logging.getLogger("auth")
        token_snippet = token[:20] + "..." if len(token) > 20 else token
        logger.warning(
            f"Token has no 'kid' header (alg={alg}). "
            f"Falling back to /userinfo validation | Token snippet: {token_snippet}"
        )
        # JWE or opaque token — validate via Auth0's /userinfo endpoint
        return _validate_via_userinfo(token)

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


# Simple thread-safe in-memory cache for /userinfo validation results to avoid Auth0 429 Rate Limits
_userinfo_cache: Dict[str, tuple[float, Dict[str, Any]]] = {}
_cache_lock = threading.Lock()
_CACHE_TTL = 300.0  # 5 minutes

def _validate_via_userinfo(token: str) -> Dict[str, Any]:
    """
    Validate an opaque or JWE token by calling Auth0's /userinfo endpoint.
    
    Auth0 can decrypt/validate its own tokens and returns user profile claims.
    This is the standard way to handle opaque access tokens issued by Auth0
    when the audience parameter is not matched during the OAuth flow.
    """
    import logging
    logger = logging.getLogger("auth")

    # Check cache first
    now = time.time()
    with _cache_lock:
        if token in _userinfo_cache:
            cache_time, claims = _userinfo_cache[token]
            if now - cache_time < _CACHE_TTL:
                logger.debug("Token validation cache hit")
                return claims
            else:
                # Clean up expired item
                del _userinfo_cache[token]

    domain = config.AUTH0_DOMAIN
    if not domain:
        raise InvalidToken("AUTH0_DOMAIN is not configured on the server.")

    userinfo_url = f"https://{domain}/userinfo"

    try:
        response = httpx.get(
            userinfo_url,
            headers={"Authorization": f"Bearer {token}"},
            timeout=10.0,
        )
    except Exception as e:
        raise InvalidToken(f"Failed to reach Auth0 /userinfo endpoint: {str(e)}") from e

    if response.status_code == 429:
        # If we hit a rate limit, check if we have a stale cache entry we can fallback to
        with _cache_lock:
            if token in _userinfo_cache:
                logger.warning("Auth0 returned 429 Rate Limit. Falling back to stale cached userinfo.")
                return _userinfo_cache[token][1]
        raise InvalidToken("Auth0 returned 429 Too Many Requests from /userinfo. Rate limit exceeded.")

    if response.status_code == 401:
        raise InvalidToken("Auth0 rejected the token (401 from /userinfo). Token may be expired or invalid.")
    if response.status_code == 403:
        raise InvalidToken("Auth0 returned 403 from /userinfo. Insufficient scopes.")
    if response.status_code != 200:
        raise InvalidToken(f"Auth0 /userinfo returned unexpected status {response.status_code}.")

    userinfo = response.json()
    logger.info(f"Token validated via /userinfo | sub: {userinfo.get('sub')}")

    # Map /userinfo response to the same claims format as a decoded JWT
    claims = {
        "sub": userinfo.get("sub"),
        "email": userinfo.get("email"),
        "name": userinfo.get("name") or userinfo.get("nickname"),
        "nickname": userinfo.get("nickname"),
        "picture": userinfo.get("picture"),
        "email_verified": userinfo.get("email_verified"),
        "iss": f"https://{domain}/",
    }

    # Store in cache
    with _cache_lock:
        _userinfo_cache[token] = (now, claims)

    return claims



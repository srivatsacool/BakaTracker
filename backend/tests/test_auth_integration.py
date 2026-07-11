import os
import sys
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

# Align Python paths so main and config match the runtime sys.modules namespaces
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from config import config as config
from auth.exceptions import (
    ExpiredToken,
    InvalidAudience,
    InvalidIssuer,
    ForbiddenUser,
    InvalidToken,
)

@pytest.fixture
def client():
    return TestClient(app)

def test_legacy_auth_success(client):
    """Test legacy authentication with a valid token."""
    with patch.object(config, "AUTH_MODE", "legacy"), \
         patch.object(config, "AUTH_TOKEN", "legacy_secret_token"):
        response = client.get("/metrics", headers={"Authorization": "Bearer legacy_secret_token"})
        assert response.status_code == 200
        assert isinstance(response.json(), dict)

def test_legacy_auth_failure(client):
    """Test legacy authentication with an invalid token."""
    with patch.object(config, "AUTH_MODE", "legacy"), \
         patch.object(config, "AUTH_TOKEN", "legacy_secret_token"):
        response = client.get("/metrics", headers={"Authorization": "Bearer bad_token"})
        assert response.status_code == 401
        assert response.json() == {"detail": "Unauthorized"}

def test_jwt_auth_missing_header(client):
    """Test JWT authentication with a missing Authorization header."""
    with patch.object(config, "AUTH_MODE", "jwt"):
        response = client.get("/metrics")
        assert response.status_code == 401
        assert "Missing Authorization header" in response.json()["detail"]

def test_jwt_auth_invalid_header_format(client):
    """Test JWT authentication with an invalid Authorization header format."""
    with patch.object(config, "AUTH_MODE", "jwt"):
        response = client.get("/metrics", headers={"Authorization": "invalid_format"})
        assert response.status_code == 401
        assert "Expected Format: Bearer" in response.json()["detail"]

@patch("core.security.verify_jwt")
def test_jwt_auth_expired_token(mock_verify, client):
    """Test JWT authentication with an expired token."""
    mock_verify.side_effect = ExpiredToken("The token has expired.")
    with patch.object(config, "AUTH_MODE", "jwt"):
        response = client.get("/metrics", headers={"Authorization": "Bearer some_token"})
        assert response.status_code == 401
        assert "The token has expired" in response.json()["detail"]

@patch("core.security.verify_jwt")
def test_jwt_auth_invalid_audience(mock_verify, client):
    """Test JWT authentication with a wrong audience."""
    mock_verify.side_effect = InvalidAudience("Invalid audience.")
    with patch.object(config, "AUTH_MODE", "jwt"):
        response = client.get("/metrics", headers={"Authorization": "Bearer some_token"})
        assert response.status_code == 401
        assert "Invalid audience" in response.json()["detail"]

@patch("core.security.verify_jwt")
def test_jwt_auth_invalid_issuer(mock_verify, client):
    """Test JWT authentication with a wrong issuer."""
    mock_verify.side_effect = InvalidIssuer("Invalid issuer.")
    with patch.object(config, "AUTH_MODE", "jwt"):
        response = client.get("/metrics", headers={"Authorization": "Bearer some_token"})
        assert response.status_code == 401
        assert "Invalid issuer" in response.json()["detail"]

@patch("core.security.verify_jwt")
def test_jwt_auth_wrong_owner_email(mock_verify, client):
    """Test JWT authentication with a wrong owner email."""
    mock_verify.return_value = {
        "sub": "auth0|12345",
        "email": "intruder@example.com",
        "name": "Intruder"
    }
    with patch.object(config, "AUTH_MODE", "jwt"), \
         patch.object(config, "OWNER_EMAIL", "owner@example.com"):
        response = client.get("/metrics", headers={"Authorization": "Bearer some_token"})
        assert response.status_code == 403
        assert "is not authorized" in response.json()["detail"].lower()

@patch("core.security.verify_jwt")
def test_jwt_auth_success(mock_verify, client):
    """Test JWT authentication with successful owner validation."""
    mock_verify.return_value = {
        "sub": "auth0|owner_id",
        "email": "owner@example.com",
        "name": "Owner User"
    }
    with patch.object(config, "AUTH_MODE", "jwt"), \
         patch.object(config, "OWNER_EMAIL", "owner@example.com"):
        response = client.get("/metrics", headers={"Authorization": "Bearer some_token"})
        assert response.status_code == 200
        assert isinstance(response.json(), dict)

def test_jwt_auth_options_bypass(client):
    """Test that OPTIONS requests bypass JWT authentication completely (CORS preflight)."""
    with patch.object(config, "AUTH_MODE", "jwt"):
        response = client.options("/metrics")
        assert response.status_code != 401

@patch("core.security.verify_jwt")
def test_jwt_auth_multiple_spaces(mock_verify, client):
    """Test JWT authentication handles multiple spaces in Authorization header."""
    mock_verify.return_value = {
        "sub": "auth0|owner_id",
        "email": "owner@example.com",
        "name": "Owner User"
    }
    with patch.object(config, "AUTH_MODE", "jwt"), \
         patch.object(config, "OWNER_EMAIL", "owner@example.com"):
        response = client.get("/metrics", headers={"Authorization": "Bearer   some_token"})
        assert response.status_code == 200

@patch("core.security.verify_jwt")
def test_jwt_auth_missing_email(mock_verify, client):
    """Test JWT authentication fails if the email claim is missing."""
    mock_verify.return_value = {
        "sub": "auth0|owner_id",
        "name": "Owner User"
    }
    with patch.object(config, "AUTH_MODE", "jwt"), \
         patch.object(config, "OWNER_EMAIL", "owner@example.com"):
        response = client.get("/metrics", headers={"Authorization": "Bearer some_token"})
        assert response.status_code == 401
        assert "payload is missing an 'email' claim" in response.json()["detail"]

@patch("core.security.verify_jwt")
def test_jwt_auth_missing_sub(mock_verify, client):
    """Test JWT authentication fails if the sub (user ID) claim is missing."""
    mock_verify.return_value = {
        "email": "owner@example.com",
        "name": "Owner User"
    }
    with patch.object(config, "AUTH_MODE", "jwt"), \
         patch.object(config, "OWNER_EMAIL", "owner@example.com"):
        response = client.get("/metrics", headers={"Authorization": "Bearer some_token"})
        assert response.status_code == 401
        assert "payload is missing a 'sub' claim" in response.json()["detail"]

@patch("core.security.verify_jwt")
def test_jwt_auth_success_no_pii_logged(mock_verify, client, caplog):
    """Test JWT authentication logs success without leaking plain user emails."""
    import logging
    mock_verify.return_value = {
        "sub": "auth0|owner_id",
        "email": "owner@example.com",
        "name": "Owner User"
    }
    with patch.object(config, "AUTH_MODE", "jwt"), \
         patch.object(config, "OWNER_EMAIL", "owner@example.com"), \
         caplog.at_level(logging.INFO):
        response = client.get("/metrics", headers={"Authorization": "Bearer some_token"})
        assert response.status_code == 200
        
        # Verify success log was written but does not contain the email address
        success_log_found = False
        for record in caplog.records:
            if "Authentication success" in record.message:
                success_log_found = True
                assert "owner@example.com" not in record.message
                assert "auth0|owner_id" in record.message
        assert success_log_found

def test_startup_validation_missing_domain():
    """Test that app lifespan fails to start when AUTH0_DOMAIN is missing in jwt mode."""
    with patch.object(config, "AUTH_MODE", "jwt"), \
         patch.object(config, "AUTH0_DOMAIN", ""), \
         patch.object(config, "OWNER_EMAIL", "owner@example.com"), \
         patch.object(config, "AUTH0_AUDIENCE", "api_audience"), \
         patch.object(config, "AUTH0_ISSUER", "https://issuer.auth0.com/"), \
         patch.object(config, "AUTH0_CLIENT_ID", "client_id"):
        with pytest.raises(ValueError) as excinfo:
            with TestClient(app):
                pass
        assert "AUTH0_DOMAIN must be configured" in str(excinfo.value)

def test_startup_validation_missing_owner_email():
    """Test that app lifespan fails to start when OWNER_EMAIL is missing in jwt mode."""
    with patch.object(config, "AUTH_MODE", "jwt"), \
         patch.object(config, "AUTH0_DOMAIN", "tenant.auth0.com"), \
         patch.object(config, "OWNER_EMAIL", ""), \
         patch.object(config, "AUTH0_AUDIENCE", "api_audience"), \
         patch.object(config, "AUTH0_ISSUER", "https://issuer.auth0.com/"), \
         patch.object(config, "AUTH0_CLIENT_ID", "client_id"):
        with pytest.raises(ValueError) as excinfo:
            with TestClient(app):
                pass
        assert "OWNER_EMAIL must be configured" in str(excinfo.value)

def test_startup_validation_missing_client_id():
    """Test that app lifespan fails to start when AUTH0_CLIENT_ID is missing in jwt mode."""
    with patch.object(config, "AUTH_MODE", "jwt"), \
         patch.object(config, "AUTH0_DOMAIN", "tenant.auth0.com"), \
         patch.object(config, "OWNER_EMAIL", "owner@example.com"), \
         patch.object(config, "AUTH0_AUDIENCE", "api_audience"), \
         patch.object(config, "AUTH0_ISSUER", "https://issuer.auth0.com/"), \
         patch.object(config, "AUTH0_CLIENT_ID", ""):
        with pytest.raises(ValueError) as excinfo:
            with TestClient(app):
                pass
        assert "AUTH0_CLIENT_ID must be configured" in str(excinfo.value)

def test_startup_validation_invalid_auth_mode():
    """Test that app lifespan fails to start when AUTH_MODE is invalid."""
    with patch.object(config, "AUTH_MODE", "invalid_mode"):
        with pytest.raises(ValueError) as excinfo:
            with TestClient(app):
                pass
        assert "Invalid AUTH_MODE" in str(excinfo.value)

def test_startup_validation_success():
    """Test that app lifespan starts successfully with a valid JWT configuration."""
    with patch.object(config, "AUTH_MODE", "jwt"), \
         patch("main.client.fetch_db") as mock_fetch, \
         patch.object(config, "AUTH0_DOMAIN", "tenant.auth0.com"), \
         patch.object(config, "OWNER_EMAIL", "owner@example.com"), \
         patch.object(config, "AUTH0_AUDIENCE", "api_audience"), \
         patch.object(config, "AUTH0_ISSUER", "https://issuer.auth0.com/"), \
         patch.object(config, "AUTH0_CLIENT_ID", "client_id"):
        with TestClient(app) as test_client:
            assert test_client.get("/health").status_code == 200

def test_mcp_auth_jwt_missing_header(client):
    """Test that /mcp/sse requires authentication under JWT mode."""
    with patch.object(config, "AUTH_MODE", "jwt"):
        response = client.get("/mcp/sse")
        assert response.status_code == 401

def test_mcp_auth_legacy_missing_header(client):
    """Test that /mcp/sse requires authentication under Legacy mode."""
    with patch.object(config, "AUTH_MODE", "legacy"), \
         patch.object(config, "AUTH_TOKEN", "secret_token"):
        response = client.get("/mcp/sse")
        assert response.status_code == 401

def test_sheets_client_propagates_user_context(client):
    """Test that SheetsClient fetch_db captures and propagates the user context as headers."""
    from unittest.mock import MagicMock
    from services.sheets_client import client as sheets_client
    from auth import context
    from auth.models import AuthenticatedUser
    
    dummy_user = AuthenticatedUser(
        id="auth0|test_propagated_id",
        email="test_user@example.com",
        name="Propagated User",
        provider="auth0"
    )
    
    with patch.object(sheets_client, "_execute_with_retry") as mock_execute:
        # Mock successful response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "success", "data": {"habits": []}}
        mock_execute.return_value = mock_response
        
        # Manually set the context variables
        context.current_user.set(dummy_user)
        context.auth_mode.set("jwt")
        
        try:
            # Call fetch_db
            sheets_client.fetch_db()
            
            # Assert that _execute_with_retry was called with the context headers!
            assert mock_execute.call_count == 1
            call_kwargs = mock_execute.call_args[1]
            headers = call_kwargs.get("headers", {})
            assert headers.get("X-Authenticated-User-Id") == "auth0|test_propagated_id"
            assert headers.get("X-Authenticated-User-Email") == "test_user@example.com"
            assert headers.get("X-Authenticated-User-Provider") == "auth0"
            assert headers.get("X-Authenticated-User-Auth-Mode") == "jwt"
        finally:
            # Clean up context
            context.current_user.set(None)
            context.auth_mode.set(None)


def test_oauth_discovery_endpoints(client):
    """Test that discovery endpoints return standard metadata based on Auth0 configuration."""
    with patch.object(config, "AUTH0_DOMAIN", "tenant.auth0.com"), \
         patch.object(config, "AUTH0_ISSUER", "https://issuer.auth0.com/"), \
         patch.object(config, "AUTH0_AUDIENCE", "api_audience"), \
         patch.object(config, "AUTH0_CLIENT_ID", "client_id"):
        # Test /.well-known/openid-configuration
        response = client.get("/.well-known/openid-configuration")
        assert response.status_code == 200
        data = response.json()
        assert data["issuer"] == "https://issuer.auth0.com/"
        assert data["authorization_endpoint"] == "https://tenant.auth0.com/authorize"
        assert data["token_endpoint"] == "https://tenant.auth0.com/oauth/token"
        assert data["jwks_uri"] == "https://tenant.auth0.com/.well-known/jwks.json"
        assert data["client_id"] == "client_id"
        assert data["audience"] == "api_audience"

        # Test /.well-known/oauth-authorization-server
        response_auth_server = client.get("/.well-known/oauth-authorization-server")
        assert response_auth_server.status_code == 200
        assert response_auth_server.json() == data


def test_options_cors_preflight(client):
    """Test that OPTIONS requests to endpoints return CORS headers and succeed."""
    response = client.options(
        "/.well-known/oauth-authorization-server",
        headers={
            "Origin": "https://example.com",
            "Access-Control-Request-Method": "GET"
        }
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "*"
    assert "access-control-allow-methods" in response.headers


def test_public_endpoints(client):
    """Test that public endpoints do not require authentication."""
    # Under JWT mode
    with patch.object(config, "AUTH_MODE", "jwt"):
        assert client.get("/").status_code == 200
        assert client.get("/health").status_code == 200
        assert client.get("/version").status_code == 200
        assert client.get("/info").status_code == 200
        assert client.get("/routes").status_code == 200




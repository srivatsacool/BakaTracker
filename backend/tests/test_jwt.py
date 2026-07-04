import sys
import os

# Align Python path to locate BakaTracker packages
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# pyrefly: ignore [missing-import]
from backend.auth.jwt import verify_jwt
# pyrefly: ignore [missing-import]
from backend.auth.exceptions import AuthError
# pyrefly: ignore [missing-import]
from backend.config import config

def main():
    if len(sys.argv) < 2:
        print("Usage: python -m backend.tests.test_jwt <JWT_TOKEN>")
        print("\nEnsure the following environment variables are set in backend/.env:")
        print(f"  AUTH0_DOMAIN:   {config.AUTH0_DOMAIN or '(Not Set)'}")
        print(f"  AUTH0_AUDIENCE: {config.AUTH0_AUDIENCE or '(Not Set)'}")
        print(f"  AUTH0_ISSUER:   {config.AUTH0_ISSUER or '(Not Set)'}")
        print("Paste your JWT token below:")
        token = input("> ").strip()
    else:
        token = sys.argv[1]

    try:
        claims = verify_jwt(token)
        print("Verified")
        print("\nDecoded Claims:")
        for key, value in claims.items():
            print(f"  {key}: {value}")
    except AuthError as e:
        print(f"Invalid: {e.__class__.__name__} - {str(e)}")
        sys.exit(2)
    except Exception as e:
        print(f"Invalid: UnexpectedError - {str(e)}")
        sys.exit(3)

if __name__ == "__main__":
    main()

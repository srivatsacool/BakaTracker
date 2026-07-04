from backend.config import config
from backend.auth.exceptions import ForbiddenUser

def verify_owner(email: str) -> None:
    """
    Verify if the email matches the OWNER_EMAIL configuration.
    Raises ForbiddenUser if it does not.
    """
    owner_email = config.OWNER_EMAIL
    if not owner_email:
        raise ForbiddenUser("OWNER_EMAIL configuration is missing on the server.")
        
    if email.casefold() != owner_email.casefold():
        raise ForbiddenUser("User email is not authorized to access BakaTracker.")

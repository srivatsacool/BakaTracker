import random
from typing import Dict, Any, List
from services.sheets_client import client

def get_quotes() -> List[Dict[str, Any]]:
    """
    Returns the list of all inspirational quotes.
    """
    db = client.fetch_db()
    return db.get("quotes", [])

def get_random_quote() -> Dict[str, Any]:
    """
    Fetches a random active inspirational quote.
    """
    quotes = get_quotes()
    active_quotes = [q for q in quotes if q.get("active") is True or q.get("active") == "true"]
    
    if not active_quotes:
        # Fallback to any quote
        active_quotes = quotes
        
    if not active_quotes:
        return {
            "id": "q_default",
            "quote": "Consistency is the key to mastery.",
            "author": "Anonymous",
            "category": "Discipline",
            "active": True
        }
        
    return random.choice(active_quotes)

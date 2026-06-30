from typing import Optional, Dict, Any, List
from services.sheets_client import client

def get_events(source: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Returns all logged events, optionally filtered by source ('habit', 'task', 'journal', 'system').
    """
    db = client.fetch_db()
    events = db.get("events", [])
    
    if source:
        events = [e for e in events if e.get("source") == source]
        
    # Sort events by timestamp descending
    try:
        events.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    except Exception:
        pass
        
    return events

def get_recent_events(limit: Optional[int] = 15) -> List[Dict[str, Any]]:
    """
    Returns the most recent events up to the specified limit.
    """
    events = get_events()
    return events[:limit]

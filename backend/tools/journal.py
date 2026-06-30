import uuid
from datetime import datetime, date as dt_date
from typing import Optional, Dict, Any, List
from services.sheets_client import client

def get_journal_entries() -> List[Dict[str, Any]]:
    """
    Returns all daily reflections / journal entries.
    """
    db = client.fetch_db()
    return db.get("journal", [])

def save_journal_entry(
    date: str,
    highlight: str,
    notes: Optional[str] = "",
    mood: Optional[str] = "",
    quote_id: Optional[str] = "q1"
) -> str:
    """
    Creates or updates a daily journal reflection. Awards 10 XP in discipline.
    """
    db = client.fetch_db()
    journal = db.get("journal", [])
    events = db.get("events", [])
    
    existing = next((j for j in journal if j.get("date") == date), None)
    now_iso = datetime.utcnow().isoformat() + "Z"
    
    if existing:
        entry_id = existing.get("id")
        existing["highlight"] = highlight
        existing["notes"] = notes
        existing["mood"] = mood
        existing["quote_id"] = quote_id
        existing["updated_at"] = now_iso
        status = f"Successfully updated journal entry for {date}."
    else:
        entry_id = f"journal_{uuid.uuid4().hex[:8]}"
        new_entry = {
            "id": entry_id,
            "date": date,
            "highlight": highlight,
            "notes": notes,
            "mood": mood,
            "quote_id": quote_id,
            "created_at": now_iso,
            "updated_at": now_iso
        }
        journal.append(new_entry)
        status = f"Successfully created journal entry for {date}."
        
    # Manage Event (if highlight is present, add journal_created event, else remove it)
    events = [e for e in events if not (e.get("entity_id") == entry_id and e.get("type") == "journal_created")]
    
    if highlight and highlight.strip():
        events.append({
            "id": f"evt_{uuid.uuid4().hex[:8]}",
            "type": "journal_created",
            "source": "journal",
            "entity": "Daily Reflection Logged",
            "entity_id": entry_id,
            "xp": 10.0,
            "stat": "discipline",
            "metadata": "",
            "timestamp": f"{date}T12:00:00Z"
        })
        
    db["journal"] = journal
    db["events"] = events
    client.save_db(db)
    return status

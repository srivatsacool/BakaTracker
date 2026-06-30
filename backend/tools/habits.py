import uuid
from datetime import date as dt_date, datetime
from typing import Optional, Union, Dict, Any, List
from services.sheets_client import client

def get_habits() -> List[Dict[str, Any]]:
    """
    Returns the list of all defined habits.
    """
    db = client.fetch_db()
    return db.get("habits", [])

def get_habit_logs(date: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Returns the logs of all completed habits for a specific date (YYYY-MM-DD). Defaults to today.
    """
    if not date:
        date = dt_date.today().isoformat()
    db = client.fetch_db()
    logs = db.get("habitLogs", [])
    return [log for log in logs if log.get("date") == date]

def log_habit(habit_id: str, date: Optional[str] = None) -> str:
    """
    Toggles completion of a checkbox habit for a given date (YYYY-MM-DD). Defaults to today.
    """
    if not date:
        date = dt_date.today().isoformat()
        
    db = client.fetch_db()
    habits = db.get("habits", [])
    logs = db.get("habitLogs", [])
    events = db.get("events", [])
    
    habit = next((h for h in habits if h.get("id") == habit_id), None)
    if not habit:
        return f"Error: Habit with ID '{habit_id}' not found."
        
    # Check if a log already exists for this habit and date
    existing_index = next((i for i, log in enumerate(logs) if log.get("habit_id") == habit_id and log.get("date") == date), None)
    
    if existing_index is not None:
        # Uncheck / Remove
        logs.pop(existing_index)
        # Filter out event
        events = [e for e in events if not (e.get("entity_id") == habit_id and e.get("timestamp", "").startswith(date))]
        db["habitLogs"] = logs
        db["events"] = events
        client.save_db(db)
        return f"Successfully unchecked habit '{habit.get('name')}' for {date}."
    else:
        # Check / Complete
        log_id = f"log_{uuid.uuid4().hex[:8]}"
        xp_earned = habit.get("xp", 0)
        logs.append({
            "id": log_id,
            "date": date,
            "habit_id": habit_id,
            "value": 1,
            "xp_earned": xp_earned,
            "created_at": datetime.utcnow().isoformat() + "Z"
        })
        events.append({
            "id": f"evt_{uuid.uuid4().hex[:8]}",
            "type": "habit_completed",
            "source": "habit",
            "entity": habit.get("name"),
            "entity_id": habit_id,
            "xp": xp_earned,
            "stat": habit.get("stat"),
            "metadata": "",
            "timestamp": f"{date}T12:00:00Z"
        })
        db["habitLogs"] = logs
        db["events"] = events
        client.save_db(db)
        return f"Successfully completed habit '{habit.get('name')}' for {date} (Earned {xp_earned} XP)."

def increment_habit(habit_id: str, amount: float, date: Optional[str] = None) -> str:
    """
    Increments a counter habit by a specified amount for a given date (YYYY-MM-DD). Defaults to today.
    """
    if not date:
        date = dt_date.today().isoformat()
        
    db = client.fetch_db()
    habits = db.get("habits", [])
    logs = db.get("habitLogs", [])
    events = db.get("events", [])
    
    habit = next((h for h in habits if h.get("id") == habit_id), None)
    if not habit:
        return f"Error: Habit with ID '{habit_id}' not found."
        
    existing = next((log for log in logs if log.get("habit_id") == habit_id and log.get("date") == date), None)
    
    xp_factor = habit.get("xp", 0)
    if existing:
        current_val = float(existing.get("value", 0))
        new_val = max(0.0, current_val + amount)
        if new_val == 0:
            logs.remove(existing)
            events = [e for e in events if not (e.get("entity_id") == habit_id and e.get("timestamp", "").startswith(date))]
            status = f"Successfully reset habit '{habit.get('name')}' for {date}."
        else:
            existing["value"] = new_val
            existing["xp_earned"] = new_val * xp_factor
            # Update event
            events = [e for e in events if not (e.get("entity_id") == habit_id and e.get("timestamp", "").startswith(date))]
            events.append({
                "id": f"evt_{uuid.uuid4().hex[:8]}",
                "type": "habit_completed",
                "source": "habit",
                "entity": habit.get("name"),
                "entity_id": habit_id,
                "xp": new_val * xp_factor,
                "stat": habit.get("stat"),
                "metadata": f'{{"value": {new_val}}}',
                "timestamp": f"{date}T12:00:00Z"
            })
            status = f"Successfully updated habit '{habit.get('name')}' value to {new_val} for {date}."
    else:
        if amount > 0:
            log_id = f"log_{uuid.uuid4().hex[:8]}"
            logs.append({
                "id": log_id,
                "date": date,
                "habit_id": habit_id,
                "value": amount,
                "xp_earned": amount * xp_factor,
                "created_at": datetime.utcnow().isoformat() + "Z"
            })
            events.append({
                "id": f"evt_{uuid.uuid4().hex[:8]}",
                "type": "habit_completed",
                "source": "habit",
                "entity": habit.get("name"),
                "entity_id": habit_id,
                "xp": amount * xp_factor,
                "stat": habit.get("stat"),
                "metadata": f'{{"value": {amount}}}',
                "timestamp": f"{date}T12:00:00Z"
            })
            status = f"Successfully completed habit '{habit.get('name')}' with value {amount} for {date}."
        else:
            status = f"Habit '{habit.get('name')}' was not logged since increment is zero/negative."

    db["habitLogs"] = logs
    db["events"] = events
    client.save_db(db)
    return status

def set_habit_value(habit_id: str, value: Union[int, float, str], date: Optional[str] = None) -> str:
    """
    Sets a habit value (numeric, mood string, or energy string) for a given date (YYYY-MM-DD). Defaults to today.
    """
    if not date:
        date = dt_date.today().isoformat()
        
    db = client.fetch_db()
    habits = db.get("habits", [])
    logs = db.get("habitLogs", [])
    events = db.get("events", [])
    
    habit = next((h for h in habits if h.get("id") == habit_id), None)
    if not habit:
        return f"Error: Habit with ID '{habit_id}' not found."
        
    existing = next((log for log in logs if log.get("habit_id") == habit_id and log.get("date") == date), None)
    xp_earned = habit.get("xp", 0)
    
    if not value:
        # If value is empty/falsy, remove the entry
        if existing:
            logs.remove(existing)
            events = [e for e in events if not (e.get("entity_id") == habit_id and e.get("timestamp", "").startswith(date))]
        status = f"Successfully cleared habit '{habit.get('name')}' value for {date}."
    else:
        # Update or create
        if existing:
            existing["value"] = value
            existing["xp_earned"] = xp_earned
        else:
            log_id = f"log_{uuid.uuid4().hex[:8]}"
            logs.append({
                "id": log_id,
                "date": date,
                "habit_id": habit_id,
                "value": value,
                "xp_earned": xp_earned,
                "created_at": datetime.utcnow().isoformat() + "Z"
            })
            
        events = [e for e in events if not (e.get("entity_id") == habit_id and e.get("timestamp", "").startswith(date))]
        events.append({
            "id": f"evt_{uuid.uuid4().hex[:8]}",
            "type": "habit_completed",
            "source": "habit",
            "entity": habit.get("name"),
            "entity_id": habit_id,
            "xp": xp_earned,
            "stat": habit.get("stat"),
            "metadata": f'{{"value": "{value}"}}',
            "timestamp": f"{date}T12:00:00Z"
        })
        status = f"Successfully set habit '{habit.get('name')}' to '{value}' for {date}."
        
    db["habitLogs"] = logs
    db["events"] = events
    client.save_db(db)
    return status

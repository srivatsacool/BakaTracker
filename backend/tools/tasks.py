import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from services.sheets_client import client

def area_to_stat(area: str) -> str:
    mapping = {
        "health": "health",
        "career": "career",
        "learning": "knowledge",
        "personal": "discipline",
        "creativity": "creativity"
    }
    return mapping.get(area, "discipline")

def get_tasks() -> List[Dict[str, Any]]:
    """
    Returns all tasks in the system.
    """
    db = client.fetch_db()
    return db.get("tasks", [])

def get_today_tasks() -> List[Dict[str, Any]]:
    """
    Returns all tasks scheduled for 'Today'.
    """
    tasks = get_tasks()
    # Filter for today flag. Sheets stores booleans as 'true'/'false' or True/False
    return [t for t in tasks if t.get("today") is True or t.get("today") == "true"]

def create_task(
    title: str,
    notes: Optional[str] = "",
    area: Optional[str] = "personal",
    xp: Optional[int] = 10,
    today: Optional[bool] = False,
    due_date: Optional[str] = ""
) -> str:
    """
    Creates a new task. Areas are: 'health', 'career', 'learning', 'personal', 'creativity'.
    """
    db = client.fetch_db()
    tasks = db.get("tasks", [])
    
    task_id = f"task_{uuid.uuid4().hex[:8]}"
    now_iso = datetime.utcnow().isoformat() + "Z"
    
    new_task = {
        "id": task_id,
        "title": title,
        "notes": notes,
        "area": area,
        "status": "todo",
        "today": today,
        "due_date": due_date,
        "xp": xp,
        "created_at": now_iso,
        "updated_at": now_iso,
        "completed_at": ""
    }
    
    tasks.append(new_task)
    db["tasks"] = tasks
    client.save_db(db)
    return f"Successfully created task '{title}' with ID '{task_id}'."

def update_task(
    task_id: str,
    title: Optional[str] = None,
    notes: Optional[str] = None,
    area: Optional[str] = None,
    status: Optional[str] = None,
    today: Optional[bool] = None,
    due_date: Optional[str] = None
) -> str:
    """
    Updates fields on an existing task. Handles event creation/removal if completed.
    """
    db = client.fetch_db()
    tasks = db.get("tasks", [])
    events = db.get("events", [])
    
    task = next((t for t in tasks if t.get("id") == task_id), None)
    if not task:
        return f"Error: Task with ID '{task_id}' not found."
        
    old_status = task.get("status")
    
    if title is not None:
        task["title"] = title
    if notes is not None:
        task["notes"] = notes
    if area is not None:
        task["area"] = area
    if today is not None:
        # Convert bool to sheet standard boolean
        task["today"] = today
    if due_date is not None:
        task["due_date"] = due_date
        
    now_iso = datetime.utcnow().isoformat() + "Z"
    task["updated_at"] = now_iso
    
    if status is not None:
        task["status"] = status
        # Transitioning to 'done'
        if status == "done" and old_status != "done":
            task["completed_at"] = now_iso
            # If it's a today's quest, add event
            is_today = task.get("today") is True or task.get("today") == "true"
            if is_today:
                events.append({
                    "id": f"evt_{uuid.uuid4().hex[:8]}",
                    "type": "task_completed",
                    "source": "task",
                    "entity": task.get("title"),
                    "entity_id": task_id,
                    "xp": float(task.get("xp", 10)),
                    "stat": area_to_stat(task.get("area", "personal")),
                    "metadata": f'{{"area": "{task.get("area")}"}}',
                    "timestamp": now_iso
                })
        # Transitioning away from 'done'
        elif old_status == "done" and status != "done":
            task["completed_at"] = ""
            events = [e for e in events if not (e.get("entity_id") == task_id and e.get("type") == "task_completed")]
            
    db["tasks"] = tasks
    db["events"] = events
    client.save_db(db)
    return f"Successfully updated task '{task.get('title')}'."

def delete_task(task_id: str) -> str:
    """
    Deletes a task and removes its completed events.
    """
    db = client.fetch_db()
    tasks = db.get("tasks", [])
    events = db.get("events", [])
    
    task = next((t for t in tasks if t.get("id") == task_id), None)
    if not task:
        return f"Error: Task with ID '{task_id}' not found."
        
    tasks.remove(task)
    events = [e for e in events if e.get("entity_id") != task_id or e.get("type") != "task_completed"]
    
    db["tasks"] = tasks
    db["events"] = events
    client.save_db(db)
    return f"Successfully deleted task '{task.get('title')}'."

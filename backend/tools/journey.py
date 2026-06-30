from datetime import date as dt_date, datetime, timedelta
from typing import Optional, Dict, Any, List
from services.sheets_client import client
from tools.tasks import area_to_stat

def get_character_sheet() -> Dict[str, Any]:
    """
    Retrieves the pre-computed Character sheet stats (level, total XP, stats).
    """
    db = client.fetch_db()
    char_list = db.get("character", [])
    if char_list:
        return char_list[0]
    return {
        "id": "char_1",
        "level": 1,
        "total_xp": 0.0,
        "discipline": 0.0,
        "health": 0.0,
        "knowledge": 0.0,
        "creativity": 0.0,
        "career": 0.0,
        "title": "Novice Adventurer",
        "updated_at": datetime.utcnow().isoformat() + "Z"
    }

def get_weekly_stats() -> List[Dict[str, Any]]:
    """
    Retrieves the historical pre-computed weekly XP growth records.
    """
    db = client.fetch_db()
    return db.get("weeklyStats", [])

def is_habit_completed(habit: Dict[str, Any], log: Optional[Dict[str, Any]]) -> bool:
    if not log:
        return False
    h_type = habit.get("type")
    val = log.get("value")
    if h_type == "checkbox":
        return val == 1 or val == "1" or val == "true" or val is True
    if h_type in ("counter", "numeric"):
        try:
            return float(val) > 0
        except (ValueError, TypeError):
            return False
    if h_type in ("mood", "energy"):
        return val is not None and val != ""
    return False

def get_day_summary(date: Optional[str] = None) -> Dict[str, Any]:
    """
    Aggregates daily completion percentage and scores for habits, tasks, and journals.
    """
    if not date:
        date = dt_date.today().isoformat()
        
    db = client.fetch_db()
    habits = db.get("habits", [])
    logs = db.get("habitLogs", [])
    tasks = db.get("tasks", [])
    journal = db.get("journal", [])
    
    active_habits = [h for h in habits if h.get("active") is True or h.get("active") == "true"]
    logs_today = [l for l in logs if l.get("date") == date]
    
    # 1. Habits completion
    completed_habits_count = 0
    habits_list = []
    if active_habits:
        for h in active_habits:
            h_id = h.get("id")
            log = next((l for l in logs_today if l.get("habit_id") == h_id), None)
            done = is_habit_completed(h, log)
            if done:
                completed_habits_count += 1
            habits_list.append({
                "id": h_id,
                "name": h.get("name"),
                "completed": done,
                "value": log.get("value") if log else None
            })
        habit_score = (completed_habits_count / len(active_habits)) * 100
    else:
        habit_score = 100.0
        
    # 2. Today's Tasks completion
    # A today task has today = True or "true"
    today_tasks = [t for t in tasks if t.get("today") is True or t.get("today") == "true"]
    completed_tasks_count = 0
    tasks_list = []
    if today_tasks:
        for t in today_tasks:
            done = t.get("status") == "done"
            if done:
                completed_tasks_count += 1
            tasks_list.append({
                "id": t.get("id"),
                "title": t.get("title"),
                "status": t.get("status"),
                "completed": done
            })
        task_score = (completed_tasks_count / len(today_tasks)) * 100
    else:
        task_score = 100.0
        
    # 3. Journal completion
    journal_entry = next((j for j in journal if j.get("date") == date), None)
    journal_written = bool(journal_entry and journal_entry.get("highlight", "").strip())
    journal_score = 100.0 if journal_written else 0.0
    
    # Calculate weighted final score
    final_score = (habit_score * 0.5) + (task_score * 0.4) + (journal_score * 0.1)
    
    return {
        "date": date,
        "daily_score": round(final_score),
        "habits": {
            "completed": completed_habits_count,
            "total": len(active_habits),
            "score": round(habit_score),
            "list": habits_list
        },
        "tasks": {
            "completed": completed_tasks_count,
            "total": len(today_tasks),
            "score": round(task_score),
            "list": tasks_list
        },
        "journal": {
            "written": journal_written,
            "highlight": journal_entry.get("highlight") if journal_entry else None,
            "score": round(journal_score)
        }
    }

def get_weekly_wins() -> List[str]:
    """
    Compiles a human-readable list of milestones and wins completed during the current week.
    """
    db = client.fetch_db()
    events = db.get("events", [])
    
    # Determine the start of the week (Monday)
    today = dt_date.today()
    monday = today - timedelta(days=today.weekday())
    monday_str = f"{monday.isoformat()}T00:00:00"
    
    current_week_events = []
    for e in events:
        ts = e.get("timestamp", "")
        if ts >= monday_str:
            current_week_events.append(e)
            
    wins = []
    
    # Group tasks
    completed_tasks = [e for e in current_week_events if e.get("type") == "task_completed"]
    if completed_tasks:
        wins.append(f"Completed {len(completed_tasks)} major quests/tasks:")
        for t in completed_tasks:
            wins.append(f"  - [Quest] {t.get('entity')} (+{t.get('xp')} XP)")
            
    # Group journals
    completed_journals = [e for e in current_week_events if e.get("type") == "journal_created"]
    if completed_journals:
        wins.append(f"Logged reflections for {len(completed_journals)} days this week (+{len(completed_journals) * 10} XP)")
        
    # Group habits completions
    completed_habits = [e for e in current_week_events if e.get("type") == "habit_completed"]
    if completed_habits:
        habit_counts = {}
        for h in completed_habits:
            name = h.get("entity", "Habit")
            habit_counts[name] = habit_counts.get(name, 0) + 1
        wins.append("Maintained consistency on habits:")
        for name, count in habit_counts.items():
            wins.append(f"  - [Habit] {name} completed {count} times")
            
    if not wins:
        wins.append("No achievements logged yet for this week. Keep going!")
        
    return wins

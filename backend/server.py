import os
import sys

# Ensure both the backend directory and its parent (BakaTracker root) are in Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

root_dir = os.path.dirname(backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from mcp.server.fastmcp import FastMCP
from typing import Optional, Dict, Any, List, Union
from datetime import date as dt_date

# Import all tools
from tools.habits import get_habits, get_habit_logs, log_habit, increment_habit, set_habit_value
from tools.tasks import get_tasks, get_today_tasks, create_task, update_task, delete_task
from tools.journal import get_journal_entries, save_journal_entry
from tools.quotes import get_quotes, get_random_quote
from tools.events import get_events, get_recent_events
from tools.journey import get_character_sheet, get_weekly_stats, get_day_summary, get_weekly_wins
from tools.quick_log import quick_log

# Initialize FastMCP Server
mcp = FastMCP("BakaTracker", host="0.0.0.0")

# ==========================================
# REGISTER TOOLS
# ==========================================

@mcp.tool(name="get_habits")
def tool_get_habits() -> List[Dict[str, Any]]:
    """
    Retrieve all configured habits and their metadata.
    """
    return get_habits()

@mcp.tool(name="get_habit_logs")
def tool_get_habit_logs(date: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Retrieve completed habit logs for a specific date (YYYY-MM-DD). Defaults to today.
    """
    return get_habit_logs(date)

@mcp.tool(name="log_habit")
def tool_log_habit(habit_id: str, date: Optional[str] = None) -> str:
    """
    Toggle completion of a checkbox habit for a specific date (YYYY-MM-DD). Defaults to today.
    """
    return log_habit(habit_id, date)

@mcp.tool(name="increment_habit")
def tool_increment_habit(habit_id: str, amount: float, date: Optional[str] = None) -> str:
    """
    Increment a counter-based habit by a specific amount for a date (YYYY-MM-DD). Defaults to today.
    """
    return increment_habit(habit_id, amount, date)

@mcp.tool(name="set_habit_value")
def tool_set_habit_value(habit_id: str, value: Union[int, float, str], date: Optional[str] = None) -> str:
    """
    Set value for a numeric, mood, or energy habit for a date (YYYY-MM-DD). Defaults to today.
    """
    return set_habit_value(habit_id, value, date)

@mcp.tool(name="get_tasks")
def tool_get_tasks() -> List[Dict[str, Any]]:
    """
    Retrieve all tasks in the database (backlog, todo, doing, done).
    """
    return get_tasks()

@mcp.tool(name="get_today_tasks")
def tool_get_today_tasks() -> List[Dict[str, Any]]:
    """
    Retrieve tasks scheduled specifically for Today.
    """
    return get_today_tasks()

@mcp.tool(name="create_task")
def tool_create_task(
    title: str,
    notes: Optional[str] = "",
    area: Optional[str] = "personal",
    xp: Optional[int] = 10,
    today: Optional[bool] = False,
    due_date: Optional[str] = ""
) -> str:
    """
    Create a new task. Areas: 'health', 'career', 'learning', 'personal', 'creativity'.
    """
    return create_task(title, notes, area, xp, today, due_date)

@mcp.tool(name="update_task")
def tool_update_task(
    task_id: str,
    title: Optional[str] = None,
    notes: Optional[str] = None,
    area: Optional[str] = None,
    status: Optional[str] = None,
    today: Optional[bool] = None,
    due_date: Optional[str] = None
) -> str:
    """
    Update details of an existing task.
    """
    return update_task(task_id, title, notes, area, status, today, due_date)

@mcp.tool(name="delete_task")
def tool_delete_task(task_id: str) -> str:
    """
    Delete a task and its associated completion events.
    """
    return delete_task(task_id)

@mcp.tool(name="get_journal_entries")
def tool_get_journal_entries() -> List[Dict[str, Any]]:
    """
    Retrieve all daily journal reflection entries.
    """
    return get_journal_entries()

@mcp.tool(name="save_journal_entry")
def tool_save_journal_entry(
    date: str,
    highlight: str,
    notes: Optional[str] = "",
    mood: Optional[str] = "",
    quote_id: Optional[str] = "q1"
) -> str:
    """
    Create or update a daily reflection. Highlight represents the main daily win.
    """
    return save_journal_entry(date, highlight, notes, mood, quote_id)

@mcp.tool(name="get_quotes")
def tool_get_quotes() -> List[Dict[str, Any]]:
    """
    Retrieve all motivational quotes.
    """
    return get_quotes()

@mcp.tool(name="get_random_quote")
def tool_get_random_quote() -> Dict[str, Any]:
    """
    Get a random active quote to display as a daily insight.
    """
    return get_random_quote()

@mcp.tool(name="get_events")
def tool_get_events(source: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Retrieve all logged events. Filters: 'habit', 'task', 'journal', 'system'.
    """
    return get_events(source)

@mcp.tool(name="get_recent_events")
def tool_get_recent_events(limit: Optional[int] = 15) -> List[Dict[str, Any]]:
    """
    Get the most recent system activity/XP logs up to a limit.
    """
    return get_recent_events(limit)

@mcp.tool(name="get_character_sheet")
def tool_get_character_sheet() -> Dict[str, Any]:
    """
    Retrieve current pre-computed character level, title, and attribute XP values.
    """
    return get_character_sheet()

@mcp.tool(name="get_weekly_stats")
def tool_get_weekly_stats() -> List[Dict[str, Any]]:
    """
    Retrieve weekly summaries of XP gained per attribute category.
    """
    return get_weekly_stats()

@mcp.tool(name="get_day_summary")
def tool_get_day_summary(date: Optional[str] = None) -> Dict[str, Any]:
    """
    Get aggregate checklist completion ratios and a consolidated daily score for a date.
    """
    return get_day_summary(date)

@mcp.tool(name="get_weekly_wins")
def tool_get_weekly_wins() -> List[str]:
    """
    Retrieve a human-readable list of milestones and accomplishments completed in the current week.
    """
    return get_weekly_wins()

@mcp.tool(name="quick_log")
def tool_quick_log(text: str) -> str:
    """
    [EXPERIMENTAL] Parse shorthand natural language string (e.g. 'Gym done. Read 15. Mood happy') to record entries. Note: Natural-language parsing is experimental and may require manual verification.
    """
    return quick_log(text)

@mcp.tool(name="export_life_report")
def tool_export_life_report(timeframe: str = "month") -> str:
    """
    Generates a structured 'Export Your Life' markdown summary report of growth, level progression, completed milestones, and stat breakdowns.
    """
    c = get_character_sheet()
    wins = get_weekly_wins()
    wins_formatted = "\n".join([f"✓ {w}" for w in wins]) if wins else "✓ Consistent habit logs logged"
    
    return f"""==================================================
BAKATRACKER LIFE REPORT (MCP Platform Export)
Period: {timeframe.capitalize()}
Level: LVL {c.get('level', 1)} ({c.get('total_xp', 0.0)} Total XP)
==================================================

STAT BREAKDOWN:
💪 Health:     {c.get('health', 0.0)} XP
⚔️ Discipline: {c.get('discipline', 0.0)} XP
🧠 Knowledge:  {c.get('knowledge', 0.0)} XP
🎨 Creativity: {c.get('creativity', 0.0)} XP
💼 Career:     {c.get('career', 0.0)} XP

ACCOMPLISHMENT HIGHLIGHTS:
{wins_formatted}

PHILOSOPHY:
"Consistency beats intensity."
=================================================="""

# ==========================================
# REGISTER RESOURCES
# ==========================================

@mcp.resource("bakatracker://character")
def resource_character() -> str:
    """
    Renders a text-based Character Profile Sheet.
    """
    c = get_character_sheet()
    return f"""==================================================
BAKATRACKER CHARACTER PROFILE
==================================================
Name: User
Title: {c.get('title', 'Novice Adventurer')}
Level: {c.get('level', 1)}
Total XP: {c.get('total_xp', 0.0)}

Attributes:
- Discipline: {c.get('discipline', 0.0)} XP
- Health:     {c.get('health', 0.0)} XP
- Knowledge:  {c.get('knowledge', 0.0)} XP
- Creativity: {c.get('creativity', 0.0)} XP
- Career:     {c.get('career', 0.0)} XP

Last Updated: {c.get('updated_at', '')}
=================================================="""

@mcp.resource("bakatracker://today")
def resource_today() -> str:
    """
    Renders Today's Checklist Quests and progress.
    """
    date = dt_date.today().isoformat()
    summary = get_day_summary(date)
    
    habits_str = ""
    for h in summary["habits"]["list"]:
        status = "[x]" if h["completed"] else "[ ]"
        val_str = f" ({h['value']})" if h["value"] is not None else ""
        habits_str += f"\n  {status} {h['name']}{val_str}"
        
    tasks_str = ""
    for t in summary["tasks"]["list"]:
        status = "[x]" if t["completed"] else "[ ]"
        tasks_str += f"\n  {status} {t['title']} ({t['status']})"
        
    j_str = "Completed" if summary["journal"]["written"] else "Not completed"
    highlight_str = f" -> highlight: {summary['journal']['highlight']}" if summary["journal"]["written"] else ""
    
    return f"""==================================================
TODAY'S QUESTS: {date}
==================================================
Daily Score: {summary['daily_score']}%

Habits Checklist ({summary['habits']['completed']}/{summary['habits']['total']}):{habits_str or '\n  No active habits.'}

Quests Checklist ({summary['tasks']['completed']}/{summary['tasks']['total']}):{tasks_str or '\n  No tasks scheduled.'}

Daily Reflection: {j_str}{highlight_str}
=================================================="""

@mcp.resource("bakatracker://weekly")
def resource_weekly() -> str:
    """
    Renders Weekly Wins and Recaps.
    """
    wins = get_weekly_wins()
    wins_str = "\n".join(f"- {w}" for w in wins)
    
    stats = get_weekly_stats()
    stats_str = ""
    for s in stats[-4:]: # Show last 4 weeks
        stats_str += f"\n- Week of {s.get('week_start')}: {s.get('xp')} XP (Health: {s.get('health')}, Learning: {s.get('knowledge')}, Career: {s.get('career')})"
        
    return f"""==================================================
WEEKLY RECAP & MILESTONES
==================================================
Recent Weekly Growth History:{stats_str or '\n  No historical weekly stats found.'}

This Week's Wins:
{wins_str}
=================================================="""

@mcp.resource("bakatracker://journal")
def resource_journal() -> str:
    """
    Renders a timeline of daily reflections.
    """
    entries = get_journal_entries()
    # Sort descending
    entries = sorted(entries, key=lambda x: x.get("date", ""), reverse=True)[:10]
    
    entries_str = ""
    for entry in entries:
        entries_str += f"""
Date: {entry.get('date')} | Mood: {entry.get('mood', 'N/A')}
Highlight: {entry.get('highlight')}
Notes: {entry.get('notes')}
--------------------------------------------------"""
        
    return f"""==================================================
DAILY REFLECTIONS TIMELINE (Last 10)
=================================================={entries_str or '\nNo reflections written yet.'}"""

@mcp.resource("bakatracker://events")
def resource_events() -> str:
    """
    Renders recent activity logs.
    """
    events = get_recent_events(20)
    
    events_str = ""
    for e in events:
        events_str += f"\n[{e.get('timestamp')[:19]}] [+{e.get('xp')} XP] [{e.get('stat')}] {e.get('entity')} ({e.get('type')})"
        
    return f"""==================================================
RECENT SYSTEM ACTIVITY LOGS (Last 20)
=================================================={events_str or '\nNo activity logged yet.'}"""

@mcp.resource("bakatracker://journey")
def resource_journey() -> str:
    """
    Renders a general summary of the user's growth.
    """
    c = get_character_sheet()
    db = client.fetch_db()
    total_habits = len(db.get("habits", []))
    total_logs = len(db.get("habitLogs", []))
    total_tasks = len(db.get("tasks", []))
    total_completed_tasks = len([t for t in db.get("tasks", []) if t.get("status") == "done"])
    
    return f"""==================================================
BAKATRACKER JOURNEY SUMMARY
==================================================
Character Title: {c.get('title', 'Novice Adventurer')}
Level: {c.get('level', 1)}
Total XP: {c.get('total_xp', 0.0)}

System Status:
- Total Habits Configured: {total_habits}
- Total Habit Completions: {total_logs}
- Total Tasks Created:     {total_tasks}
- Total Tasks Completed:   {total_completed_tasks}
=================================================="""

# ==========================================
# REGISTER PROMPTS
# ==========================================

@mcp.prompt("daily_review")
def prompt_daily_review() -> str:
    """
    RPG-themed Daily Review prompt.
    """
    return "Please retrieve my character profile resource, today's quests, and my daily reflections to generate a comprehensive daily briefing and action plan."

if __name__ == "__main__":
    mcp.run()

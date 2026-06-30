# 🔌 Model Context Protocol (MCP) Guide

This guide explains how to connect and use the BakaTracker FastMCP server to interact with your life operating system via LLMs.

---

## 🧐 What is MCP?

The Model Context Protocol (MCP) is an open standard that allows LLM applications (like Cursor, Claude Desktop, or VS Code) to securely interact with external tools and data resources. 

BakaTracker implements an MCP server so that you can talk to your planner:
* **"Summarize my weekly progress."**
* **"Create a new career task: Update resume, reward 30 XP, due tomorrow."**
* **"Log habit: Gym done."**

---

## 🛠️ Registered Tools (22 Tools)

The FastMCP server registers 22 python tools to query and update BakaTracker.

### Habit Tools
1. `get_habits()`: Returns all configured habits.
2. `get_habit_logs(date)`: Returns habit completions for `date` (YYYY-MM-DD).
3. `log_habit(habit_id, date)`: Toggles checkbox habits.
4. `increment_habit(habit_id, amount, date)`: Increments counter habits.
5. `set_habit_value(habit_id, value, date)`: Logs numeric/mood/energy values.

### Task Tools
6. `get_tasks()`: Returns all backlog, todo, doing, and done tasks.
7. `get_today_tasks()`: Returns active Today quests.
8. `create_task(title, notes, area, status, due_date, xp, today)`: Inserts a task card.
9. `update_task(task_id, ...)`: Modifies task parameters.
10. `delete_task(task_id)`: Removes a task from the board.

### Journal Tools
11. `get_journal_entries()`: Returns historical daily reflections.
12. `save_journal_entry(date, highlight, notes, mood, quote_id)`: Saves a highlight entry.

### Quote Tools
13. `get_quotes()`: Returns quotes.
14. `get_random_quote()`: Picks a random quote card.

### Event Tools
15. `get_events()`: Returns the transaction ledger.
16. `get_recent_events(limit)`: Returns the last `N` events.

### Journey & Assistant Tools
17. `get_character_sheet()`: Text profile status.
18. `get_weekly_stats()`: Flat historical weekly analytics.
19. `get_day_summary(date)`: Formats a complete summary of habits/tasks/journal for a day.
20. `get_weekly_wins(week_key)`: Generates weekly highlights.
21. `quick_log(text)`: Parses shorthand inputs (e.g. `Gym done. Read 15. Highlight: Finished spec`).
22. `get_tool_list()`: Reference helper.

---

## 🗃️ Registered Resources (5 Resources)

Resources act as readable text documents that LLMs can automatically fetch when discussing context.
* `bakatracker://character`: Returns your active RPG level, attribute progression, and tier titles.
* `bakatracker://today`: Returns today's active quests and habit completion checklist.
* `bakatracker://weekly`: Returns weekly recap stats and wins.
* `bakatracker://journal`: Returns a reverse-chronological timeline of journal highlights.
* `bakatracker://events`: Returns recent timeline event transactions.

---

## 🔌 Client Connection Setups

### 1. Cursor
1. Open Cursor.
2. Go to **Settings** > **Features** > **MCP**.
3. Click **+ Add New MCP Server**.
4. Configure the parameters:
   * **Name:** `BakaTracker`
   * **Type:** `sse`
   * **URL:** `https://your-cloud-run-url.a.run.app/mcp/sse`
   * **Headers:** Key: `Authorization`, Value: `Bearer your_token_here`

### 2. Claude Desktop
Add the following to your `claude_desktop_config.json` configuration file:
```json
{
  "mcpServers": {
    "bakatracker": {
      "type": "sse",
      "url": "https://your-cloud-run-url.a.run.app/mcp/sse",
      "headers": {
        "Authorization": "Bearer your_token_here"
      }
    }
  }
}
```

### 3. Local Debugging via MCP Inspector
To run a local inspector web client to test tools during development:
```bash
cd backend
uv run mcp dev server.py
```

---

## 💬 Example Prompt Workflows

### 1. Daily Planning
> **User:** "Check what quests are remaining for today, and log that I did my Gym habit."
> **LLM:** *Automatically fetches `bakatracker://today` and triggers `log_habit(habit_id='h_gym')`.*

### 2. Quick Log Shorthand
> **User:** "Quick log: Read 10. Water 3. Highlight: Completed coding deployment."
> **LLM:** *Triggers `quick_log(text='Read 10. Water 3. Highlight: Completed coding deployment')`.*

### 3. Weekly Review
> **User:** "Summarize how I did this week. What was my average sleep and how much XP did I gain?"
> **LLM:** *Fetches `bakatracker://weekly` and summarizes stats in an RPG format.*

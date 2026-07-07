# Model Context Protocol (MCP) Compatibility Report

This document serves as a machine-readable and human-readable compatibility report for the BakaTracker MCP implementation.

---

## 📊 System Metadata (JSON Schema)

```json
{
  "protocol": "Model Context Protocol",
  "implementation": "BakaTracker FastAPI/FastMCP Gateway",
  "version": "1.0.0",
  "fastmcp_version": "1.28.1",
  "security": {
    "auth_modes": ["jwt", "legacy"],
    "required_headers": {
      "legacy": ["Authorization: Bearer <token>", "Host: <allowed_host>"],
      "jwt": ["Authorization: Bearer <jwt>", "Host: <allowed_host>"]
    },
    "dns_rebinding_protection": {
      "enabled": true,
      "allowed_hosts": ["127.0.0.1:*", "localhost:*", "[::1]:*"]
    }
  },
  "transports": [
    {
      "name": "Streamable HTTP",
      "endpoint": "/mcp/http/",
      "method": "POST/GET",
      "mode": "stateful (initialize required) / stateless support",
      "recommended_for": ["Cursor", "ChatGPT Custom Actions", "MCP Inspector"]
    },
    {
      "name": "Server-Sent Events (SSE)",
      "endpoint": "/mcp/sse",
      "fallback_endpoint": "/mcp",
      "method": "GET",
      "recommended_for": ["Legacy SSE Clients"]
    },
    {
      "name": "Standard Input/Output (stdio)",
      "command": "uv run main.py",
      "recommended_for": ["Claude Desktop", "Cline"]
    }
  ]
}
```

---

## 🛠️ Registered Capabilities

### 1. Tools (22)
Machine-readable array of supported tools:

```json
[
  { "name": "get_habits", "description": "Retrieve all configured habits and their metadata." },
  { "name": "get_habit_logs", "description": "Retrieve completed habit logs for a specific date (YYYY-MM-DD)." },
  { "name": "log_habit", "description": "Toggle completion of a checkbox habit for a specific date (YYYY-MM-DD)." },
  { "name": "increment_habit", "description": "Increment counter of a click/counter habit for a date." },
  { "name": "set_habit_value", "description": "Set explicit value for numeric/mood/energy habits." },
  { "name": "get_tasks", "description": "Retrieve all master backlog Kanban tasks." },
  { "name": "get_today_tasks", "description": "Retrieve tasks scheduled specifically for Today focus board." },
  { "name": "create_task", "description": "Create a new task with details, XP, area, and optional due date." },
  { "name": "update_task", "description": "Update details, status, or area of an existing Kanban task." },
  { "name": "delete_task", "description": "Delete a task and its associated completion history." },
  { "name": "get_journal_entries", "description": "Retrieve all daily journal reflection entries." },
  { "name": "save_journal_entry", "description": "Create or update a daily reflection highlight (main daily win)." },
  { "name": "get_quotes", "description": "Retrieve all motivational quotes." },
  { "name": "get_random_quote", "description": "Get a random active quote to display as a daily insight." },
  { "name": "get_events", "description": "Retrieve all logged events filtered by source (habit, task, journal, system)." },
  { "name": "get_recent_events", "description": "Get the most recent system activity/XP logs up to a limit." },
  { "name": "get_character_sheet", "description": "Retrieve current pre-computed character level, title, and attribute XP values." },
  { "name": "get_weekly_stats", "description": "Retrieve weekly summaries of XP gained per attribute category." },
  { "name": "get_day_summary", "description": "Get aggregate checklist completion ratios and consolidated daily score for a date." },
  { "name": "get_weekly_wins", "description": "Retrieve a list of accomplishments completed in the current week." },
  { "name": "quick_log", "description": "Parse shorthand natural language string to record habit/task entries." },
  { "name": "export_life_report", "description": "Generates a structured 'Export Your Life' markdown summary report." }
]
```

### 2. Resources (6)
Machine-readable array of static/dynamic resources:

```json
[
  { "uri": "bakatracker://character", "name": "resource_character", "description": "Character sheet with level, title, and attribute XP values." },
  { "uri": "bakatracker://today", "name": "resource_today", "description": "Today's habits progress and active focus quests." },
  { "uri": "bakatracker://weekly", "name": "resource_weekly", "description": "Weekly stats summaries of XP gained per attribute." },
  { "uri": "bakatracker://journal", "name": "resource_journal", "description": "Highlight journal entries." },
  { "uri": "bakatracker://events", "name": "resource_events", "description": "Activity logs." },
  { "uri": "bakatracker://journey", "name": "resource_journey", "description": "Milestones and accomplishments history." }
]
```

### 3. Prompts (1)
Machine-readable array of custom prompts:

```json
[
  { "name": "daily_review", "description": "RPG-themed Daily Review prompt." }
]
```

---

## 🔌 Client Connection Matrix

| Client | Supported Transports | Connection URI / Command | Security Requirements | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cursor** | Streamable HTTP, SSE | `http://localhost:8080/mcp/http/` | Bearer Token, Host Header Port matching | **PASSED** | Recommended: Streamable HTTP |
| **Claude Desktop** | stdio | `uv --directory <path> run main.py` | Env variables (`AUTH_TOKEN`) | **PASSED** | Connection initiated via standard I/O |
| **ChatGPT** | Streamable HTTP | `http://localhost:8080/mcp/http/` | OpenAPI Schema, Bearer Auth Key | **PASSED** | Configured as a Custom GPT Action |
| **MCP Inspector** | Streamable HTTP, SSE | `http://localhost:8080/mcp/http/` | Bearer Token, Host Header Port matching | **PASSED** | Use `Streamable HTTP` mode in the UI |

---

## ⚡ Setup Reference Configurations

### 1. Cursor Custom Headers
```json
{
  "name": "BakaTracker",
  "type": "http",
  "url": "http://localhost:8080/mcp/http/",
  "headers": {
    "Authorization": "Bearer your_token_here"
  }
}
```

### 2. Claude Desktop (stdio)
```json
{
  "mcpServers": {
    "bakatracker": {
      "command": "uv",
      "args": [
        "--directory",
        "C:/path/to/BakaTracker/backend",
        "run",
        "main.py"
      ],
      "env": {
        "GOOGLE_APPS_SCRIPT_URL": "https://script.google.com/macros/s/.../exec",
        "AUTH_TOKEN": "your_auth_token_here",
        "GOOGLE_APPS_SCRIPT_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

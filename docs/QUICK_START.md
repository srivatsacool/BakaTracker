# ⚡ Quick Start Guide

Welcome to BakaTracker! This guide will help you set up and run a local instance of the React frontend and the Python FastMCP backend in under 5 minutes.

---

## 🏃 5-Minute Local Launch

### Step 1: Clone the Repository
Open your terminal and clone the BakaTracker project:
```bash
git clone https://github.com/srivatsacool/BakaTracker.git
cd BakaTracker
```

### Step 2: Boot the React Frontend (Local-First)
The React application is fully local-first. It starts running instantly using local storage if no database URL is set:
1. Install node dependencies:
   ```bash
   npm install
   ```
2. Start the Vite local development server:
   ```bash
   npm run dev
   ```
3. Open your browser and navigate to `http://localhost:5173`. You can start tracking habits and creating quests immediately.

### Step 3: Run the FastMCP Backend locally
1. Install [uv](https://github.com/astral-sh/uv) (Python package manager) if you haven't already.
2. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
3. Sync dependencies:
   ```bash
   uv sync
   ```
4. Start the FastAPI server locally with mock environment variables:
   ```bash
   # Windows PowerShell
   $env:GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/dummy/exec"
   $env:AUTH_TOKEN="local_debug_token"
   uv run uvicorn main:app --port 8080

   # Linux / macOS / Git Bash
   GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/dummy/exec" AUTH_TOKEN="local_debug_token" uv run uvicorn main:app --port 8080
   ```
Your backend is now running at `http://localhost:8080`.

### Step 4: Debug tools via MCP Inspector
To inspect and test BakaTracker's 22 registered tools (like `get_habits`, `create_task`) in a local GUI:
1. Run the FastMCP Inspector from the `backend/` directory:
   ```bash
   uv run mcp dev server.py
   ```
2. Open the URL displayed in the terminal (usually `http://localhost:5173` or similar web inspector dashboard) to trigger and debug tools in real-time.

---

## 🔗 Related Documentation
* [docs/INSTALLATION.md](INSTALLATION.md) — For complete step-by-step production configuration instructions.
* [docs/USER_GUIDE.md](USER_GUIDE.md) — For a walk-through on habits, quests, journal logging, and progression.
* [docs/MCP.md](MCP.md) — For instructions on connecting your live Cloud Run backend to Cursor, Claude, or ChatGPT.

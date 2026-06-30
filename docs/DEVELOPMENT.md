# 🛠️ Developer Guide

This document provides setup instructions, workflow commands, and architectural conventions for developers contributing code to the BakaTracker project.

---

## 💻 Frontend Development (React + Vite)

The frontend is built using React 19, Vite, and TypeScript.

### 1. Install Project Dependencies
Run from the repository root directory:
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open your browser to `http://localhost:5173`. Hot Module Replacement (HMR) is enabled.

### 3. Linting and Formatting
Before committing changes, run:
```bash
# Check TypeScript compilation
npm run build

# Run ESLint validation checks
npm run lint
```

---

## 🐍 Backend Development (Python + FastAPI + FastMCP)

The backend server operates inside a containerized UV environment.

### 1. Prerequisite Setup
Ensure [uv](https://github.com/astral-sh/uv) is installed. Initialize the virtual environment and synchronize dependencies:
```bash
cd backend
uv sync
```

### 2. Launch Local API Gateway
To run uvicorn locally (requires setting environment variables):
```bash
# Set variables and run uvicorn
$env:GOOGLE_APPS_SCRIPT_URL="https://script.google.com/macros/s/dummy/exec"
$env:AUTH_TOKEN="local_token"
uv run uvicorn main:app --port 8080 --reload
```

### 3. Local Tool Testing (MCP Inspector)
The MCP Inspector provides a web-based GUI to trigger and test registered tools:
```bash
uv run mcp dev server.py
```

---

## 📐 Coding Conventions & Standards

### Frontend (TypeScript / React)
* **CSS:** Use vanilla Tailwind utility classes. Avoid inline style mappings unless binding custom color hex codes from settings.
* **State Operations:** Keep all database sync actions wrapped inside Zustand actions (`src/store/useStore.ts`). Do not write custom REST fetch calls directly in React page components.
* **Strict Type Safety:** Avoid using `any`. Ensure all mapped collection rows match type parameters in `src/types/index.ts`.

### Backend (Python)
* **Explicit Awaits:** Since FastMCP lists and calls are asynchronous in the modern SDK, always await list results:
  `tools = await mcp.list_tools()`.
* **Centralized Configuration:** Do not call `os.getenv` directly. Always import and read parameters from the centralized config module:
  `from config import config`.
* **Logging:** Avoid using `print`. Use python's logging module to route logs to stdout for Cloud Run capture:
  `logger.info("message")`.

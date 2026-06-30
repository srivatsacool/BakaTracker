# BakaTracker Architecture Manual — Version 1.0

This document defines the architectural boundaries, subsystems, and data patterns for BakaTracker V1.0.

---

## High-Level Layout

BakaTracker utilizes a decoupled structure where the frontend (React PWA) and backend (FastMCP server) exist independently but consume the same Google Sheets database bridge:

```
                   Cloudflare Pages
                          │
                          ▼
                  React PWA (Local-First)
                          │
                          ▼
               Google Apps Script Web App
                          │
                          ▼
                Google Sheets Database

                          ▲
                          │
             Google Cloud Run (Python API Gateway)
                          │
                  FastAPI + FastMCP
                          │
                          ▼
               Google Apps Script Web App

                          ▲
                          │
               MCP Clients (Claude / ChatGPT)
```

---

## Architectural Components

### 1. Frontend Client (React 19 + Zustand)
* **Hosting:** Deployed to Cloudflare Pages.
* **Storage:** Local Storage acts as a local replica database. State updates immediately in the UI.
* **Sync:** Changes trigger background sync payloads calling the Google Apps Script Web App.

### 2. Backend Container (Google Cloud Run)
* **Hosting:** Deployed as a serverless container on Google Cloud Run.
* **Framework:** Powered by FastAPI and FastMCP.
* **Exposing MCP:** Exposes FastMCP over the official HTTP transport (preferring Streamable HTTP, falling back to SSE).
* **Role:** Acts as an API gateway for MCP clients (ChatGPT, Claude Desktop, Cursor), translating natural language prompts and tool executions into Google Sheets updates.

### 3. Database Layer (Google Sheets & Apps Script)
* **Google Sheets:** Acts as the primary database storing habits, logs, tasks, journal reflections, quotes, events, and stats.
* **Apps Script Web App:** Acts as the stateless REST API driver for the Sheet. It parses `action=getAll` (reads spreadsheet row structures and returns a flat JSON dictionary) and `action=sync` (receives a collections dictionary and overwrites the corresponding sheets).

---

## Data Integration & Statelessness

Both the React Frontend and the Google Cloud Run MCP server communicate with the Google Sheets database using the Apps Script Web App.

To avoid duplicate business logic calculations:
1. FastMCP tools fetch the database dictionary on request using `fetch_db()`.
2. The tools perform modifications (e.g. logging a habit, creating a task, updating stats) inside the Python layer.
3. The server pushes the updated database dictionary back to Sheets using `save_db(data)`.
4. This ensures that the React app and FastMCP always share identical, synchronized data states.

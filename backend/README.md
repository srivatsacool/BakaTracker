# BakaTracker FastMCP Backend — Version 1.0.0

This directory contains the production-ready FastMCP server for BakaTracker. It is designed to run locally or containerized on Google Cloud Run, serving as a remote MCP server for clients like ChatGPT, Claude, Cursor, and VS Code.

---

## Architecture Overview

The MCP server connects to your existing Google Sheets database by proxying requests to the Google Apps Script Web App:

```
ChatGPT / Claude / Cursor / MCP Inspector
                  │
                  ▼
          Google Cloud Run (FastAPI + FastMCP) [Application Bearer Token Auth]
                  │
                  ▼
          Google Apps Script
                  │
                  ▼
            Google Sheets
```

All direct database reading and writing logic resides in the shared services, ensuring complete backward compatibility with your React PWA.

---

## Environment Variables

Copy `.env.example` to `.env` to configure your local server:

* `GOOGLE_APPS_SCRIPT_URL`: The public execution URL of your deployed Google Apps Script Web App.
* `GOOGLE_APPS_SCRIPT_API_KEY`: (Optional) The API key configured in your Sheets database Settings.
* `AUTH_TOKEN`: The bearer token required by clients to call your Cloud Run service.
* `PORT`: Port to bind to (Default: 8080).
* `LOG_LEVEL`: Log severity setting (Default: INFO).
* `TIMEOUT`: Requests timeout limit for Sheets calls (Default: 10.0s).

---

## Local Development

### 1. Prerequisite
Ensure [uv](https://github.com/astral-sh/uv) is installed on your local machine.

### 2. Install Dependencies
Initialize the virtual environment and install all packages:
```bash
uv sync
```

### 3. Run the Server
Start the FastAPI server locally:
```bash
uv run main.py
```
The server will start on `http://localhost:8080`.

---

## Local Verification & Debugging

### Endpoint Monitoring
Use `curl` to test the public endpoints:
* API Discovery: `curl http://localhost:8080/`
* Health Check: `curl http://localhost:8080/health`
* Version Info: `curl http://localhost:8080/version`

To test protected endpoints, supply your `AUTH_TOKEN` in the headers:
* Database Readiness: `curl -H "Authorization: Bearer <AUTH_TOKEN>" http://localhost:8080/ready`
* Info Report: `curl -H "Authorization: Bearer <AUTH_TOKEN>" http://localhost:8080/info`
* Metrics Log: `curl -H "Authorization: Bearer <AUTH_TOKEN>" http://localhost:8080/metrics`

### Debugging with MCP Inspector
You can debug MCP tools and resources locally using the built-in MCP Inspector:
```bash
mcp dev server.py
```
This command spins up a web-based inspector GUI allowing you to trigger tools (e.g. `get_habits`, `log_habit`, `create_task`) and inspect responses in real-time.

---

## Docker Containerization

### 1. Build Docker Image
```bash
docker build -t bakatracker-mcp .
```

### 2. Verify Container Run
Test local container start-up and verify endpoints:
```bash
docker run -p 8080:8080 \
  -e GOOGLE_APPS_SCRIPT_URL=your_url \
  -e GOOGLE_APPS_SCRIPT_API_KEY=your_key \
  -e AUTH_TOKEN=your_token \
  bakatracker-mcp
```
Then verify via `curl http://localhost:8080/health`.

---

## Google Cloud Run Deployment

Deploy your backend manually using the following gcloud command:
```bash
gcloud run deploy bakatracker-mcp \
  --source . \
  --region us-central1 \
  --platform managed \
  --cpu 0.25 \
  --memory 512Mi \
  --concurrency 80 \
  --timeout 300 \
  --min-instances 0 \
  --max-instances 5 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_APPS_SCRIPT_URL=your_url,GOOGLE_APPS_SCRIPT_API_KEY=your_key,AUTH_TOKEN=your_token
```

Once deployed, configure the connection URL in Cursor or Claude:
* **Transport:** Server-Sent Events (SSE)
* **URL:** `https://your-cloud-run-url.a.run.app/mcp/sse` (or streamable endpoints depending on client client configuration)
* **Headers:** `Authorization: Bearer <your_auth_token>`

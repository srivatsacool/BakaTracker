# 🌐 API Specifications Manual

This document details BakaTracker's HTTP interfaces, endpoint path queries, authentication requirements, and payload schemas.

---

## 🐍 FastAPI Gateway Endpoints (Google Cloud Run)

All requests directed to the Python backend must bind custom ports (Default: `8080`).

### Authentication Header
Endpoints marked **Protected** require the following token in the headers:
```http
Authorization: Bearer your_mcp_access_bearer_token
```
Anonymous requests to protected endpoints return `401 Unauthorized`.

### 1. API Discovery Gateway
* **Path:** `GET /`
* **Visibility:** Public (Anonymous)
* **Response (HTTP 200):**
  ```json
  {
    "name": "BakaTracker MCP Gateway",
    "version": "1.0.0",
    "status": "running",
    "transport": "Streamable HTTP",
    "docs": "/info",
    "health": "/health"
  }
  ```

### 2. Service Health check
* **Path:** `GET /health`
* **Visibility:** Public (Anonymous)
* **Response (HTTP 200):**
  ```json
  {
    "status": "healthy"
  }
  ```

### 3. Service Version Info
* **Path:** `GET /version`
* **Visibility:** Public (Anonymous)
* **Response (HTTP 200):**
  ```json
  {
    "name": "BakaTracker MCP",
    "version": "1.0.0",
    "environment": "production",
    "git_sha": "rev_3ab4ef5"
  }
  ```

### 4. Database Readiness Ping
* **Path:** `GET /ready`
* **Visibility:** Protected (Bearer Token Required)
* **Response (HTTP 200):**
  ```json
  {
    "database": "connected",
    "apps_script": "connected",
    "mcp": "ready"
  }
  ```
* **Failure (HTTP 503 Service Unavailable):** Returns if Google Apps Script is unreachable.
  ```json
  {
    "detail": {
      "database": "disconnected",
      "apps_script": "disconnected",
      "mcp": "ready"
    }
  }
  ```

### 5. Server Metadata Info
* **Path:** `GET /info`
* **Visibility:** Protected (Bearer Token Required)
* **Response (HTTP 200):**
  ```json
  {
    "project": "BakaTracker",
    "backend": "FastMCP",
    "transport": "Streamable HTTP",
    "database": "Google Sheets",
    "bridge": "Google Apps Script",
    "sdk_version": "1.28.1",
    "tool_count": 22,
    "resource_count": 5,
    "backend_version": "1.0.0"
  }
  ```

### 6. Server Metrics Dashboard
* **Path:** `GET /metrics`
* **Visibility:** Protected (Bearer Token Required)
* **Response (HTTP 200):**
  ```json
  {
    "uptime": "1d 4h 12m 5s",
    "request_count": 1250,
    "tool_count": 22,
    "sdk_version": "1.28.1",
    "cloud_run": true
  }
  ```

### 7. Model Context Protocol (MCP) Mount
* **Path:** `/mcp` (SSE mounts or Streamable HTTP endpoints)
* **Visibility:** Protected (Bearer Token Required)
* **Protocol:** JSON-RPC 2.0.

---

## 🗄️ Google Apps Script Endpoint Definitions

The Apps Script bridge turns your Google Sheet into a stateless REST API.

### 1. Fetch Complete Database
* **Method:** `GET`
* **Query Parameters:**
  * `action=getAll` (Required)
  * `apiKey=your_api_key` (Optional - Checked if settings configure key protection)
* **Sample URL:**
  `https://script.google.com/macros/s/AKfycby.../exec?action=getAll&apiKey=secret123`
* **Response (HTTP 200):**
  ```json
  {
    "status": "success",
    "data": {
      "settings": [{ "sheets_url": "...", "xp_per_level": 100 }],
      "habits": [{ "id": "h1", "name": "Gym", "type": "checkbox", "xp": 10, "stat": "health", "active": true }],
      "habitLogs": [{ "date": "2026-06-30", "habit_id": "h1", "value": "1.0", "xp_earned": 10 }],
      "tasks": [],
      "journal": [],
      "events": [],
      "character": [],
      "weeklyStats": [],
      "metadata": [],
      "quotes": []
    }
  }
  ```

### 2. Overwrite / Sync Collections
* **Method:** `POST`
* **Query Parameters:**
  * `apiKey=your_api_key` (Optional)
* **Payload Body (JSON):**
  ```json
  {
    "action": "sync",
    "data": {
      "habits": [...],
      "habitLogs": [...],
      "tasks": [...],
      "journal": [...],
      "events": [...],
      "character": [...],
      "weeklyStats": [...],
      "metadata": [...],
      "quotes": [...]
    }
  }
  ```
* **Response (HTTP 200):**
  ```json
  {
    "status": "success",
    "message": "Data synchronized successfully"
  }
  ```

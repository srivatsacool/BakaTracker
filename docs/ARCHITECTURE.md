# 🏗️ Technical Architecture Manual

This document details the system design, components, and data pipelines for BakaTracker.

---

## 🏛️ System Overview

BakaTracker is split into a frontend client and an isolated backend gateway that interact with a Google Sheets database via a serverless Apps Script bridge.

```mermaid
graph TD
    subgraph Client Layer (Cloudflare Pages)
        React[React PWA App]
        Zustand[Zustand Store]
        LocalDB[(Browser LocalStorage)]
    end

    subgraph Interface API Gateway (Google Cloud Run)
        FastAPI[FastAPI Web App]
        FastMCP[FastMCP Server Instance]
    end

    subgraph Database Layer (Google Drive)
        AppsScript[Google Apps Script Bridge]
        Sheets[(Google Sheets Spreadsheet)]
    end

    React <-->|Zustand state bindings| Zustand
    Zustand <-->|Read / Write cache| LocalDB
    Zustand -->|syncData POST| AppsScript
    AppsScript <-->|Read / Write API| Sheets
    
    FastAPI <-->|Route requests| FastMCP
    FastMCP -->|fetch_db / save_db| AppsScript
    
    Claude[Claude Desktop / Cursor] <-->|Bearer Auth JSON-RPC| FastAPI
```

---

## 🛠️ Components Breakdown

### 1. Frontend Client (React + Zustand)
* **Local-First Writes:** User interactions (checking off habits, changing task columns) write immediately to the Zustand store and browser `localStorage`.
* **State Normalizer:** Verifies model configurations on boot and recalculates RPG level metrics locally.
* **Sync Engine:** Monitors network connectivity. Toggles `syncStatus` state and issues background POST payloads to push JSON database collections.

### 2. Interface API Gateway (FastAPI + FastMCP)
* **FastAPI Server:** Provides public health probes (`/health`, `/version`) and protected metadata/ready checks (`/info`, `/metrics`, `/ready`).
* **FastMCP Server:** Exposes 22 Python tools and 5 Markdown resources. Mounts to `/mcp` over Streamable HTTP or SSE transports.
* **Database Proxy Client:** Performs HTTP operations to Google Apps Script using a strict 10s timeout and a 3-retry backoff policy.

### 3. Database Bridge (Google Apps Script + Sheets)
* **Spreadsheet:** Holds 10 sheets representing a database schema.
* **Script Bridge:** Serves as a stateless REST bridge. On `GET?action=getAll`, it returns a flat JSON dictionary of sheet collections. On `POST?action=sync`, it parses the JSON arrays and overwrites spreadsheet rows.

---

## 🔄 Core Workflows

### PWA State Synchronization Flow

```mermaid
sequenceDiagram
    participant User as React UI
    participant Store as Zustand Store
    participant Local as LocalStorage
    participant GAS as Apps Script Bridge
    
    User->>Store: Toggle Habit completed
    Store->>Store: Recalculate XP and Daily Score
    Store->>Local: Overwrite local database JSON
    Store->>User: Update UI state instantly
    
    alt Internet Connected
        Store->>GAS: POST ?action=sync (data payload)
        GAS-->>Store: Response success status
        Store->>User: Set Sync status green
    else Offline
        Store->>Store: Queue sync request
        Store->>User: Show offline sync warning
    end
```

### Bearer Token Authentication Flow

```mermaid
sequenceDiagram
    participant Client as MCP Client (Cursor)
    participant FastAPI as FastAPI Auth Middleware
    participant FastMCP as FastMCP Server
    participant GAS as Apps Script Bridge

    Client->>FastAPI: POST /mcp/messages (JSON-RPC)
    Note over Client,FastAPI: Headers: Authorization: Bearer <token>
    
    alt Token is valid
        FastAPI->>FastMCP: Dispatch request
        FastMCP->>GAS: GET ?action=getAll
        GAS-->>FastMCP: JSON DB State
        FastMCP->>FastMCP: Execute target tool (e.g. log_habit)
        FastMCP->>GAS: POST ?action=sync (updated state)
        GAS-->>FastMCP: Sync Success
        FastMCP-->>Client: Return Tool response
    else Token is missing or invalid
        FastAPI-->>Client: Return HTTP 401 Unauthorized
    end
```

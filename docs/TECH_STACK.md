# 💻 Technology Stack Manual

This document details the technology choices, library dependencies, and component responsibilities for BakaTracker.

---

## 🏛️ Technology Breakdown

| Component | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Client Core** | **React** | `19` | UI component modularity, hooks, state lifecycle. |
| **Project Bundler** | **Vite** | `5` | Fast local hot module reloading (HMR) and optimized PWA builds. |
| **Type Safety** | **TypeScript** | `5` | Enforces structural schemas across database rows and API collections. |
| **CSS Framework** | **TailwindCSS** | `4` | Custom design token configurations (light/dark paper themes). |
| **State & Cache** | **Zustand** | `4` | Lightweight state store managing local persistence and cloud syncs. |
| **Trends Engine** | **Recharts** | `2` | Renders SVG charts tracking sleep, mood, and attribute progression. |
| **Web Server** | **FastAPI** | `0.115` | Exposes health, version, ready, and metrics APIs with JSON validation. |
| **MCP Engine** | **FastMCP** | `1.28` | Declares Python tools, resources, and exposes HTTP transport apps. |
| **HTTP Client** | **HTTPX** | `0.28` | Executes HTTP requests with custom timeouts and retry connections. |
| **JSON Schemas** | **Pydantic** | `2` | Validates Sheets payloads in the Python backend. |
| **Database** | **Google Sheets** | `v4` | Relational database hosting accessible through standard tables. |
| **API Bridge** | **Apps Script** | `v8` | Javascript proxy exposing doGet/doPost REST endpoints. |
| **PWA Hosting** | **Cloudflare** | `Pages` | Hosts the compiled React client. |
| **MCP Hosting** | **Cloud Run** | `Managed` | Runs the containerized FastMCP gateway. |

---

## 🧐 Technology Rationale

### Why React 19 + Vite?
* **Instant Boots:** Vite utilizes native ES modules locally, booting in milliseconds.
* **Component-First:** Encourages clean modularity, separating habits, quests, journal entries, and progress pages into reusable UI layouts.

### Why Zustand instead of Redux?
* **Zero Boilerplate:** Zustand operates with a single custom hook, avoiding the complex reducers and action boilerplates of Redux.
* **Storage Middleware:** The built-in persist middleware automatically saves state to browser `localStorage`, supporting local-first tracking out of the box.

### Why Google Sheets + Apps Script?
* **No Database Maintenance:** Users do not need to host or pay for MongoDB, PostgreSQL, or DynamoDB.
* **Data Ownership:** Spreadsheet entries are visible directly inside the user's personal Google Drive.
* **Free Hosting:** Google Sheets API calls and Apps Script deployments are 100% free.

### Why FastMCP + FastAPI?
* **Developer Productivity:** FastMCP registers tools using simple `@mcp.tool` Python decorators.
* **Gateways:** FastAPI routes health checks, ready metrics, and exposes FastMCP over Streamable HTTP and SSE.

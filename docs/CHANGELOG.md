# 📜 Changelog

All notable changes to the BakaTracker project are documented in this file.

---

## [1.0.0] — 2026-06-30

### Added
* **Cloud Run Backend Deployment:** Containerized FastMCP Python server to run as an online gateway on Google Cloud Run.
* **FastAPI Router Wrapper:** Exposes health probes (`/health`, `/version`) and metadata monitoring endpoints (`/info`, `/metrics`, `/ready`).
* **Bearer Token Security:** Added `AuthAndLoggingMiddleware` checking for `Authorization: Bearer <token>` on all protected endpoints.
* **Fail-Fast Startup checklist:** Added checks for environment variables, URL formatting, and MCP tool counts before uvicorn boots.
* **Resilient Client Connections:** Configured sheets client with a 10s request timeout limit and a 3-retry exponential backoff policy (0.5s, 1s, 2s).
* **V1.0 Documentation Suite:** Generated complete guides for installation, API endpoints, database schemas, and developer standards.

### Changed
* **Repository Folder Restructuring:** Moved all FastMCP server scripts out of `bakatracker-mcp/` directly to `backend/` and removed the old folder.
* **Environment Configuration:** Refactored env loading inside Python to use a single centralized module (`backend/config.py`).

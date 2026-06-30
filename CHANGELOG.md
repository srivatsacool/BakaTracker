# BakaTracker Changelog

All notable changes to BakaTracker will be documented in this file.

---

## [1.0.0] — 2026-06-30

### Added
* **Google Cloud Run Deployment:** Created containerization configuration allowing the FastMCP server to be deployed as an online service.
* **FastAPI Gateway:** Exposes health checks (`/health`, `/ready`), discovery pathways (`/`), and system stats (`/info`, `/metrics`) alongside mounted MCP Server-Sent Events (SSE) and Streamable HTTP transports.
* **Stateless Token Authentication:** Middleware securing `/ready`, `/info`, `/metrics`, and `/mcp` endpoints using `Authorization: Bearer <token>` validation.
* **Stateless Configuration Engine:** Created `backend/config.py` as the single configuration manager, removing all scattered `os.getenv` calls.
* **Resilience Retry Engine:** Pinned HTTP request timeouts to 10.0s and implemented a 3-retry exponential backoff policy (0.5s, 1s, 2s) for Apps Script calls.
* **Startup Verification Check:** Fail-fast checklist checking variables, URLs, pings, and tools on server boot.
* **CI/CD Pipelines:** Created Google Cloud Build (`cloudbuild.yaml`) and GitHub Actions workflows (`.github/workflows/deploy.yml`) with health check gate validations.
* **Documentation Guides:** Created `/backend/README.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md`, and this `CHANGELOG.md` document.

### Changed
* **Repository Reorganization:** Relocated the Python MCP server files from `bakatracker-mcp/` directly to the `backend/` folder (`backend/server.py`, `backend/tools/`, etc.).

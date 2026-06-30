# 🛡️ Security Policy

This document explains BakaTracker's security model, data ownership boundaries, and instructions to secure your database and API endpoints.

---

## 🏛️ Threat Model & Security Boundaries

BakaTracker does not own or store your personal tracking data. Data storage is delegated to your personal Google Sheet, meaning:
* You are the sole custodian of your history.
* The application works with no central signup, preventing database leak vectors.

---

## 🔑 Database Proxy Security (Google Apps Script)

### Apps Script Execution Context
When deploying `google-apps-script.js`, you configure:
* **Execute as:** `Me` (This allows the script to read and write rows to the attached spreadsheet on your behalf).
* **Who has access:** `Anyone` (This makes the endpoint public so your React client and MCP server can query it).

### Securing the Public Apps Script URL
Because the Apps Script Web App URL is public, you must configure API key authorization:
1. In your Google Sheet, select the **Settings** sheet tab.
2. In the `api_key` cell parameter, enter a long, random string.
3. Once set, the Apps Script checks for a matching `apiKey` parameter on all GET and POST requests, returning a `403 Forbidden` if it is missing or incorrect.

---

## 🐍 Gateway Security (Google Cloud Run)

The containerized backend parses natural language prompts and translates them to Sheets API updates. 

### Bearer Token Authentication
To prevent crawlers, bots, or unauthorized clients from triggering tools (e.g. creating/deleting tasks), the FastAPI gateway implements token middleware:
* **Token Configuration:** Define a secure `AUTH_TOKEN` environment variable in your Cloud Run settings.
* **Header Verification:** The gateway intercepts all requests to `/ready`, `/info`, `/metrics`, and `/mcp`. It checks for the header `Authorization: Bearer <AUTH_TOKEN>`.
* **Fail-Fast Boot:** If `AUTH_TOKEN` is missing, the startup check fails and the container shuts down.

---

## 🔒 Secrets Best Practices

* **Do Not Commit Secrets:** Never commit `.env` files to git. Ensure `backend/.env` is included in `.gitignore`.
* **Use Cloud Run Environment Variables:** In production, do not hardcode secrets in your Docker image. Configure variables securely via the Google Cloud Console.
* **Keep API Keys Distinct:** Use different keys for `AUTH_TOKEN` (MCP client authentication) and the Sheets `api_key` (Apps Script database authorization).

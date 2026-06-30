# 🔍 Troubleshooting and Diagnostics Guide

Use this manual to diagnose and resolve common errors in BakaTracker's frontend, backend gateway, or spreadsheet database.

---

## 🐍 Google Cloud Run & FastAPI Errors

### 1. Revision Deployment Fails (Container Crash on Startup)
* **Symptom:** Cloud Run displays "Revision failed to start" or container prints exit code `1` during boot.
* **Explanation:** The startup checklist failed.
* **Resolution:**
  1. Open Google Cloud Run Console.
  2. Navigate to **Logs** for the failing revision.
  3. Look for `Startup validation failed:` logs.
  4. Common issues:
     * `GOOGLE_APPS_SCRIPT_URL configuration is missing`: Configure this environment variable.
     * `AUTH_TOKEN configuration is missing`: Configure the Bearer token.
     * `GOOGLE_APPS_SCRIPT_URL must start with http:// or https://`: Correct your Apps Script Web App URL formatting.

### 2. 401 Unauthorized Errors
* **Symptom:** MCP clients fail to execute tools and log HTTP `401 Unauthorized`.
* **Explanation:** The client didn't supply a matching Bearer token.
* **Resolution:**
  1. Confirm the client includes the header `Authorization: Bearer <AUTH_TOKEN>`.
  2. Check that the token passed matches the `AUTH_TOKEN` environment variable configured in your Cloud Run settings.
  3. Note that Cursor and Claude require headers to be formatted precisely (case-sensitive).

---

## 🗄️ Google Sheets & Apps Script Errors

### 3. 503 Service Unavailable (Apps Script URL unreachable)
* **Symptom:** The backend logs timeout errors or `/ready` returns HTTP `503`.
* **Explanation:** The API client failed to reach Google Apps Script within 10 seconds.
* **Resolution:**
  1. Test your Apps Script URL directly in your browser. It should return a success JSON payload or ask for API key verification.
  2. If the URL returns `404 Not Found` or permissions errors:
     * Open your Sheets Apps Script editor.
     * Click **Deploy** > **Manage deployments**.
     * Confirm the active deployment type is **Web app**.
     * Verify **Execute as** is configured as `Me` and **Who has access** is set to `Anyone`.
     * If you modified the script code, ensure you clicked **New deployment** rather than updating an old one.

### 4. 403 Forbidden / API Key Failures
* **Symptom:** Frontend sync shows red error indicators, or backend fetches fail with invalid API key warnings.
* **Explanation:** Your spreadsheet **Settings** sheet has a value in `api_key` but your request didn't match it.
* **Resolution:**
  1. Check the **Settings** sheet inside your Google Spreadsheet and verify the `api_key` cell value.
  2. Confirm your React app settings or backend `.env` variables match this key.
  3. If you want to disable API key protection, clear the `api_key` cell value in the spreadsheet Settings tab.

---

## 💻 Frontend PWA & Vite Errors

### 5. Changes Do Not Show Up (PWA Cache Issue)
* **Symptom:** You push code changes to Cloudflare Pages but the browser still displays the old version.
* **Explanation:** The Progressive Web App Service Worker is caching index assets.
* **Resolution:**
  1. Close all browser tabs displaying BakaTracker.
  2. Open the app, press `F12` to open developer tools, and navigate to the **Application** > **Service Workers** tab.
  3. Click **Unregister** and refresh the page.
  4. To force-update the service worker on mobile, clear browser site data for BakaTracker.

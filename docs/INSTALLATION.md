# ⚙️ Installation and Setup Guide

This guide provides step-by-step instructions to install BakaTracker, configure Google Sheets as your database, deploy the Apps Script API bridge, and launch the frontend and backend servers.

---

## 🛠️ Prerequisites

Before you start, ensure your development environment has the following installed:
* **Node.js** (v18.0.0 or higher) & **npm** (v9.0.0 or higher).
* **Python** (v3.12.0 or higher).
* **uv** (astral python package manager) - [Installation instructions](https://github.com/astral-sh/uv).
* **Google Account** (to access Google Sheets and Apps Script).
* **Google Cloud SDK (gcloud)** - (Required only for Cloud Run backend deployments).

---

## 🗄️ Step 1: Database Setup (Google Sheets)

BakaTracker uses a personal Google Sheet as its serverless relational database.

### 1. Create a New Spreadsheet
1. Go to [Google Sheets](https://sheets.google.com).
2. Create a blank spreadsheet.
3. Rename the sheet to `BakaTracker DB`.
4. Copy the spreadsheet URL from your browser's address bar. (e.g. `https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit`).

### 2. Deploy the Apps Script Proxy Web App
1. Inside your new spreadsheet, select **Extensions** > **Apps Script**.
2. Delete any boilerplate code in the editor.
3. Open the BakaTracker repository and copy the entire contents of [google-apps-script.js](file:///d:/Portfilo_build.srivatsa/BakaTracker/google-apps-script.js).
4. Paste the code into the Apps Script editor.
5. Save the project (click the disk icon) and rename it to `BakaTracker Sync Bridge`.

### 3. Deploy as a Web App
1. Click the **Deploy** button (top right) and select **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Configure the deployment details:
   * **Description:** `BakaTracker Database API v1.0`
   * **Execute as:** `Me (your_email@gmail.com)` *(Important: This allows the script to write to your Sheet)*
   * **Who has access:** `Anyone` *(Important: This is protected by your API key settings)*
4. Click **Deploy**.
5. Grant permissions: Click **Authorize access**, choose your Google account, select **Advanced** > **Go to BakaTracker Sync Bridge (unsafe)**, and click **Allow**.
6. Copy the **Web App URL** generated in the deployment dialog. It will look like this:
   `https://script.google.com/macros/s/AKfycby.../exec`

### 4. (Optional but Recommended) Setup API Security Key
1. In your newly created spreadsheet, click on the automatically generated **Settings** sheet tab (Apps Script creates it on its first execute check-in).
2. In the `api_key` parameter cell, type a custom password or token string.
3. If set, all frontend sync payloads and backend MCP requests must supply this API key to permit read/write access.

---

## 💻 Step 2: Local Frontend Installation

The React frontend runs as a progressive web application:

1. In your terminal, navigate to the project root:
   ```bash
   cd BakaTracker
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the web app at `http://localhost:5173`.
5. Connect your spreadsheet:
   * Open the app in your browser.
   * Navigate to the **Settings** gear page in the left sidebar.
   * Paste your **Google Apps Script Web App URL** and your custom **API Key** in the corresponding inputs.
   * Click **Test Connection** and verify that sync indicators turn green.

---

## 🐍 Step 3: Local Backend Installation (MCP)

To configure and execute the Model Context Protocol (MCP) server:

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Initialize the virtualenv and install dependencies:
   ```bash
   uv sync
   ```
3. Create a local environment file:
   ```bash
   cp .env.example .env
   ```
4. Edit `.env` with your actual deployment URLs and custom keys:
   ```ini
   GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycby.../exec
   GOOGLE_APPS_SCRIPT_API_KEY=your_optional_sheets_api_key
   AUTH_TOKEN=your_mcp_access_bearer_token
   PORT=8080
   LOG_LEVEL=INFO
   TIMEOUT=10.0
   ```
5. Launch the FastAPI server:
   ```bash
   uv run uvicorn main:app --port 8080
   ```

---

## 🚀 Step 4: Hosting & Production Deployments

For complete walkthroughs on pushing your builds to live servers, see:
* **Frontend Hosting:** [docs/DEPLOYMENT.md](DEPLOYMENT.md#cloudflare-pages) for Cloudflare Pages setup.
* **Backend Hosting:** [docs/DEPLOYMENT.md](DEPLOYMENT.md#google-cloud-run) for containerized Google Cloud Run deployments.

# 💬 Frequently Asked Questions (FAQ)

Here are the answers to 30 common questions about BakaTracker's design, database layer, server setup, and MCP integrations.

---

### 🏛️ General Questions

#### 1. What is BakaTracker?
BakaTracker is a minimalist, ADHD-first life planner that compiles habit logs, task backlogs, daily highlights, and user statistics into a gamified, offline-first dashboard.

#### 2. Why is it designed "ADHD-First"?
Traditional planner apps induce anxiety through complex nested folders and endless scheduling tools. BakaTracker lowers friction by separating planning (Master board) from doing (Today board) and enforcing a 30-second daily routine.

#### 3. How does the gamification work?
Toggling habits and completing quests awards Experience Points (XP) across five life categories (Discipline, Health, Knowledge, Creativity, and Career). Gaining 100 XP levels up your character.

#### 4. Can I disable the RPG/gamification elements?
There is no direct toggle to disable XP. However, because the design is highly minimalist, you can simply ignore the character tier text and level indicators on the Habits and Journey pages.

#### 5. Is BakaTracker open-source?
Yes, BakaTracker is open-source software licensed under the MIT License.

---

### 🗄️ Database & Self-Hosting

#### 6. Can I self-host BakaTracker?
Yes! Both the frontend React PWA (on Cloudflare Pages, Vercel, or Netlify) and the backend MCP server (on Google Cloud Run, Render, or a VPS) can be self-hosted.

#### 7. Do I need to pay hosting fees?
No. BakaTracker fits entirely within the free tiers of Cloudflare Pages, Google Cloud Run (by scaling containers to zero), and Google Sheets/Apps Script.

#### 8. Can I replace Google Sheets with a SQL database like PostgreSQL or MySQL?
Not in Version 1.0. The state-management service expects the JSON collection structures returned by the Apps Script endpoint. Support for local SQLite fallbacks is planned for V2.0.

#### 9. Can I use Supabase instead of Google Sheets?
No. While Supabase is excellent, BakaTracker is designed around the free, zero-config availability of Google Drive. Support for alternate backends is planned for V2.1.

#### 10. Can I connect BakaTracker to Notion?
No. Notion's API is too slow for real-time background syncs and does not support flat relational transactions matching BakaTracker's JSON collection payload.

#### 11. Can I use Airtable?
Not natively. You would need to write a custom sync client replacing `sheetsService.ts` to map Airtable tables to BakaTracker's collections.

#### 12. Can I use Microsoft Excel instead of Google Sheets?
No. BakaTracker is built around Google Apps Script Web App endpoints which are unique to the Google Workspace ecosystem.

---

### 🔄 Syncing & Offline Mode

#### 13. How does the local-first caching work?
The React client writes state changes immediately to browser `localStorage` via Zustand persist middleware. The app remains fully functional and updates the UI instantly, even when offline.

#### 14. What happens if I go offline? Will I lose my data?
No. If the app is offline, the sync status changes to "offline" and updates are queued locally. Once internet connectivity is restored, the client pushes the queued changes.

#### 15. How does conflict resolution work?
Currently, BakaTracker uses a "last-write-wins" policy where the last device to sync overwrites the sheet. Implementing `last_modified` conflict checks is the primary objective of Version 1.1.

#### 16. What are the limits of using Google Sheets as a database?
Google Sheets can store up to 10 million cells. For typical daily tracking, BakaTracker will take decades of continuous use to approach this limit.

#### 17. How fast is the background synchronization?
POST requests to Google Apps Script typically take **1.5 to 3.5 seconds**. The sync runs asynchronously in the background so you never experience interface lag.

---

### 🔌 MCP & AI Integrations

#### 18. What is the Model Context Protocol (MCP)?
MCP is an open standard that allows LLMs (like Cursor or Claude) to securely execute tools and read file-like resources on your local machine or remote servers.

#### 19. Can ChatGPT control my tracker?
Yes! If you deploy the FastMCP server and configure it as an HTTP endpoint, you can link ChatGPT to trigger habits or add tasks using natural language.

#### 20. How do I connect Claude Desktop to BakaTracker?
Add the SSE connection blocks (defining the URL and Authorization Bearer header) into your `claude_desktop_config.json`.

#### 21. How do I configure Cursor to use BakaTracker?
Add a new MCP server in Cursor settings: Set `Transport: sse`, enter your deployed Cloud Run URL, and supply your Bearer Auth header.

#### 22. Can I use BakaTracker with VS Code?
Yes, using MCP-compatible extensions (like Cline or Roo Code) that support remote Server-Sent Events (SSE).

#### 23. What is the MCP Inspector and how do I run it?
The MCP Inspector is a developer utility to test MCP tools locally. Run `uv run mcp dev server.py` from the `backend/` directory to launch it.

---

### 🛡️ Security & Privacy

#### 24. Is my data secure in Google Sheets?
Yes. Your spreadsheet resides in your private Google Drive and is only accessible to you and the Apps Script proxy Web App.

#### 25. What permissions does Google Apps Script require?
It requires access to modify the specific spreadsheet it is attached to. It does not access your other Google Drive files.

#### 26. How does the Bearer token protect my Cloud Run backend?
The FastAPI middleware blocks all unauthorized requests to `/mcp`, `/ready`, `/info`, and `/metrics`. Only clients supplying the matching token can access your tools.

#### 27. Where are my secret keys stored?
Local keys are stored in `backend/.env`. In production, they are configured as secure environment variables in Google Cloud Run.

---

### 🔧 Troubleshooting & Performance

#### 28. Why did my Cloud Run container crash on startup?
The startup verification checklist will fail-fast if required environment variables (`GOOGLE_APPS_SCRIPT_URL`, `AUTH_TOKEN`) are missing, or if the URL format is invalid. Check Cloud Run logs.

#### 29. Why am I getting 401 Unauthorized errors?
Ensure your MCP client or curl request includes the header `Authorization: Bearer <AUTH_TOKEN>`.

#### 30. How do I back up my database?
Since your database is stored inside a Google Sheet, you can back it up at any time by selecting **File** > **Download** > **Microsoft Excel (.xlsx)** or **PDF** from the Google Sheets menu.

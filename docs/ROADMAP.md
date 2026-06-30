# 🗺️ Roadmap and Version Releases

This document maps out BakaTracker's version roadmap, feature timelines, and known limitations.

---

## 🚀 Released: Version 1.0 (Current)
* **Core PWA:** Offline-first React 19 web app with local storage caching and service workers.
* **Database Bridge:** Google Apps Script REST interface mapping Sheets as a serverless database.
* **FastMCP Server:** Deployed FastAPI/FastMCP backend running on Google Cloud Run.
* **Security & Reliability:** Bearer token authentication middleware and 3x exponential backoff request retries.
* **Gamification:** Five attributes, XP ledger, and consistency heatmaps.

---

## 🟨 Next: Version 1.1 (Near-Term)
* **Conflict Resolution:** Implement a `last_modified` timestamp parameter in all collections to compare local and remote states, prompting merge conflicts rather than blindly overwriting sheets.
* **Tracker Archiving:** Add an `archived` boolean to the `Habit` model. This hides habits from the active Today board while preserving streaks and XP stats in historical Journey charts.
* **Overlay Portals:** Refactor focus-mode dimmer screens on the Today board into clean React portals to resolve z-index bugs in mobile viewports.

---

## 🎯 Target: Version 2.0 (Mid-Term)
* **SQLite Fallback Database:** Integrate a local database (SQLite/IndexedDB) allowing BakaTracker to run fully standalone without requiring any Google Sheets setup.
* **Achievements & Badges:** Unlocking achievements (e.g. *discipline level 10*, *100 days streak*) that grant customizable title headers on your profile.
* **Data Exporters:** Exporting complete databases to raw JSON or CSV files directly from the browser Settings.

---

## 🦄 Future: Version 3.0 (Long-Term)
* **Gamified Companions:** Minimalist retro tamagotchi-like widgets on the Journey tab that grow based on daily consistency scores.
* **Physical Planner Exporter:** Generate printable PDF sheets formatted as weekly planners summarizing your BakaTracker habits, highlight reviews, and Weekly Wins.

---

## ⚠️ Known Limitations & Constraints

### Google Sheets Request Latency
Because synchronization requires routing payloads to the Google Apps Script compiler and modifying spreadsheet rows, sync POST requests take **1.5 to 3.5 seconds** to complete.
* *Mitigation:* The React client performs all changes locally in Zustand instantly and runs the sync asynchronously in the background.

### API Quota Throttling
Google enforces execution limits on Apps Script Web Apps (e.g. maximum of 5,000 requests per day for standard accounts).
* *Mitigation:* The React PWA implements debounced sync calls, delaying background updates until the user finishes editing.

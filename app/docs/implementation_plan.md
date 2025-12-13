# BakaTracker PWA - Implementation Plan

**Production URL:** `https://bakatracker.buildsrivatsa.qzz.io`

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | React 18 + Vite 5 |
| Styling | TailwindCSS v4 |
| PWA | Vite PWA Plugin + Workbox |
| Auth | Google Sign-In (GAPI) |
| Database | Google Sheets API |
| Voice | Web Speech API |
| Icons | Material Symbols |

---

## Project Structure

```
app/
├── src/
│   ├── components/     # BottomNav, TopBar, HabitCard, TaskCard, etc.
│   ├── pages/          # Login, Dashboard, Habits, Tasks, Stats, Settings, SpeechMode
│   ├── services/       # auth.js, sheets.js
│   ├── context/        # AppContext.jsx
│   └── config/         # google.js (API credentials)
├── docs/               # Documentation
├── GOOGLE_SETUP.md     # Setup instructions
└── vite.config.js      # PWA configuration
```

---

## Database Schema (Google Sheets)

| Sheet | Columns |
|-------|---------|
| Habits | id, name, icon, color, frequency, createdAt, streak, goal |
| HabitLogs | id, habitId, date, completed, notes |
| Tasks | id, title, description, dueDate, dueTime, priority, category, completed, createdAt |
| Settings | key, value |

---

## Deployment

1. Build: `npm run build`
2. Upload `dist/` to GCP VM
3. Configure Nginx for `buildsrivatsa.qzz.io`
4. Add domain to Google OAuth origins
5. Enable HTTPS with Certbot

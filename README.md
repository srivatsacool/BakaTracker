# 🎯 BakaTracker

> **A beautiful, privacy-focused PWA for habit tracking and task management — your data stays in YOUR Google Sheets.**

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TailwindCSS-4.1-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA Ready" />
</p>

---

## 🌟 Features

### 📊 **Dashboard**
- Daily overview with personalized greeting
- Quick stats: habits tracked, tasks due, current streaks
- Today's habits and upcoming tasks at a glance
- Progress visualization with beautiful charts

### ✅ **Habit Tracking**
- Create and manage daily/weekly habits
- Visual streak tracking with fire emoji 🔥
- Custom icons and colors for each habit
- Log completions with optional notes
- Frequency settings (daily, weekly, custom)

### 📝 **Task Management**
- Full-featured task list with priorities
- Due dates and times with reminders
- Category organization
- Mark complete/incomplete
- Overdue task highlighting

### 📈 **Stats & Analytics**
- Weekly and monthly habit completion rates
- Streak history and best streaks
- Task completion analytics
- Visual progress charts

### 🎤 **Speech Mode** *(Hands-free)*
- Voice-activated task creation
- Natural language processing for dates
- Perfect for on-the-go productivity

### ⚙️ **Settings**
- Dark/Light mode toggle
- Profile customization
- Data export capabilities
- Sync status monitoring

---

## 🔐 Privacy First

**Your data never touches our servers.** BakaTracker stores everything directly in a Google Spreadsheet in YOUR Google Drive:

| Sheet | Purpose |
|-------|---------|
| `Habits` | Your habit definitions |
| `HabitLogs` | Daily habit completions |
| `Tasks` | Your task list |
| `Settings` | App preferences |

> Simply sign in with Google, and BakaTracker creates a spreadsheet called "BakaTracker Data" in your Drive. You own it, you control it.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Google Cloud Project** with Sheets API enabled (see [Google Setup Guide](./GOOGLE_SETUP.md))

### Installation

```bash
# Clone the repository
git clone https://github.com/srivatsacool/BakaTracker.git
cd BakaTracker

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:5173`

### Configuration

1. Follow the [Google Setup Guide](./GOOGLE_SETUP.md) to get your credentials
2. Update `src/config/google.js` with your Client ID and API Key:

```javascript
export const GOOGLE_CONFIG = {
  CLIENT_ID: 'your-client-id.apps.googleusercontent.com',
  API_KEY: 'your-api-key',
  // ...
};
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 19** | UI Framework with latest features |
| **Vite 5** | Lightning-fast build tool |
| **TailwindCSS 4** | Utility-first styling |
| **React Router 7** | Client-side routing |
| **Workbox** | PWA service worker |
| **Google Identity Services** | OAuth 2.0 authentication |
| **Google Sheets API** | Backend data storage |

---

## 📁 Project Structure

```
BakaTracker/
├── public/              # Static assets
├── src/
│   ├── assets/          # Images and icons
│   ├── components/      # Reusable UI components
│   │   ├── BottomNav.jsx
│   │   ├── HabitCard.jsx
│   │   ├── TaskCard.jsx
│   │   ├── ProgressBar.jsx
│   │   ├── LoadingSpinner.jsx
│   │   └── TopBar.jsx
│   ├── config/
│   │   └── google.js    # Google API configuration
│   ├── context/
│   │   └── AppContext.jsx  # Global state management
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Habits.jsx
│   │   ├── Tasks.jsx
│   │   ├── Stats.jsx
│   │   ├── Settings.jsx
│   │   ├── SpeechMode.jsx
│   │   └── Login.jsx
│   ├── services/
│   │   ├── auth.js      # Google authentication
│   │   └── sheets.js    # Google Sheets API wrapper
│   ├── App.jsx          # Main app with routing
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── DEPLOY.md            # Deployment instructions
├── GOOGLE_SETUP.md      # Google Cloud setup guide
├── package.json
└── vite.config.js       # Vite + PWA configuration
```

---

## 📱 PWA Features

BakaTracker is a fully-featured Progressive Web App:

- ✅ **Installable** - Add to home screen on any device
- ✅ **Offline capable** - Works without internet (cached assets)
- ✅ **Responsive** - Beautiful on mobile, tablet, and desktop
- ✅ **Fast** - Pre-cached assets for instant loading
- ✅ **Auto-update** - Prompts when new version is available

---

## 🌐 Deployment

BakaTracker is deployed at: **https://bakatracker.buildsrivatsa.qzz.io**

### Deploy to Your Own Server

See the complete [Deployment Guide](./DEPLOY.md) for:
- GitHub Actions automated deployment
- Nginx configuration
- SSL setup with Certbot
- VM setup instructions

### Quick Deploy Commands

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview

# The `dist/` folder contains the static files to deploy
```

---

## 🎨 Screenshots

| Dashboard | Habits | Tasks |
|-----------|--------|-------|
| Daily overview with progress | Track your daily habits | Manage your to-do list |

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**Srivatsa**

- GitHub: [@srivatsacool](https://github.com/srivatsacool)
- Website: [buildsrivatsa.qzz.io](https://buildsrivatsa.qzz.io)

---

## 🙏 Acknowledgments

- Google Sheets API for the serverless backend approach
- Vite team for the amazing build tool
- React team for React 19 features
- TailwindCSS for beautiful utility-first styling

---

<p align="center">
  Made with ❤️ by Srivatsa
</p>

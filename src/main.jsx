import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Initialize theme before render to prevent flash
const initTheme = () => {
  const saved = localStorage.getItem('bakatracker_theme');
  // Default to dark if no preference saved
  const isDark = saved ? saved === 'dark' : true;
  
  if (isDark) {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  }
  
  // Save default if not set
  if (!saved) {
    localStorage.setItem('bakatracker_theme', 'dark');
  }
};

initTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

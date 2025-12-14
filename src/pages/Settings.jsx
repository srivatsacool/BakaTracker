// Settings Page with working controls
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { BottomNav } from '../components';

export const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useApp();
  const { isDark, toggleTheme } = useTheme();
  
  const [notifications, setNotifications] = useState(() => {
    return localStorage.getItem('bakatracker_notifications') !== 'false';
  });
  
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  const handleLogout = () => {
    signOut();
    navigate('/');
  };
  
  const handleNotificationsToggle = () => {
    const newValue = !notifications;
    setNotifications(newValue);
    localStorage.setItem('bakatracker_notifications', String(newValue));
    
    if (newValue && 'Notification' in window) {
      Notification.requestPermission();
    }
  };
  
  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white antialiased transition-colors duration-200 min-h-screen overflow-y-auto pb-24">
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border-b border-white/20 dark:border-white/5 p-4 pb-2 justify-between transition-all duration-300">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-slate-900 dark:text-white flex size-10 shrink-0 items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">
            Settings
          </h2>
        </div>
        
        <div className="flex-1 flex flex-col gap-6 p-4 pb-12">
          {/* Profile Card */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 p-4 rounded-2xl shadow-sm">
              <div
                className="bg-center bg-no-repeat bg-cover rounded-full h-20 w-20 ring-2 ring-primary ring-offset-2 ring-offset-white/50 dark:ring-offset-slate-900 shrink-0 shadow-lg flex items-center justify-center"
                style={{
                  backgroundImage: user?.picture
                    ? `url("${user.picture}")`
                    : 'linear-gradient(135deg, #3B82F6 0%, #1d4ed8 100%)',
                }}
              >
                {!user?.picture && (
                  <span className="text-white text-2xl font-bold">
                    {user?.name?.[0] || 'U'}
                  </span>
                )}
              </div>
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-900 dark:text-white text-xl font-bold leading-tight tracking-[-0.015em] truncate text-shadow-sm">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 text-sm font-medium mt-1">
                      {user?.email || 'user@example.com'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Settings Sections */}
          <div className="flex flex-col bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
            {/* Notifications */}
            <button
              onClick={handleNotificationsToggle}
              className="flex items-center gap-4 p-4 min-h-[64px] justify-between border-b border-white/20 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
                  <span className="material-symbols-outlined">notifications</span>
                </div>
                <p className="text-slate-900 dark:text-white text-base font-medium">Notifications</p>
              </div>
              <div className="relative">
                <div className={`w-11 h-6 rounded-full transition-colors ${notifications ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <div className={`absolute top-[2px] size-5 bg-white border border-gray-300 rounded-full transition-transform shadow ${notifications ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                </div>
              </div>
            </button>
            
            {/* Dark Mode */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-4 p-4 min-h-[64px] justify-between border-b border-white/20 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="text-blue-500 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 shrink-0 size-10">
                  <span className="material-symbols-outlined">{isDark ? 'dark_mode' : 'light_mode'}</span>
                </div>
                <p className="text-slate-900 dark:text-white text-base font-medium">Dark Mode</p>
              </div>
              <div className="relative">
                <div className={`w-11 h-6 rounded-full transition-colors ${isDark ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <div className={`absolute top-[2px] size-5 bg-white border border-gray-300 rounded-full transition-transform shadow ${isDark ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
                </div>
              </div>
            </button>
            
            {/* Backup & Sync */}
            <button
              onClick={() => setShowBackupModal(true)}
              className="flex items-center gap-4 p-4 min-h-[64px] justify-between border-b border-white/20 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="text-purple-500 flex items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/20 shrink-0 size-10">
                  <span className="material-symbols-outlined">backup</span>
                </div>
                <p className="text-slate-900 dark:text-white text-base font-medium">Backup & Sync</p>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>
            
            {/* Help & Support */}
            <button
              onClick={() => setShowHelpModal(true)}
              className="flex items-center gap-4 p-4 min-h-[64px] justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="text-slate-500 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 size-10">
                  <span className="material-symbols-outlined">help</span>
                </div>
                <p className="text-slate-900 dark:text-white text-base font-medium">Help & Support</p>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </button>
          </div>
          
          {/* Logout Button */}
          <div className="flex flex-col bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={handleLogout}
              className="flex items-center gap-4 p-4 min-h-[64px] justify-between cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group w-full"
            >
              <div className="flex items-center gap-4">
                <div className="text-red-500 group-hover:text-red-600 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 shrink-0 size-10 transition-colors">
                  <span className="material-symbols-outlined">logout</span>
                </div>
                <p className="text-red-500 group-hover:text-red-600 text-base font-medium leading-normal flex-1 truncate transition-colors">
                  Log Out
                </p>
              </div>
            </button>
          </div>
          
          {/* Version Info */}
          <div className="text-center text-xs text-slate-400 dark:text-slate-500 mt-4">
            <p>BakaTracker v1.0.0</p>
            <p className="mt-1">Made with ❤️</p>
          </div>
        </div>
      </div>
      
      {/* Backup Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Backup & Sync</h3>
              <button
                onClick={() => setShowBackupModal(false)}
                className="size-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                <span className="material-symbols-outlined text-green-600">cloud_done</span>
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Synced to Google Sheets</p>
                  <p className="text-xs text-green-600 dark:text-green-500">All data backed up automatically</p>
                </div>
              </div>
              
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Your data is stored in a Google Sheet in your Drive. You can access it anytime.
              </p>
              
              <button
                onClick={() => {
                  const spreadsheetId = localStorage.getItem('bakatracker_spreadsheet_id');
                  if (spreadsheetId) {
                    window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, '_blank');
                  }
                  setShowBackupModal(false);
                }}
                className="w-full py-3 rounded-xl bg-primary text-white font-medium"
              >
                Open Google Sheet
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Help & Support</h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="size-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-slate-900 dark:text-white">Quick Tips</h4>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <li>• Tap habits to mark them complete</li>
                  <li>• Use voice input for hands-free task creation</li>
                  <li>• Upload screenshots to create tasks from dates</li>
                  <li>• Set goals to track long-term progress</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-slate-900 dark:text-white">Contact</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  For issues or feedback, visit our GitHub repository.
                </p>
              </div>
              
              <button
                onClick={() => setShowHelpModal(false)}
                className="w-full py-3 rounded-xl bg-primary text-white font-medium"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
      
      <BottomNav />
    </div>
  );
};

export default Settings;

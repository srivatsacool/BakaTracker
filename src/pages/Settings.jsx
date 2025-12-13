// Settings Page
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { BottomNav } from '../components';

export const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useApp();
  
  const handleLogout = () => {
    signOut();
    navigate('/');
  };
  
  return (
    <div className="bg-gradient-to-b from-background-light to-background-light/80 dark:from-background-dark dark:to-background-dark/80 font-display text-slate-900 dark:text-white antialiased transition-colors duration-200 min-h-screen overflow-y-auto pb-24">
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
                className="bg-center bg-no-repeat bg-cover rounded-full h-20 w-20 ring-2 ring-primary ring-offset-2 ring-offset-white/50 dark:ring-offset-slate-900 shrink-0 shadow-lg"
                style={{
                  backgroundImage: user?.picture
                    ? `url("${user.picture}")`
                    : 'linear-gradient(135deg, #13ec80 0%, #0d9d5c 100%)',
                }}
              >
                {!user?.picture && (
                  <span className="flex items-center justify-center size-full text-white text-2xl font-bold">
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
            <div className="flex items-center gap-4 p-4 min-h-[64px] justify-between border-b border-white/20 dark:border-white/5">
              <div className="flex items-center gap-4">
                <div className="text-primary flex items-center justify-center rounded-lg bg-primary/10 shrink-0 size-10">
                  <span className="material-symbols-outlined">notifications</span>
                </div>
                <p className="text-slate-900 dark:text-white text-base font-medium">Notifications</p>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </div>
            
            <div className="flex items-center gap-4 p-4 min-h-[64px] justify-between border-b border-white/20 dark:border-white/5">
              <div className="flex items-center gap-4">
                <div className="text-blue-500 flex items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20 shrink-0 size-10">
                  <span className="material-symbols-outlined">dark_mode</span>
                </div>
                <p className="text-slate-900 dark:text-white text-base font-medium">Dark Mode</p>
              </div>
              <div className="relative">
                <input type="checkbox" defaultChecked className="sr-only peer" id="darkmode" />
                <label
                  htmlFor="darkmode"
                  className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary cursor-pointer"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 min-h-[64px] justify-between border-b border-white/20 dark:border-white/5">
              <div className="flex items-center gap-4">
                <div className="text-purple-500 flex items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-900/20 shrink-0 size-10">
                  <span className="material-symbols-outlined">backup</span>
                </div>
                <p className="text-slate-900 dark:text-white text-base font-medium">Backup & Sync</p>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </div>
            
            <div className="flex items-center gap-4 p-4 min-h-[64px] justify-between">
              <div className="flex items-center gap-4">
                <div className="text-slate-500 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 size-10">
                  <span className="material-symbols-outlined">help</span>
                </div>
                <p className="text-slate-900 dark:text-white text-base font-medium">Help & Support</p>
              </div>
              <span className="material-symbols-outlined text-slate-400">chevron_right</span>
            </div>
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
      
      <BottomNav />
    </div>
  );
};

export default Settings;

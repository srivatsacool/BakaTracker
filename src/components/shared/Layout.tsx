import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Flame, ListTodo, Target, BookOpen, Compass, Cloud, CloudOff, Settings as SettingsIcon, X, Sun, Moon, ChevronLeft, ChevronRight, Download, WifiOff, LayoutGrid, Zap, Play } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { calculateDailyScore, getTodayDateString } from '../../lib/utils';
import { OnboardingBanner } from './OnboardingBanner';
import { UserMenu } from '../user/UserMenu';
import { FirstRunWizard } from './FirstRunWizard';
import { useAppTour } from '../../lib/useAppTour';


export const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { startTour } = useAppTour(navigate);
  const { stats, settings, syncStatus, syncError, habits, habitLogs, tasks, journal, syncWithSheets, setSheetsUrl, setApiKey, theme, toggleTheme, setAccentColors, loadDemoData, clearDataByDays } = useStore();
  
  const todayStr = getTodayDateString();
  const dailyScore = calculateDailyScore(todayStr, habits, habitLogs, tasks, journal);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [inputUrl, setInputUrl] = useState(settings.sheets_url);
  const [inputApiKey, setInputApiKey] = useState(settings.api_key || '');
  const [inputAccentLight, setInputAccentLight] = useState(settings.accent_color_light || '#FF90E8');
  const [inputAccentDark, setInputAccentDark] = useState(settings.accent_color_dark || '#FF90E8');
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('bt_sidebar_collapsed') === 'true';
  });

  const [clearDays, setClearDays] = useState<number | 'all'>(7);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);

  // PWA & Offline State
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleToggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('bt_sidebar_collapsed', String(next));
  };

  const navItems = [
    { path: '/habits', name: 'Habits', icon: Flame },
    { path: '/tasks', name: 'Tasks', icon: ListTodo },
    { path: '/eisenhower', name: 'Matrix', icon: LayoutGrid },
    { path: '/today', name: 'Today', icon: Target },
    { path: '/journal', name: 'Journal', icon: BookOpen },
    { path: '/journey', name: 'Journey', icon: Compass }
  ];

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await setSheetsUrl(inputUrl);
    await setApiKey(inputApiKey);
    setAccentColors(inputAccentLight, inputAccentDark);
    setShowSettingsModal(false);
  };

  const handleResetColors = () => {
    setInputAccentLight('#FF90E8');
    setInputAccentDark('#FF90E8');
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col ${isCollapsed ? 'w-20' : 'w-64'} bg-surface border-r-4 border-black p-4 transition-all duration-300 shrink-0 justify-between relative`}>
        {/* Toggle Sidebar Collapse Button (Desktop Only) */}
        <button
          onClick={handleToggleCollapse}
          className="absolute top-4 -right-3.5 bg-accent-pink border-2 border-black rounded-full p-1 shadow-gumroad-sm hover:translate-x-[1px] hover:translate-y-[1px] transition hidden md:block z-10 cursor-pointer"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4 text-black" /> : <ChevronLeft className="w-4 h-4 text-black" />}
        </button>

        <div className="flex flex-col gap-6">
          {/* Logo / Title */}
          <div id="sidebar-logo" className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} transition-all`}>
            <img src="/logo.png" alt="BakaTracker Logo" className="w-10 h-10 border-2 border-black rounded-lg shadow-gumroad-sm object-cover" />
            {!isCollapsed && (
              <div className="transition-all duration-300">
                <h1 className="text-xl font-bold tracking-tight m-0 leading-none">BakaTracker</h1>
                <span className="text-[10px] text-gray-500 font-mono">Life RPG</span>
              </div>
            )}
          </div>

          {/* User Character Stats Card */}
          <div id="sidebar-level-bar" className={`neo-card ${isCollapsed ? 'p-2 items-center' : 'p-4'} bg-accent-pink/10 flex flex-col gap-3 transition-all`}>
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-2.5">
                <span className="font-bold font-mono text-xs bg-black text-white px-1.5 py-0.5 rounded border border-black shadow-gumroad-sm" title={`Level ${stats.level}`}>
                  L{stats.level}
                </span>
                
                {/* Sync indicator */}
                {settings.sheets_url ? (
                  <button 
                    onClick={() => syncWithSheets()} 
                    title={syncStatus === 'loading' ? 'Syncing...' : syncError ? `Sync Error: ${syncError}` : 'Connected to Sheets (Click to Sync)'}
                    className={`p-1.5 rounded border-2 border-black bg-white hover:bg-gray-100 transition shadow-gumroad-sm ${syncStatus === 'loading' ? 'animate-spin' : ''}`}
                  >
                    <Cloud className={`w-3.5 h-3.5 ${syncStatus === 'error' ? 'text-danger' : 'text-success'}`} />
                  </button>
                ) : (
                  <div title="Local-Only Mode" className="p-1.5 rounded border-2 border-black bg-white shadow-gumroad-sm">
                    <CloudOff className="w-3.5 h-3.5 text-warning" />
                  </div>
                )}
                
                {/* Theme Toggle */}
                <button
                  onClick={() => toggleTheme()}
                  className="p-1.5 rounded border-2 border-black bg-white hover:bg-gray-100 transition shadow-gumroad-sm"
                  title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                >
                  {theme === 'light' ? <Moon className="w-3.5 h-3.5 text-black" /> : <Sun className="w-3.5 h-3.5 text-black" />}
                </button>
                
                {/* Settings Toggle */}
                <button
                  id="settings-btn-collapsed"
                  onClick={() => {
                    setInputUrl(settings.sheets_url);
                    setInputApiKey(settings.api_key || '');
                    setInputAccentLight(settings.accent_color_light || '#FF90E8');
                    setInputAccentDark(settings.accent_color_dark || '#FF90E8');
                    setShowSettingsModal(true);
                  }}
                  className="p-1.5 rounded border-2 border-black bg-white hover:bg-gray-100 transition shadow-gumroad-sm"
                  title="Settings"
                >
                  <SettingsIcon className="w-3.5 h-3.5 text-black" />
                </button>

                {/* User Menu */}
                <UserMenu />
              </div>

            ) : (
              // Expanded Stats Card layout
              <>
                <div className="flex justify-between items-center">
                  <span className="font-bold font-mono text-sm bg-black text-white px-2 py-0.5 rounded border border-black shadow-gumroad-sm">
                    LVL {stats.level}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {/* Theme Toggle */}
                    <button
                      onClick={() => toggleTheme()}
                      className="p-1.5 rounded border-2 border-black bg-white hover:bg-gray-100 transition shadow-gumroad-sm"
                      title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
                    >
                      {theme === 'light' ? <Moon className="w-3.5 h-3.5 text-black" /> : <Sun className="w-3.5 h-3.5 text-black" />}
                    </button>

                    {settings.sheets_url ? (
                      <button 
                        onClick={() => syncWithSheets()} 
                        title={syncStatus === 'loading' ? 'Syncing...' : syncError ? `Sync Error: ${syncError}` : 'Connected to Google Sheets'}
                        className={`p-1.5 rounded border-2 border-black bg-white hover:bg-gray-100 transition shadow-gumroad-sm ${syncStatus === 'loading' ? 'animate-spin' : ''}`}
                      >
                        <Cloud className={`w-3.5 h-3.5 ${syncStatus === 'error' ? 'text-danger' : 'text-success'}`} />
                      </button>
                    ) : (
                      <div title="Local-Only Mode" className="p-1.5 rounded border-2 border-black bg-white shadow-gumroad-sm">
                        <CloudOff className="w-3.5 h-3.5 text-warning" />
                      </div>
                    )}
                    
                    {/* Settings Trigger */}
                    <button
                      id="settings-btn"
                      onClick={() => {
                        setInputUrl(settings.sheets_url);
                        setInputApiKey(settings.api_key || '');
                        setInputAccentLight(settings.accent_color_light || '#FF90E8');
                        setInputAccentDark(settings.accent_color_dark || '#FF90E8');
                        setShowSettingsModal(true);
                      }}
                      className="p-1.5 rounded border-2 border-black bg-white hover:bg-gray-100 transition shadow-gumroad-sm"
                      title="Settings"
                    >
                      <SettingsIcon className="w-3.5 h-3.5 text-black" />
                    </button>

                    {/* User Menu */}
                    <UserMenu />
                  </div>

                </div>

                {/* XP Bar */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-mono font-bold">
                    <span>XP</span>
                    <span>{stats.xp} / {settings.xp_per_level}</span>
                  </div>
                  <div className="w-full bg-white h-4 rounded-full border-2 border-black overflow-hidden relative">
                    <div 
                      className="bg-accent-pink h-full border-r-2 border-black transition-all duration-300"
                      style={{ width: `${(stats.xp / settings.xp_per_level) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Day Progress indicator */}
                <div id="sidebar-day-progress" className="flex justify-between items-center mt-1 pt-2 border-t border-black/10">
                  <span className="text-xs font-bold font-mono">Day Progress:</span>
                  <span className={`text-sm font-black font-mono px-2 py-0.5 rounded border border-black ${
                    dailyScore >= 80 ? 'bg-success text-white' : dailyScore >= 40 ? 'bg-warning text-black' : 'bg-danger text-white'
                  }`}>
                    {dailyScore}%
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2">
            {navItems.map(item => {
              const isActive = location.pathname === item.path || (item.path === '/habits' && location.pathname === '/');
              const Icon = item.icon;
              const itemId = item.path === '/eisenhower' ? 'nav-eisenhower' : `nav-${item.name.toLowerCase()}`;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  id={itemId}
                  title={item.name}
                  className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-lg border-2 font-bold transition-all ${
                    isActive
                      ? 'bg-accent-pink text-black border-black shadow-gumroad-sm translate-x-[2px] translate-y-[2px]'
                      : 'bg-surface border-transparent text-gray-700 hover:text-black hover:border-black hover:shadow-gumroad-sm hover:translate-x-[1px] hover:translate-y-[1px]'
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
            
            {/* Desktop PWA Install Button */}
            {deferredPrompt && (
              <button
                onClick={handleInstallPWA}
                className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-3 rounded-lg border-2 border-black font-bold bg-accent-pink text-black shadow-gumroad-sm hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer animate-pulse mt-2`}
                title="Install BakaTracker Desktop App"
              >
                <Download className="w-5 h-5 shrink-0 text-black" />
                {!isCollapsed && <span>Install App</span>}
              </button>
            )}
          </nav>
        </div>

        {/* Footer */}
        {!isCollapsed && (
          <div className="text-center text-[11px] font-mono text-gray-500 mt-auto pt-4 border-t border-black/10 transition-all duration-300">
            <p>BakaTracker v2.0</p>
            <p className="font-bold mt-1 text-black dark:text-white">Made by build.srivatsa</p>
          </div>
        )}
      </aside>

      {/* Mobile Header & Bottom Navigation */}
      <div className="md:hidden flex flex-col w-full min-h-screen">
        {/* Mobile Header */}
        <header className="bg-surface border-b-4 border-black p-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="BakaTracker Logo" className="w-8 h-8 border border-black rounded shadow-gumroad-sm object-cover" />
            <h1 className="text-lg font-black tracking-tight leading-none m-0">BakaTracker</h1>
          </div>

          {/* Character Quick Info */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-black text-white px-1.5 py-0.5 rounded border border-black">
              LVL {stats.level}
            </span>
            <div className="w-16 bg-white h-2.5 rounded-full border border-black overflow-hidden relative">
              <div 
                className="bg-accent-pink h-full transition-all duration-300"
                style={{ width: `${(stats.xp / settings.xp_per_level) * 100}%` }}
              />
            </div>

            {/* PWA Install Button (Mobile) */}
            {deferredPrompt && (
              <button
                onClick={handleInstallPWA}
                className="p-1 rounded border-2 border-black bg-accent-pink text-black hover:bg-white transition shadow-sm animate-pulse"
                title="Install BakaTracker App"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Mobile Theme Toggle */}
            <button
              onClick={() => toggleTheme()}
              className="p-1 rounded border border-black bg-white hover:bg-gray-100 transition shadow-sm"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'light' ? <Moon className="w-3.5 h-3.5 text-black" /> : <Sun className="w-3.5 h-3.5 text-black" />}
            </button>

            <button
              onClick={() => {
                setInputUrl(settings.sheets_url);
                setInputApiKey(settings.api_key || '');
                setInputAccentLight(settings.accent_color_light || '#FF90E8');
                setInputAccentDark(settings.accent_color_dark || '#FF90E8');
                setShowSettingsModal(true);
              }}
              className="p-1 rounded border border-black bg-white"
              title="Settings"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-black" />
            </button>

            {/* User Menu */}
            <UserMenu />
          </div>
        </header>

        {/* Offline Banner */}
        {isOffline && (
          <div className="bg-warning text-black border-b-2 border-black p-2 text-center font-mono font-bold text-xs flex items-center justify-center gap-2 z-40">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>Offline Mode — All changes saved locally and will sync when reconnected!</span>
          </div>
        )}

        {/* Scrollable Container */}
        <main className="flex-1 overflow-y-auto pb-24 p-4">
          <OnboardingBanner />
          <Outlet />
        </main>

        {/* Mobile Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t-4 border-black py-2 px-2 flex justify-around items-center z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          {navItems.map(item => {
            const isActive = location.pathname === item.path || (item.path === '/habits' && location.pathname === '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] px-3 py-1.5 rounded-lg transition-all active:scale-95 ${
                  isActive ? 'text-accent-pink bg-black border-2 border-black shadow-gumroad-sm' : 'text-gray-600 hover:text-black'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-bold font-mono mt-0.5">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Desktop Main Content Container */}
      <main className="hidden md:block flex-1 h-screen overflow-y-auto p-8 bg-bg-primary">
        {isOffline && (
          <div className="bg-warning text-black border-2 border-black rounded-lg p-3 text-center font-mono font-bold text-xs flex items-center justify-center gap-2 mb-6 shadow-gumroad-sm">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>Offline Mode — Running in local-first mode. All progress is saved on your device!</span>
          </div>
        )}
        <OnboardingBanner />
        <Outlet />
      </main>

      {/* Settings Modal (Bottom Sheet on Mobile) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center max-sm:items-end bg-black/60 p-0 sm:p-4 animate-fade-in">
          <div className="neo-card p-6 bg-white w-full max-w-md flex flex-col gap-4 text-black max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:max-h-[85vh] max-sm:overflow-y-auto">
            <div className="flex justify-between items-center border-b-2 border-black pb-2">
              <h3 className="text-lg font-black flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-accent-pink" />
                <span>BakaTracker Settings</span>
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded hover:bg-gray-100 transition border border-transparent hover:border-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed font-mono">
              BakaTracker runs in local-first mode by default. Connect your Google Sheet via Google Apps Script to back up and sync your data.
            </p>

            <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold font-mono">Google Apps Script URL</label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={inputUrl}
                  onChange={e => setInputUrl(e.target.value)}
                  className="neo-input text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold font-mono">API Authorization Key (Optional)</label>
                <input
                  type="password"
                  placeholder="Enter API Key to secure your Google Sheet data"
                  value={inputApiKey}
                  onChange={e => setInputApiKey(e.target.value)}
                  className="neo-input text-xs"
                />
              </div>

              {/* Accent Color Config Pickers */}
              <div className="flex flex-col gap-3 border-t border-black/10 pt-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black font-mono">Theme Accent Colors</label>
                  <button
                    type="button"
                    onClick={handleResetColors}
                    className="text-[10px] font-mono font-bold border border-black px-1.5 py-0.5 rounded bg-white hover:bg-gray-100 transition shadow-gumroad-sm cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                </div>

                {/* Light Mode Accent */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold font-mono text-gray-500">Light Mode Accent</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={inputAccentLight}
                      onChange={e => setInputAccentLight(e.target.value)}
                      className="w-8 h-8 border-2 border-black rounded cursor-pointer shadow-gumroad-sm bg-transparent shrink-0"
                    />
                    <input
                      type="text"
                      value={inputAccentLight}
                      onChange={e => setInputAccentLight(e.target.value)}
                      placeholder="#FF90E8"
                      className="neo-input text-xs w-24 uppercase font-mono py-1 px-2 shrink-0"
                      maxLength={7}
                      pattern="^#[0-9A-Fa-f]{6}$"
                      required
                    />
                    <div className="flex gap-1.5 ml-auto overflow-x-auto no-scrollbar py-1">
                      {['#FF90E8', '#FF5C5C', '#FFBE3C', '#22C55E', '#3B82F6', '#8B5CF6'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setInputAccentLight(c)}
                          className="w-4.5 h-4.5 rounded-full border border-black cursor-pointer shadow-gumroad-sm shrink-0 transition hover:scale-110"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dark Mode Accent */}
                <div className="flex flex-col gap-1 mt-1">
                  <span className="text-[10px] font-bold font-mono text-gray-500">Dark Mode Accent</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={inputAccentDark}
                      onChange={e => setInputAccentDark(e.target.value)}
                      className="w-8 h-8 border-2 border-black rounded cursor-pointer shadow-gumroad-sm bg-transparent shrink-0"
                    />
                    <input
                      type="text"
                      value={inputAccentDark}
                      onChange={e => setInputAccentDark(e.target.value)}
                      placeholder="#FF90E8"
                      className="neo-input text-xs w-24 uppercase font-mono py-1 px-2 shrink-0"
                      maxLength={7}
                      pattern="^#[0-9A-Fa-f]{6}$"
                      required
                    />
                    <div className="flex gap-1.5 ml-auto overflow-x-auto no-scrollbar py-1">
                      {['#FF90E8', '#FF5C5C', '#FFBE3C', '#22C55E', '#3B82F6', '#8B5CF6'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setInputAccentDark(c)}
                          className="w-4.5 h-4.5 rounded-full border border-black cursor-pointer shadow-gumroad-sm shrink-0 transition hover:scale-110"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1 bg-bg-primary p-3 rounded-lg border border-black/10 text-[10px] leading-relaxed font-mono text-gray-600">
                <span className="font-bold text-black uppercase">How to set up:</span>
                <ol className="list-decimal list-inside flex flex-col gap-0.5">
                  <li>Deploy the script from <b>google-apps-script.js</b> in your Google Sheets Apps Script.</li>
                  <li>Select "Execute as Me" and "Who has access: Anyone".</li>
                  <li>Paste the generated Web App URL above.</li>
                </ol>
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 border-2 border-black font-bold rounded-lg hover:bg-gray-50 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="neo-button bg-success text-white text-sm"
                >
                  Save & Sync
                </button>
              </div>
            </form>

            {/* Data Management Section */}
            <div className="border-t-2 border-black pt-4 flex flex-col gap-4 mt-2">
              <h4 className="text-sm font-black uppercase font-mono tracking-wider">Data Management</h4>
              
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (habits.length >= 2) return;
                    setDemoLoading(true);
                    await loadDemoData();
                    setDemoLoading(false);
                    setShowSettingsModal(false);
                  }}
                  disabled={demoLoading || habits.length >= 2}
                  className="w-full neo-button bg-black text-accent-pink flex items-center justify-center gap-2 text-xs py-2 disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  <span>{demoLoading ? 'Loading Demo Data...' : 'Load Demo Data'}</span>
                </button>
                {habits.length >= 2 && (
                  <p className="text-[10px] text-gray-400 font-mono text-center">Demo data is only available when you have fewer than 2 habits.</p>
                )}
                
                <button
                  type="button"
                  onClick={() => {
                    setShowSettingsModal(false);
                    setTimeout(() => startTour(), 300);
                  }}
                  className="w-full px-4 py-2 border-2 border-black rounded-lg font-bold text-xs hover:bg-gray-50 transition flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 text-accent-pink" />
                  <span>Replay App Tour 🚀</span>
                </button>
              </div>

              {/* Danger Zone */}
              <div className="border-t border-black/10 pt-3 flex flex-col gap-3">
                <span className="text-xs font-black text-red-600 uppercase font-mono">⚠️ Danger Zone</span>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold font-mono">Clear Data Duration</label>
                  <select
                    value={clearDays}
                    onChange={e => setClearDays(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="neo-input text-xs font-mono"
                  >
                    <option value={7}>Last 7 Days</option>
                    <option value={14}>Last 14 Days</option>
                    <option value={30}>Last 30 Days</option>
                    <option value="all">All Time (Full Reset) ☠️</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold font-mono">
                    Type <code className="bg-red-50 dark:bg-red-950/20 text-red-600 px-1 rounded font-bold">delete my data</code> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    placeholder="delete my data"
                    className="neo-input text-xs"
                  />
                </div>

                <button
                  type="button"
                  disabled={deleteConfirmText !== 'delete my data'}
                  onClick={async () => {
                    if (deleteConfirmText !== 'delete my data') return;
                    if (!window.confirm(`Are you absolutely sure you want to delete ${clearDays === 'all' ? 'all your data and reset the app' : `data from the last ${clearDays} days`}? This cannot be undone.`)) return;
                    await clearDataByDays(clearDays);
                    setDeleteConfirmText('');
                    setShowSettingsModal(false);
                  }}
                  className="w-full neo-button bg-danger text-white text-xs py-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Clear Selected Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <FirstRunWizard />
    </div>
  );
};

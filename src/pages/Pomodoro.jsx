// Pomodoro Timer Page
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Default background images
const DEFAULT_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200', // Mountains
  'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=1200', // Rain window
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200', // Night mountain
  'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=1200', // Forest
  'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=1200', // Sunset
];

// Timer modes
const TIMER_MODES = {
  pomodoro: { label: 'pomodoro', duration: 25 * 60 },
  shortBreak: { label: 'short break', duration: 5 * 60 },
  longBreak: { label: 'long break', duration: 15 * 60 },
};

export const Pomodoro = () => {
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // State
  const [mode, setMode] = useState('pomodoro');
  const [timeLeft, setTimeLeft] = useState(TIMER_MODES.pomodoro.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [background, setBackground] = useState(() => {
    return localStorage.getItem('pomodoro_bg') || DEFAULT_BACKGROUNDS[0];
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('pomodoro_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [customDurations, setCustomDurations] = useState(() => {
    const saved = localStorage.getItem('pomodoro_durations');
    return saved ? JSON.parse(saved) : {
      pomodoro: 25,
      shortBreak: 5,
      longBreak: 15,
    };
  });

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Timer effect
  useEffect(() => {
    let interval = null;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Timer completed
      setIsRunning(false);
      
      // Play sound
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      
      // Save to history
      const session = {
        id: Date.now(),
        mode: TIMER_MODES[mode].label,
        duration: customDurations[mode],
        completedAt: new Date().toISOString(),
      };
      const newHistory = [session, ...history].slice(0, 50);
      setHistory(newHistory);
      localStorage.setItem('pomodoro_history', JSON.stringify(newHistory));
      
      // Auto switch mode
      if (mode === 'pomodoro') {
        const pomodoroCount = history.filter(h => h.mode === 'pomodoro').length + 1;
        if (pomodoroCount % 4 === 0) {
          setMode('longBreak');
          setTimeLeft(customDurations.longBreak * 60);
        } else {
          setMode('shortBreak');
          setTimeLeft(customDurations.shortBreak * 60);
        }
      } else {
        setMode('pomodoro');
        setTimeLeft(customDurations.pomodoro * 60);
      }
    }
    
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode, history, customDurations]);

  // Switch mode
  const switchMode = (newMode) => {
    setMode(newMode);
    setTimeLeft(customDurations[newMode] * 60);
    setIsRunning(false);
  };

  // Reset timer
  const resetTimer = () => {
    setTimeLeft(customDurations[mode] * 60);
    setIsRunning(false);
  };

  // Handle background change
  const handleBackgroundChange = (url) => {
    setBackground(url);
    localStorage.setItem('pomodoro_bg', url);
  };

  // Handle custom image upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        handleBackgroundChange(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save custom durations
  const saveDurations = () => {
    localStorage.setItem('pomodoro_durations', JSON.stringify(customDurations));
    setTimeLeft(customDurations[mode] * 60);
    setShowSettings(false);
  };

  // Clear history
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('pomodoro_history');
  };

  // Get today's stats
  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = history.filter(h => h.completedAt.startsWith(today));
    const pomodoroCount = todaySessions.filter(h => h.mode === 'pomodoro').length;
    const totalMinutes = todaySessions.reduce((sum, h) => sum + h.duration, 0);
    return { pomodoroCount, totalMinutes };
  };

  const todayStats = getTodayStats();

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: `url("${background}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      
      {/* Audio for timer completion */}
      <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" />
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-20">
        <button
          onClick={() => navigate('/dashboard')}
          className="size-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(true)}
            className="size-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <span className="material-symbols-outlined">history</span>
          </button>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 p-6">
        {/* Today's Stats */}
        <div className="flex items-center gap-4 text-white/80 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-lg">local_fire_department</span>
            <span>{todayStats.pomodoroCount} pomodoros</span>
          </div>
          <div className="w-px h-4 bg-white/30" />
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-lg">schedule</span>
            <span>{todayStats.totalMinutes} min focused</span>
          </div>
        </div>
        
        {/* Mode Selector */}
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full p-1.5">
          {Object.entries(TIMER_MODES).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => switchMode(key)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                mode === key
                  ? 'bg-white text-slate-900 shadow-lg'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        
        {/* Timer Display */}
        <div className="text-center">
          <div className="text-[120px] font-bold text-white leading-none tracking-tight drop-shadow-lg" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(timeLeft)}
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="px-10 py-3.5 bg-white text-slate-900 rounded-full font-bold text-lg shadow-lg hover:bg-white/90 transition-all active:scale-95"
          >
            {isRunning ? 'pause' : 'start'}
          </button>
          
          <button
            onClick={resetTimer}
            className="size-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <span className="material-symbols-outlined">refresh</span>
          </button>
          
          <button
            onClick={() => setShowSettings(true)}
            className="size-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </div>
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="size-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            
            {/* Timer Durations */}
            <div className="space-y-4 mb-6">
              <h4 className="font-medium text-slate-700 dark:text-slate-300">Timer Duration (minutes)</h4>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Pomodoro</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={customDurations.pomodoro}
                    onChange={(e) => setCustomDurations({ ...customDurations, pomodoro: parseInt(e.target.value) || 25 })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/10 border-0 text-center font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Short Break</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={customDurations.shortBreak}
                    onChange={(e) => setCustomDurations({ ...customDurations, shortBreak: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/10 border-0 text-center font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Long Break</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={customDurations.longBreak}
                    onChange={(e) => setCustomDurations({ ...customDurations, longBreak: parseInt(e.target.value) || 15 })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-white/10 border-0 text-center font-medium"
                  />
                </div>
              </div>
            </div>
            
            {/* Background Selection */}
            <div className="space-y-3 mb-6">
              <h4 className="font-medium text-slate-700 dark:text-slate-300">Background</h4>
              
              <div className="grid grid-cols-4 gap-2">
                {DEFAULT_BACKGROUNDS.map((bg, i) => (
                  <button
                    key={i}
                    onClick={() => handleBackgroundChange(bg)}
                    className={`aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                      background === bg ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-white/50'
                    }`}
                  >
                    <img src={bg} alt={`Background ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
                
                {/* Custom upload button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video rounded-lg border-2 border-dashed border-gray-300 dark:border-white/20 flex flex-col items-center justify-center gap-1 hover:border-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-gray-400">add_photo_alternate</span>
                  <span className="text-[10px] text-gray-400">Custom</span>
                </button>
              </div>
            </div>
            
            <button
              onClick={saveDurations}
              className="w-full py-3 rounded-xl bg-primary text-white font-medium"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}
      
      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Session History</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="size-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            
            {history.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-2">timer</span>
                <p>No sessions yet. Start your first pomodoro!</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {history.slice(0, 20).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`size-8 rounded-full flex items-center justify-center ${
                          session.mode === 'pomodoro' 
                            ? 'bg-red-100 dark:bg-red-900/20 text-red-500' 
                            : 'bg-green-100 dark:bg-green-900/20 text-green-500'
                        }`}>
                          <span className="material-symbols-outlined text-lg">
                            {session.mode === 'pomodoro' ? 'local_fire_department' : 'coffee'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white capitalize text-sm">
                            {session.mode}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(session.completedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {session.duration} min
                      </span>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={clearHistory}
                  className="w-full py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                >
                  Clear History
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Pomodoro;

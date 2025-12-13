// React Context for Authentication and Data
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initGapiClient, initTokenClient, signIn, signOut, getCurrentUser, isAuthenticated } from '../services/auth';
import { getOrCreateSpreadsheet, getHabits, getTasks, getHabitLogs } from '../services/sheets';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [habitLogs, setHabitLogs] = useState([]);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Initialize Google APIs
  useEffect(() => {
    const init = async () => {
      try {
        await initGapiClient();
        
        await initTokenClient(async (response) => {
          if (response.error) {
            setError(response.error);
            setLoading(false);
            return;
          }
          
          // Token received, get user info
          const userInfo = await getCurrentUser();
          setUser(userInfo);
          
          // Initialize spreadsheet and fetch data
          await getOrCreateSpreadsheet();
          await refreshData();
          
          setLoading(false);
        });
        
        // Check if already authenticated
        if (isAuthenticated()) {
          const userInfo = await getCurrentUser();
          if (userInfo) {
            setUser(userInfo);
            await getOrCreateSpreadsheet();
            await refreshData();
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to initialize:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    init();
  }, []);
  
  // Refresh all data from sheets
  const refreshData = useCallback(async () => {
    try {
      const [habitsData, tasksData, logsData] = await Promise.all([
        getHabits(),
        getTasks(),
        getHabitLogs(),
      ]);
      
      setHabits(habitsData);
      setTasks(tasksData);
      setHabitLogs(logsData);
    } catch (err) {
      console.error('Failed to refresh data:', err);
      setError(err.message);
    }
  }, []);
  
  // Handle sign in
  const handleSignIn = useCallback(() => {
    signIn();
  }, []);
  
  // Handle sign out
  const handleSignOut = useCallback(() => {
    signOut();
    setUser(null);
    setHabits([]);
    setTasks([]);
    setHabitLogs([]);
  }, []);
  
  // Calculate today's progress
  const getTodayProgress = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = habitLogs.filter(log => log.date === today && log.completed === 'true');
    const totalHabits = habits.length;
    
    if (totalHabits === 0) return 0;
    return Math.round((todayLogs.length / totalHabits) * 100);
  }, [habits, habitLogs]);
  
  // Get habit completion status for today
  const getHabitStatus = useCallback((habitId) => {
    const today = new Date().toISOString().split('T')[0];
    const log = habitLogs.find(l => l.habitId === habitId && l.date === today);
    return log?.completed === 'true';
  }, [habitLogs]);
  
  const value = {
    user,
    loading,
    error,
    isOnline,
    habits,
    tasks,
    habitLogs,
    signIn: handleSignIn,
    signOut: handleSignOut,
    refreshData,
    getTodayProgress,
    getHabitStatus,
    setHabits,
    setTasks,
    setHabitLogs,
  };
  
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

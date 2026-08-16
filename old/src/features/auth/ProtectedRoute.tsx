import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './hooks';
import { LoadingScreen } from './components/LoadingScreen';
import { LogOut, AlertTriangle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, error, logout } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Checking session..." />;
  }

  if (error) {
    // Map error to user-friendly messages
    let title = 'Authentication Error';
    let userMessage = 'Unable to reach your BakaTracker server.';

    const msg = error.message?.toLowerCase() || '';
    if (msg.includes('not authorized') || msg.includes('forbidden') || msg.includes('owner')) {
      title = 'Access Forbidden';
      userMessage = 'This account is not authorized to use this BakaTracker instance.';
    } else if (msg.includes('expired') || msg.includes('unauthorized') || msg.includes('sign in')) {
      title = 'Session Expired';
      userMessage = 'Your session has expired. Please sign in again.';
    }

    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full border-4 border-black bg-white dark:bg-surface p-6 rounded-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-black dark:text-text-primary flex flex-col gap-4">
          <div className="flex items-center gap-3 text-danger border-b-2 border-black/10 dark:border-white/10 pb-3">
            <AlertTriangle className="w-8 h-8 shrink-0" />
            <h2 className="text-xl font-black uppercase tracking-tight">{title}</h2>
          </div>
          <p className="font-mono text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            {userMessage}
          </p>
          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 w-full text-center px-4 py-2.5 text-sm font-black font-mono text-black bg-accent-pink hover:bg-accent-pink/90 border-2 border-black rounded-md transition cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] active:translate-x-[1px] active:translate-y-[1px]"
            >
              <span>TRY AGAIN / RECONNECT</span>
            </button>
            <button
              onClick={() => logout()}
              className="flex items-center justify-center gap-2 w-full text-center px-4 py-2.5 text-sm font-black font-mono text-[#E05252] hover:bg-[#E05252]/10 border-2 border-black rounded-md transition cursor-pointer shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] active:translate-x-[1px] active:translate-y-[1px]"
            >
              <LogOut className="w-4 h-4" />
              <span>LOG OUT / CHANGE ACCOUNT</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

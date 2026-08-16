import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './hooks';
import { LoadingScreen } from './components/LoadingScreen';
import { LogOut, AlertTriangle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute — the machine gate. Loading → ATTRACT MODE; auth error →
 * OUT OF ORDER screen; anonymous → back to the landing marquee.
 */
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
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'var(--arcade-void)', position: 'relative', zIndex: 1 }}>
        <div className="max-w-md w-full cabinet cabinet--ooo p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3 pb-3" style={{ color: 'var(--arcade-red)', borderBottom: '1px solid rgba(255,59,92,0.25)' }}>
            <AlertTriangle className="w-8 h-8 shrink-0" aria-hidden="true" />
            <h2 className="marquee-title text-xl m-0">{title}</h2>
          </div>
          <p className="font-mono text-sm leading-relaxed m-0" style={{ color: 'var(--arcade-paper-dim)' }}>
            {userMessage}
          </p>
          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={() => window.location.reload()}
              className="insert-coin w-full justify-center !text-sm"
            >
              <span>TRY AGAIN / RECONNECT</span>
            </button>
            <button
              onClick={() => logout()}
              className="btn-ghost w-full justify-center !text-sm"
              style={{ color: 'var(--arcade-red)', borderColor: 'rgba(255,59,92,0.35)' }}
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
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

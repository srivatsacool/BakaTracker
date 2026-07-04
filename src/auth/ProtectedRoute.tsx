import React, { useEffect } from 'react';
import { useAuth } from './useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, error, login } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !error) {
      login();
    }
  }, [isLoading, isAuthenticated, error, login]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] dark:bg-[#121212] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          {/* Neobrutalist spinner */}
          <div className="w-12 h-12 border-4 border-black border-t-accent-pink rounded-full animate-spin bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />
          <div className="font-mono font-bold text-sm tracking-wide bg-white text-black px-4 py-1.5 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg">
            Loading session...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] dark:bg-[#121212] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full border-4 border-black bg-white p-6 rounded-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-black flex flex-col gap-4">
          <h2 className="text-xl font-black uppercase tracking-tight text-[#FF5C5C]">Authentication Error</h2>
          <p className="font-mono text-sm leading-relaxed text-gray-700">
            {error.message || 'An error occurred during authentication.'}
          </p>
          <button
            onClick={() => login()}
            className="neo-button bg-accent-pink text-black text-sm font-bold w-full"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

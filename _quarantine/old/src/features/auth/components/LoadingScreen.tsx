import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Checking session...' }) => {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        {/* Neobrutalist spinner */}
        <div className="w-12 h-12 border-4 border-black border-t-accent-pink rounded-full animate-spin bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />
        <div className="font-mono font-bold text-sm tracking-wide bg-white text-black px-4 py-1.5 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-lg">
          {message}
        </div>
      </div>
    </div>
  );
};

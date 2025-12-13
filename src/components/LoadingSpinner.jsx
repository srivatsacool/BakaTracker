// Loading Spinner Component
export const LoadingSpinner = ({ size = 'md', message = 'Loading...' }) => {
  const sizeClasses = {
    sm: 'size-6',
    md: 'size-10',
    lg: 'size-16',
  };
  
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`${sizeClasses[size]} relative`}>
        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
      {message && (
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;

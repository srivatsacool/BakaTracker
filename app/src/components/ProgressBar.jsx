// Progress Bar Component
export const ProgressBar = ({ progress, showLabel = true, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-6',
  };
  
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {showLabel && (
        <div className="flex justify-between text-xs font-medium dark:text-gray-300">
          <span>{Math.round(progress)}% complete</span>
          <span>Goal: 100%</span>
        </div>
      )}
      <div className={`${sizeClasses[size]} w-full bg-gray-200 dark:bg-[#0d1a14] rounded-full overflow-hidden p-0.5`}>
        <div
          className="h-full bg-primary rounded-full shadow-[0_0_12px_rgba(19,236,128,0.6)] transition-all duration-1000 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;

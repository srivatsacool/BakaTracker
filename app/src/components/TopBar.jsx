// Top Bar Component
import { useNavigate } from 'react-router-dom';

export const TopBar = ({ title, backPath, rightIcon }) => {
  const navigate = useNavigate();
  
  return (
    <div className="sticky top-0 z-20 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 pb-2 justify-between border-b border-transparent dark:border-white/5">
      {backPath ? (
        <button
          onClick={() => navigate(backPath)}
          className="text-slate-900 dark:text-white flex size-10 shrink-0 items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
      ) : (
        <div className="size-10" />
      )}
      <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center truncate px-2">
        {title}
      </h2>
      {rightIcon ? rightIcon : <div className="size-10" />}
    </div>
  );
};

export default TopBar;

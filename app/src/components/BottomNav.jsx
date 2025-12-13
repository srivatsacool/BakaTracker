// Bottom Navigation Component
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/dashboard', icon: 'home', label: 'Home' },
  { path: '/tasks', icon: 'check_circle', label: 'Tasks' },
  { path: '/habits', icon: 'calendar_month', label: 'Habits' },
  { path: '/stats', icon: 'bar_chart', label: 'Stats' },
  { path: '/settings', icon: 'settings', label: 'Settings' },
];

export const BottomNav = () => {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;
  
  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white dark:bg-[#193326]/90 backdrop-blur-md border-t border-slate-200 dark:border-white/10 pb-6 pt-3 px-6 z-50">
      <div className="flex justify-between items-center max-w-md mx-auto">
        {navItems.map(({ path, icon, label }) => (
          <Link
            key={path}
            to={path}
            className="flex flex-col items-center gap-1 w-16 group"
          >
            <span
              className={`material-symbols-outlined transition-colors ${
                isActive(path)
                  ? 'text-primary'
                  : 'text-gray-400 dark:text-gray-500 group-hover:text-primary'
              }`}
            >
              {icon}
            </span>
            <span
              className={`text-[10px] transition-colors ${
                isActive(path)
                  ? 'text-primary font-bold'
                  : 'text-gray-400 dark:text-gray-500 group-hover:text-primary font-medium'
              }`}
            >
              {label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;

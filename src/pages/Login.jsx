// Login Page
import { useApp } from '../context/AppContext';
import { LoadingSpinner } from '../components';

export const Login = () => {
  const { signIn, loading } = useApp();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <LoadingSpinner message="Initializing..." />
      </div>
    );
  }
  
  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-white min-h-screen flex flex-col items-center justify-center overflow-hidden relative">
      {/* Background effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[50%] -translate-x-1/2 w-[150%] h-[50%] bg-primary/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[80%] h-[40%] bg-primary/5 blur-[80px] rounded-full" />
      </div>
      
      <div className="relative z-10 flex flex-col w-full max-w-[480px] h-full min-h-screen p-6 justify-between">
        {/* Logo section */}
        <div className="flex-1 flex flex-col items-center justify-center mt-12 mb-8">
          <div className="mb-8 relative">
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)] overflow-hidden">
              <img src="/logo.png" alt="BakaTracker Logo" className="w-20 h-20 object-contain" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white animate-bounce">
              <span className="material-symbols-outlined text-sm font-bold">bolt</span>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-center mb-3">
            Baka<span className="text-primary">Tracker</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-center text-lg max-w-[280px] leading-relaxed">
            Track your goals. Master your day.
          </p>
        </div>
        
        {/* Auth buttons */}
        <div className="w-full flex flex-col gap-4 pb-8">
          <button
            onClick={signIn}
            className="group relative flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-5 bg-white text-slate-900 gap-3 transition-all active:scale-[0.98] hover:bg-slate-50 shadow-lg shadow-black/5 border border-slate-200 dark:border-transparent"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M23.52 12.29C23.52 11.43 23.441 10.71 23.3 10.04H12V14.51H18.59C18.421 15.89 17.57 17.61 16.03 18.66L15.997 18.804L19.566 21.52L19.81 21.54C22.06 19.49 23.52 16.39 23.52 12.29Z" fill="#4285F4" />
              <path d="M12 24C15.24 24 17.96 22.94 19.81 21.24L16.03 18.33C15.02 19.03 13.68 19.53 12 19.53C8.82 19.53 6.13 17.42 5.16 14.53L5.02 14.542L1.319 17.33L1.27 17.47C3.12 21.14 6.91 24 12 24Z" fill="#34A853" />
              <path d="M5.16 14.53C4.9 13.78 4.75 12.93 4.75 12.04C4.75 11.16 4.9 10.32 5.14 9.53L5.132 9.379L1.378 6.51L1.27 6.58C0.46 8.19 0 10.05 0 12.04C0 14.04 0.46 15.89 1.28 17.47L5.16 14.53Z" fill="#FBBC05" />
              <path d="M12 4.47C14.28 4.47 15.83 5.46 16.7 6.27L20 3C17.96 1.11 15.24 0 12 0C6.91 0 3.12 2.86 1.27 6.58L5.14 9.53C6.12 6.64 8.82 4.47 12 4.47Z" fill="#EA4335" />
            </svg>
            <span className="text-base font-bold tracking-wide">Continue with Google</span>
          </button>
          
          {/* Dev Mode Bypass - TODO: Remove in production */}
          {import.meta.env.DEV && (
            <button
              onClick={() => {
                // Simulate a logged-in user for development
                window.localStorage.setItem('bakatracker_dev_mode', 'true');
                window.location.reload();
              }}
              className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl h-12 px-5 bg-slate-200 dark:bg-surface-dark text-slate-600 dark:text-slate-300 gap-2 transition-all active:scale-[0.98] hover:bg-slate-300 dark:hover:bg-white/10 text-sm font-medium"
            >
              <span className="material-symbols-outlined text-lg">developer_mode</span>
              <span>Skip Login (Dev Mode)</span>
            </button>
          )}
          
          <p className="text-center text-xs text-slate-500 dark:text-slate-500 mt-4 px-6 leading-5">
            By continuing, you agree to our{' '}
            <a className="underline hover:text-slate-700 dark:hover:text-slate-300" href="#">
              Terms of Service
            </a>{' '}
            &{' '}
            <a className="underline hover:text-slate-700 dark:hover:text-slate-300" href="#">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

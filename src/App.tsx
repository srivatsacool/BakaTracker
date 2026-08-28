import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useStore } from './store/useStore';
import { Layout } from './components/shared/Layout';
import { ProtectedRoute, useAuth } from './features/auth';
import { useApiClient } from './api/authFetch';
import { ErrorBoundary } from './components/ErrorBoundary';

// Route-level code splitting: heavy pages (Journey/recharts, Notes/excalidraw)
// load only when their route is entered, not on first paint.
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Philosophy = lazy(() => import('./pages/Philosophy').then(m => ({ default: m.Philosophy })));
const Habits = lazy(() => import('./pages/Habits').then(m => ({ default: m.Habits })));
const Tasks = lazy(() => import('./pages/Tasks').then(m => ({ default: m.Tasks })));
const Today = lazy(() => import('./pages/Today').then(m => ({ default: m.Today })));
const Journal = lazy(() => import('./pages/Journal').then(m => ({ default: m.Journal })));
const Journey = lazy(() => import('./pages/Journey').then(m => ({ default: m.Journey })));
const Eisenhower = lazy(() => import('./pages/Eisenhower').then(m => ({ default: m.Eisenhower })));
const Notes = lazy(() => import('./pages/Notes').then(m => ({ default: m.Notes })));
const BakaSurPage = lazy(() => import('./pages/BakaSurPage').then(m => ({ default: m.BakaSurPage })));
const PageWorkspace = lazy(() => import('./pages/PageWorkspace').then(m => ({ default: m.PageWorkspace })));

function App() {
  const init = useStore(state => state.init);
  const { isAuthenticated, isLoading, user } = useAuth();
  const apiClient = useApiClient();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.provider !== 'guest') {
      init(apiClient);
    }
  }, [isAuthenticated, isLoading, apiClient, init, user]);

  return (
    <BrowserRouter>
      {/* Background removed for V3.2.1 — quiet dark canvas */}

      {/* App content */}
      <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/philosophy" element={<Philosophy />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/journey" element={<Journey />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/eisenhower" element={<Eisenhower />} />
            <Route path="/today" element={<Today />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/notes/:pageId" element={<PageWorkspace />} />
            <Route path="/bakasur" element={<BakaSurPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

/** Arcade loading state for lazy route chunks — the attract screen. */
function RouteFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="cabinet cabinet--attract px-6 py-4 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--arcade-gold)' }} aria-hidden="true" />
        <span className="text-sm font-mono" style={{ color: 'var(--arcade-paper-dim)' }}>Opening your Life OS…</span>
      </div>
    </div>
  );
}

export default App;

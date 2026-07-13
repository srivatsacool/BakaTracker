import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Layout } from './components/shared/Layout';
import { Habits } from './pages/Habits';
import { Tasks } from './pages/Tasks';
import { Today } from './pages/Today';
import { Journal } from './pages/Journal';
import { Journey } from './pages/Journey';
import { Landing } from './pages/Landing';
import { Eisenhower } from './pages/Eisenhower';
import { ProtectedRoute, useAuth } from './features/auth';
import { useApiClient } from './api/authFetch';

function App() {
  const init = useStore(state => state.init);
  const { isAuthenticated, isLoading } = useAuth();
  const apiClient = useApiClient();

  useEffect(() => {
    // Initial local cache load
    init();
  }, [init]);

  useEffect(() => {
    // Trigger remote fetch once authenticated
    if (!isLoading && isAuthenticated) {
      init(apiClient);
    }
  }, [isAuthenticated, isLoading, apiClient, init]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing & Login page */}
        <Route path="/" element={<Landing />} />

        {/* Protected Dashboard/App Pages */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/journey" element={<Journey />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/eisenhower" element={<Eisenhower />} />
          <Route path="/today" element={<Today />} />
          <Route path="/journal" element={<Journal />} />
        </Route>

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

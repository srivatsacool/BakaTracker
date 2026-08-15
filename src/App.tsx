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
import { Notes } from './pages/Notes';
import { PageWorkspace } from './pages/PageWorkspace';
import { ProtectedRoute, useAuth } from './features/auth';
import { useApiClient } from './api/authFetch';
import AppBackground from './components/background/AppBackground';

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
      {/* LightTunnel animated background — fixed, behind everything */}
      <AppBackground />

      {/* App content — floats above the tunnel */}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/journey" element={<Journey />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/eisenhower" element={<Eisenhower />} />
          <Route path="/today" element={<Today />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/notes/:pageId" element={<PageWorkspace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

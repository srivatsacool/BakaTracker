import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Layout } from './components/shared/Layout';
import { Habits } from './pages/Habits';
import { Tasks } from './pages/Tasks';
import { Today } from './pages/Today';
import { Journal } from './pages/Journal';
import { Journey } from './pages/Journey';

function App() {
  const init = useStore(state => state.init);

  useEffect(() => {
    // Initialize user data, fetch from Sheets if connected, or load from localStorage
    init();
  }, [init]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/habits" replace />} />
          <Route path="habits" element={<Habits />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="today" element={<Today />} />
          <Route path="journal" element={<Journal />} />
          <Route path="journey" element={<Journey />} />
          <Route path="*" element={<Navigate to="/habits" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

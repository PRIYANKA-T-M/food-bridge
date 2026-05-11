import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/useAuthStore';
import Login from './pages/Login';
import Signup from './pages/Signup';
import DashboardRouter from './pages/DashboardRouter';
import Navbar from './components/Navbar';

function App() {
  const { user } = useAuthStore();
  useEffect(() => {
    const mode = user?.theme?.mode || localStorage.getItem('theme_mode') || 'light';
    document.documentElement.classList.toggle('dark', mode === 'dark');
  }, [user]);

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100">
        <Navbar />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route 
              path="/" 
              element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/login" 
              element={!user ? <Login /> : <Navigate to="/dashboard" />} 
            />
            <Route 
              path="/signup" 
              element={!user ? <Signup /> : <Navigate to="/dashboard" />} 
            />
            <Route 
              path="/dashboard/*" 
              element={user ? <DashboardRouter /> : <Navigate to="/login" />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

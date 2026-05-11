import React from 'react';
import { Utensils, LogOut, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { languages } from '../config';

const Navbar = () => {
  const { user, logout, updatePreferences } = useAuthStore();
  const mode = user?.theme?.mode || localStorage.getItem('theme_mode') || 'light';

  const updateTheme = async () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme_mode', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    if (user) await updatePreferences({ theme: { ...(user.theme || {}), mode: next } });
  };

  const updateLanguage = async (language) => {
    if (user) await updatePreferences({ language });
  };

  return (
    <nav className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-red-500">
              <Utensils className="h-8 w-8 text-orange-500" />
              FoodBridge
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="text-sm">
                  <span className="text-slate-500 dark:text-slate-400 block">Welcome,</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{user.name}</span>
                </div>
                <select
                  value={user.language || 'en'}
                  onChange={(event) => updateLanguage(event.target.value)}
                  className="hidden sm:block text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 px-3 py-2"
                  title="Language"
                >
                  {Object.entries(languages).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
                <button
                  onClick={updateTheme}
                  className="p-2 text-slate-500 hover:text-orange-500 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-full transition-colors"
                  title="Toggle theme"
                >
                  {mode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
                <button 
                  onClick={logout}
                  className="ml-4 p-2 text-slate-400 hover:text-red-500 hover:bg-slate-50 rounded-full transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-orange-500 transition-colors">
                  Log in
                </Link>
                <Link to="/signup" className="text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-full transition-colors shadow-sm">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

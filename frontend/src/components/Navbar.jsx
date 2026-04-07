import React from 'react';
import { Utensils, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const Navbar = () => {
  const { user, logout } = useAuthStore();

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
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
                  <span className="text-slate-500 block">Welcome,</span>
                  <span className="font-semibold text-slate-800">{user.name}</span>
                </div>
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

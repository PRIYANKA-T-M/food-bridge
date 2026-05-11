import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('ngo');
  const { login, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password, role);
      navigate('/dashboard');
    } catch {
      // error handled in store
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div
        className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-md border border-slate-100"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800">Welcome Back</h2>
          <p className="text-slate-500 mt-2">Sign in to coordinate food surplus</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm border border-red-100 flex items-center justify-between">
            {error}
            <button onClick={clearError} className="text-red-400 hover:text-red-700">×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex gap-4 mb-2">
            <label className={`flex-1 p-3 border rounded-xl cursor-pointer transition-all text-center ${role === 'ngo' ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              <input type="radio" name="role" value="ngo" checked={role === 'ngo'} onChange={(e) => setRole(e.target.value)} className="hidden"/>
              NGO
            </label>
            <label className={`flex-1 p-3 border rounded-xl cursor-pointer transition-all text-center ${role === 'restaurant' ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              <input type="radio" name="role" value="restaurant" checked={role === 'restaurant'} onChange={(e) => setRole(e.target.value)} className="hidden"/>
              Restaurant
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-3 rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.98]"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <p className="text-center mt-6 text-slate-500 text-sm">
          Don't have an account? <Link to="/signup" className="text-orange-500 font-medium hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

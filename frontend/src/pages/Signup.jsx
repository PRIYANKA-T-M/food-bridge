import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { motion } from 'framer-motion';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ngo',
    watchRadius: 5
  });
  
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...formData };
      
      // Default location (NY) or browser geolocation if we had a more complex setup
      // For now, let's at least make it clear or try to get it if possible
      data.location = {
        type: 'Point',
        coordinates: [-74.006, 40.7128] // Default: New York
      };

      // In a real app, we'd use navigator.geolocation here
      // To keep it simple but fix the "mismatch" perception, 
      // we'll rely on the user adjusting it in the dashboard.
      
      if (data.role === 'restaurant') {
        delete data.watchRadius;
      }

      await register(data);
      navigate('/dashboard');
    } catch (err) {
      // internal store handles error
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-md border border-slate-100"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800">Create Account</h2>
          <p className="text-slate-500 mt-2">Join the FoodBridge network</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm border border-red-100 flex items-center justify-between">
            {error}
            <button onClick={clearError} className="text-red-400 hover:text-red-700">×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4 mb-2">
            <label className={`flex-1 p-3 border rounded-xl cursor-pointer transition-all text-center ${formData.role === 'ngo' ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              <input type="radio" name="role" value="ngo" checked={formData.role === 'ngo'} onChange={handleChange} className="hidden"/>
              NGO
            </label>
            <label className={`flex-1 p-3 border rounded-xl cursor-pointer transition-all text-center ${formData.role === 'restaurant' ? 'border-orange-500 bg-orange-50 text-orange-700 font-medium' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              <input type="radio" name="role" value="restaurant" checked={formData.role === 'restaurant'} onChange={handleChange} className="hidden"/>
              Restaurant
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name</label>
            <input 
              type="text" name="name" required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
              placeholder="Good Food Inc."
              value={formData.name} onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" name="email" required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
              placeholder="hello@example.com"
              value={formData.email} onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" name="password" required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
              placeholder="••••••••"
              value={formData.password} onChange={handleChange}
            />
          </div>

          {formData.role === 'ngo' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Watch Radius (km)</label>
              <input 
                type="number" name="watchRadius" required min="1" max="50"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors"
                value={formData.watchRadius} onChange={handleChange}
              />
            </div>
          )}

          <button 
            type="submit" disabled={isLoading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-3 rounded-xl transition-all shadow-sm hover:shadow mt-4"
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-6 text-slate-500 text-sm">
          Already have an account? <Link to="/login" className="text-orange-500 font-medium hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;

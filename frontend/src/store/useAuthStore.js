import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  isLoading: false,
  error: null,

  login: async (email, password, role) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password, role });
      if (response.data) {
        localStorage.setItem('user', JSON.stringify(response.data));
        set({ user: response.data, isLoading: false });
      }
    } catch (error) {
      set({ error: error.response?.data?.message || error.message, isLoading: false });
      throw error;
    }
  },

  register: async (userData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/register', userData);
      if (response.data) {
        localStorage.setItem('user', JSON.stringify(response.data));
        set({ user: response.data, isLoading: false });
      }
    } catch (error) {
      set({ error: error.response?.data?.message || error.message, isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('user');
    set({ user: null });
  },

  updatePreferences: async (preferences) => {
    const response = await api.put('/auth/preferences', preferences);
    localStorage.setItem('user', JSON.stringify(response.data));
    set({ user: response.data });
    return response.data;
  },

  clearError: () => set({ error: null })
}));

export default useAuthStore;

import { create } from 'zustand';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/auth/';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  isLoading: false,
  error: null,

  login: async (email, password, role) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_URL}login`, { email, password, role });
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
      const response = await axios.post(`${API_URL}register`, userData);
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

  clearError: () => set({ error: null })
}));

export default useAuthStore;

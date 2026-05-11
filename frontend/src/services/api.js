import axios from 'axios';
import { API_ROOT } from '../config';

const api = axios.create({ baseURL: API_ROOT });

api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

export default api;

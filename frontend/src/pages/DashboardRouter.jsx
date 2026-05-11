import React from 'react';
import useAuthStore from '../store/useAuthStore';
import NGODashboard from './NGODashboard';
import RestaurantDashboard from './RestaurantDashboard';
import AdminDashboard from './AdminDashboard';

const DashboardRouter = () => {
  const { user } = useAuthStore();

  if (!user) return null;

  if (user.role === 'admin') return <AdminDashboard />;
  return user.role === 'ngo' ? <NGODashboard /> : <RestaurantDashboard />;
};

export default DashboardRouter;

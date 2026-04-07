import React from 'react';
import useAuthStore from '../store/useAuthStore';
import NGODashboard from './NGODashboard';
import RestaurantDashboard from './RestaurantDashboard';

const DashboardRouter = () => {
  const { user } = useAuthStore();

  if (!user) return null;

  return user.role === 'ngo' ? <NGODashboard /> : <RestaurantDashboard />;
};

export default DashboardRouter;

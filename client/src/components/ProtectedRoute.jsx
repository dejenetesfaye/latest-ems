import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ROLE_PATHS = {
  systemadmin: '/systemadmin',
  superadmin: '/superadmin',
  manager: '/manager',
  supervisor: '/supervisor',
  client: '/client',
};

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null;

  if (!user) return <Navigate to="/" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_PATHS[user.role] || '/'} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

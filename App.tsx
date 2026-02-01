
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login, Register } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { ManageDonations, DonorSearch, SystemLogs, UserManagement, DeletedRecords, DirectoryPermissions } from './pages/Admin';
import { MyDonations } from './pages/MyDonations';
import { SupportCenter } from './pages/SupportCenter';
import { UserRole } from './types';

const ProtectedRoute = ({ children, allowedRoles }: { children?: React.ReactNode, allowedRoles?: UserRole[] }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
};

const App = () => {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="/my-donations" element={
            <ProtectedRoute allowedRoles={[UserRole.USER, UserRole.ADMIN, UserRole.EDITOR]}>
              <MyDonations />
            </ProtectedRoute>
          } />

          <Route path="/users" element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.EDITOR]}>
              <UserManagement />
            </ProtectedRoute>
          } />

          <Route path="/manage-donations" element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.EDITOR]}>
              <ManageDonations />
            </ProtectedRoute>
          } />

          <Route path="/donors" element={
            <ProtectedRoute>
              <DonorSearch />
            </ProtectedRoute>
          } />

          <Route path="/notifications" element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <DirectoryPermissions />
            </ProtectedRoute>
          } />

          <Route path="/deleted-users" element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <DeletedRecords />
            </ProtectedRoute>
          } />

           <Route path="/logs" element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.EDITOR]}>
              <SystemLogs />
            </ProtectedRoute>
          } />

          <Route path="/support" element={
            <ProtectedRoute>
              <SupportCenter />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
};

export default App;

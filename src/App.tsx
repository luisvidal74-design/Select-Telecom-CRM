import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { PresenceProvider } from './context/PresenceContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetails from './pages/CustomerDetails';
import Users from './pages/Users';
import Profile from './pages/Profile';
import NewsPage from './pages/News';
import Contracts from './pages/Contracts';
import Calendar from './pages/Calendar';
import Support from './pages/Support';
import Layout from './components/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Laddar...</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Laddar...</div>;
  return user?.isAdmin ? <>{children}</> : <Navigate to="/" />;
}

function DashboardRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Laddar...</div>;
  if (user?.role === 'Kund' && user.customerId) {
    return <Navigate to={`/kunder/${user.customerId}`} />;
  }
  return <Dashboard />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PresenceProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              <Route path="/" element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }>
                <Route index element={<DashboardRedirect />} />
                <Route path="kunder" element={<Customers />} />
                <Route path="kunder/:id" element={<CustomerDetails />} />
                <Route path="anvandare" element={
                  <AdminRoute>
                    <Users />
                  </AdminRoute>
                } />
                <Route path="nyheter" element={<NewsPage />} />
                <Route path="avtal" element={<Contracts />} />
                <Route path="kalender" element={<Calendar />} />
                <Route path="support" element={<Support />} />
                <Route path="profil" element={<Profile />} />
              </Route>
            </Routes>
          </Router>
        </PresenceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

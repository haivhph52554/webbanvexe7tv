import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './components/HomePage';
import BookingDetail from './components/BookingDetail';
import PaymentPage from './components/PaymentPage';
import PaymentSuccess from './components/PaymentSuccess';
import RoutesPage from './components/RoutesPage';
import MyTicketsPage from './components/MyTicketsPage';
import TicketDetailPage from './components/TicketDetailPage';
import ContactPage from './components/ContactPage';
import AdminPage from './components/AdminPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import './App.css';

// Create auth context
interface AuthContextType {
  user: any;
  login: (userData: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
});

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user data exists in localStorage and validate with backend
    const validateAuth = async () => {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const API_BASE = ((import.meta as any)?.env?.VITE_BACKEND_URL as string) || 'http://localhost:5000';
          const response = await fetch(`${API_BASE}/api/auth/me`, {
            credentials: 'include' // Quan trọng để gửi cookie token
          });
          
          if (response.ok) {
            const data = await response.json();
            // Lấy user từ API response thay vì localStorage
            if (data.success && data.data) {
              setUser(data.data);
              localStorage.setItem('user', JSON.stringify(data.data));
            } else {
              // Fallback to localStorage nếu API không trả về data
              setUser(JSON.parse(userData));
            }
          } else {
            // Clear invalid auth data
            logout();
          }
        } catch (error) {
          // Clear auth data on error
          logout();
        }
      }
    };

    validateAuth();
  }, []);

  const login = (userData: any) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = () => useContext(AuthContext);

// Protected route component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ 
  children, 
  allowedRoles = [] 
}) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route
              path="/my-tickets"
              element={
                <ProtectedRoute>
                  <MyTicketsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ticket-detail"
              element={
                <ProtectedRoute>
                  <TicketDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/booking/:routeId"
              element={
                <ProtectedRoute>
                  <BookingDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment"
              element={
                <ProtectedRoute>
                  <PaymentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment-success"
              element={
                <ProtectedRoute>
                  <PaymentSuccess />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;

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

// 1. Thêm isLoading vào Context Type
interface AuthContextType {
  user: any;
  isLoading: boolean; 
  login: (userData: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true, // Mặc định là đang load
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true); // State để theo dõi quá trình check login

  useEffect(() => {
    const validateAuth = async () => {
      setIsLoading(true); // Bắt đầu check
      const userData = localStorage.getItem('user');
      
      if (userData) {
        try {
          // Lấy URL Backend từ biến môi trường hoặc fallback về localhost
          const API_BASE = ((import.meta as any)?.env?.VITE_BACKEND_URL as string) || 'http://localhost:5000';
          
          const response = await fetch(`${API_BASE}/api/auth/me`, {
            credentials: 'include' // Quan trọng để gửi cookie token
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              setUser(data.data);
              localStorage.setItem('user', JSON.stringify(data.data));
            } else {
              setUser(JSON.parse(userData));
            }
          } else {
            // Token hết hạn hoặc không hợp lệ
            logout();
          }
        } catch (error) {
          logout();
        }
      } else {
        // Không có data trong storage
        setIsLoading(false);
      }
      setIsLoading(false); // Kết thúc check
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
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

// Protected route component đã được nâng cấp
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ 
  children, 
  allowedRoles = [] 
}) => {
  const { user, isLoading } = useAuth();

  // 2. Nếu đang check login thì hiện màn hình chờ, ĐỪNG redirect vội
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-gray-500 text-sm">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Check xong rồi mà không có user thì mới đá về login
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
            
            {/* Các route cần bảo vệ */}
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
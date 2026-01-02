import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bus, MapPin, Clock, Users, Star, Search, Calendar, LogOut, User } from 'lucide-react';
import { useAuth } from '../App';

type RouteDoc = {
  _id: string;
  name?: string;
  from_city?: string;
  to_city?: string;
  total_distance_km?: number;
  estimated_duration_min?: number;
  active?: boolean;
};

const API_BASE =
  (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_BACKEND_URL) || '';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuth();

  const [routes, setRoutes] = useState<RouteDoc[]>([]);
  const [allRoutes, setAllRoutes] = useState<RouteDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Search form state
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [searchDate, setSearchDate] = useState('');

  const handleBookingClick = (routeId: string) => {
    navigate(`/booking/${routeId}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouteId) return; // Prevent search without route
    
    // Navigate to booking page directly with date param
    const params = new URLSearchParams();
    if (searchDate) {
      params.append('date', searchDate);
    }
    
    const queryString = params.toString();
    navigate(`/booking/${selectedRouteId}${queryString ? `?${queryString}` : ''}`);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(`${API_BASE}/api/routes`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: RouteDoc[] = await res.json();
        if (!mounted) return;

        // Load ALL active routes for the dropdown
        const activeRoutes = (Array.isArray(data) ? data : []).filter(r => r?.active !== false);
        setAllRoutes(activeRoutes);
        
        // Popular routes (limit to 6)
        setRoutes(activeRoutes.slice(0, 6));
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || 'Lỗi tải dữ liệu');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const fmtDuration = (mins?: number) => {
    if (typeof mins !== 'number' || Number.isNaN(mins)) return '-';
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    return `${m}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Bus className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">VeXe7TV</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <button className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                Trang chủ
              </button>
              <Link to="/routes" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                Tuyến đường
              </Link>
              <button onClick={() => navigate('/my-tickets')}
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                Vé của tôi
              </button>
              <button onClick={() => navigate('/contact')}
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                Liên hệ
              </button>
            </nav>
            <div className="flex items-center space-x-4">
              {auth.user ? (
                <div className="flex items-center space-x-4">
                  <div className="flex items-center text-gray-700">
                    <User className="h-5 w-5 mr-2" />
                    <span className="font-medium">{auth.user.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      auth.logout();
                      navigate('/');
                    }}
                    className="flex items-center text-gray-700 hover:text-red-600"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => navigate('/login')}
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Đăng nhập
                  </button>
                  <button 
                    onClick={() => navigate('/register')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    Đăng ký
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Đặt vé xe khách <span className="text-blue-600">dễ dàng</span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Tìm kiếm và đặt vé xe khách nhanh chóng với giá cả hợp lý. Hành trình thuận tiện, an toàn và tiết kiệm.
            </p>
          </div>

          {/* Search Form */}
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-xl p-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative md:col-span-2">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <select
                    value={selectedRouteId}
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                    required
                  >
                    <option value="">Chọn chặng đường...</option>
                    {allRoutes.map(route => (
                      <option key={route._id} value={route._id}>
                        {route.name ? route.name : `${route.from_city} - ${route.to_city}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input 
                    type="date"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  />
                </div>
                <button 
                  type="submit"
                  className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 flex items-center justify-center font-medium transition-colors"
                >
                  <Search className="h-5 w-5 mr-2" /> Tìm kiếm
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Tại sao chọn VeXe7TV?</h3>
            <p className="text-xl text-gray-600">Dịch vụ đặt vé xe khách hàng đầu với nhiều ưu điểm vượt trội</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Đặt vé nhanh chóng</h4>
              <p className="text-gray-600">Chỉ với vài cú click, bạn có thể đặt vé một cách dễ dàng.</p>
            </div>
            <div className="text-center p-6">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Hỗ trợ 24/7</h4>
              <p className="text-gray-600">CSKH luôn sẵn sàng mọi lúc, mọi nơi.</p>
            </div>
            <div className="text-center p-6">
              <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Chất lượng cao</h4>
              <p className="text-gray-600">Dịch vụ uy tín, giá hợp lý.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Routes: đọc từ /api/routes */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Tuyến đường phổ biến</h3>
            <p className="text-xl text-gray-600">Khám phá các tuyến đường được yêu thích nhất</p>
          </div>

          {loading ? (
            <div className="text-center text-gray-500">Đang tải tuyến đường…</div>
          ) : err ? (
            <div className="text-center text-red-600">Lỗi: {err}</div>
          ) : routes.length === 0 ? (
            <div className="text-center text-gray-500">Chưa có dữ liệu tuyến đường.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {routes.map(route => (
                <div key={route._id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="font-medium text-gray-900">{route.from_city || '-'}</span>
                    </div>
                    <div className="flex-1 mx-4"><div className="border-t border-dashed border-gray-300"></div></div>
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-green-600 mr-2" />
                      <span className="font-medium text-gray-900">{route.to_city || '-'}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 inline mr-1" />
                      {fmtDuration(route.estimated_duration_min)}
                    </div>
                    <div className="font-medium">
                      {typeof route.total_distance_km === 'number' ? `${route.total_distance_km} km` : '-'}
                    </div>
                  </div>

                  <button
                    onClick={() => handleBookingClick(route._id)}
                    className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Đặt vé ngay
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Bus className="h-8 w-8 text-blue-400" />
                <h4 className="ml-2 text-xl font-bold">VeXe7TV</h4>
              </div>
              <p className="text-gray-400">Dịch vụ đặt vé xe khách trực tuyến hàng đầu Việt Nam.</p>
            </div>
            <div>
              <h5 className="text-lg font-semibold mb-4">Dịch vụ</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Đặt vé xe khách</a></li>
                <li><a href="#" className="hover:text-white">Tra cứu tuyến đường</a></li>
                <li><a href="#" className="hover:text-white">Hỗ trợ khách hàng</a></li>
                <li><a href="#" className="hover:text-white">Chính sách hoàn vé</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-lg font-semibold mb-4">Hỗ trợ</h5>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Câu hỏi thường gặp</a></li>
                <li><a href="#" className="hover:text-white">Hướng dẫn đặt vé</a></li>
                <li><a href="#" className="hover:text-white">Liên hệ</a></li>
                <li><a href="#" className="hover:text-white">Báo cáo sự cố</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-lg font-semibold mb-4">Liên hệ</h5>
              <div className="space-y-2 text-gray-400">
                <p>📞 Hotline: 1900 1234</p>
                <p>📧 Email: support@vexe7tv.com</p>
                <p>📍 123 Trịnh Văn Bô, Nam Từ Liêm, Hà Nội</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 VeXe7TV. Tất cả quyền được bảo lưu.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;

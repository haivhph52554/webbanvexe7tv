import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bus, MapPin, Clock, Star, Search, Calendar, Filter } from 'lucide-react';

interface Route {
  id: string;
  from: string;
  to: string;
  price: string;
  duration: string;
  departureTime: string;
  arrivalTime: string;
  busType: string;
  availableSeats: number;
  rating: number;
  company: string;
  features: string[];
}

const API_BASE = ((import.meta as any)?.env?.VITE_BACKEND_URL as string) || '';

const RoutesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'duration' | 'rating'>('price');
  const [filterBusType, setFilterBusType] = useState<string>('all');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Debounced search term to prevent frequent re-renders
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    let mounted = true;
    const fetchRoutes = async () => {
      try {
        setLoading(true);
        // Fetch all data in one request instead of multiple
  const res = await fetch(`${API_BASE}/api/routes/detailed`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (mounted) {
          setRoutes(data.map((r: any) => ({
            id: r._id || r.id,
            from: r.from_city || r.from || r.name || '—',
            to: r.to_city || r.to || '—',
            price: r.base_price ? String(r.base_price) : '',
            duration: r.estimated_duration_min ? `${Math.round(r.estimated_duration_min/60)}h` : (r.duration || ''),
            departureTime: r.start_time ? new Date(r.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            arrivalTime: r.end_time ? new Date(r.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            busType: r.bus_type || '',
            availableSeats: typeof r.availableSeats === 'number' ? r.availableSeats : 0,
            rating: r.avgRating ? Math.round(r.avgRating * 10) / 10 : 0,
            company: r.company || '',
            features: r.features || []
          })));
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Lỗi khi tải tuyến');
          setLoading(false);
        }
      }
    };

    fetchRoutes();
    return () => { mounted = false; };
  }, []);

  // Memoize filtered and sorted routes
  const filteredRoutes = useMemo(() => {
    return routes
      .filter(route => {
        const matchesSearch = route.from.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                           route.to.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
        const matchesBusType = filterBusType === 'all' || route.busType.includes(filterBusType);
        return matchesSearch && matchesBusType;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'price':
            return parseInt(a.price.replace(',', '')) - parseInt(b.price.replace(',', ''));
          case 'duration':
            return parseInt(a.duration.replace('h', '')) - parseInt(b.duration.replace('h', ''));
          case 'rating':
            return b.rating - a.rating;
          default:
            return 0;
        }
      });
  }, [routes, debouncedSearchTerm, filterBusType, sortBy]);

  const handleBookingClick = useCallback((routeId: string) => {
    navigate(`/booking/${routeId}`);
  }, [navigate]);

  // Memoize stats calculations
  const stats = useMemo(() => ({
    totalRoutes: routes.length,
    totalSeats: routes.reduce((sum, route) => sum + route.availableSeats, 0),
    averageRating: routes.length ? Math.round((routes.reduce((sum, route) => sum + route.rating, 0) / routes.length) * 10) / 10 : 0,
    uniqueCompanies: new Set(routes.map(route => route.company)).size
  }), [routes]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Bus className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <div className="text-lg font-medium">Đang tải danh sách tuyến...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">Lỗi: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center text-gray-600 hover:text-blue-600 mr-4"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Quay lại
            </button>
            <div className="flex items-center">
              <Bus className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">VeXe7TV</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Tất cả tuyến đường</h2>
          <p className="text-gray-600">Khám phá các tuyến đường xe khách có sẵn</p>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm tuyến đường..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <select
                value={filterBusType}
                onChange={(e) => setFilterBusType(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">Tất cả loại xe</option>
                <option value="Xe ngồi">Xe ngồi</option>
                <option value="Xe giường nằm">Xe giường nằm</option>
                <option value="VIP">Xe VIP</option>
              </select>
            </div>
            
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'price' | 'duration' | 'rating')}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="price">Sắp xếp theo giá</option>
                <option value="duration">Sắp xếp theo thời gian</option>
                <option value="rating">Sắp xếp theo đánh giá</option>
              </select>
            </div>
          </div>
        </div>

        {/* Routes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoutes.map((route) => (
            <div key={route.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              {/* Route Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-medium text-gray-900">{route.from}</span>
                </div>
                <div className="flex-1 mx-4">
                  <div className="border-t border-dashed border-gray-300"></div>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium text-gray-900">{route.to}</span>
                </div>
              </div>

              {/* Route Info */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-1" />
                    {route.duration}
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {route.price}₫
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Giờ khởi hành:</span>
                  <span className="font-medium">{route.departureTime}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Loại xe:</span>
                  <span className="font-medium">{route.busType}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Nhà xe:</span>
                  <span className="font-medium">{route.company}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Ghế trống:</span>
                  <span className="font-medium text-green-600">{route.availableSeats} ghế</span>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < Math.floor(route.rating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="ml-2 text-sm text-gray-600">{route.rating}/5</span>
              </div>

              {/* Features */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {route.features.map((feature, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              {/* Book Button */}
              <button
                onClick={() => handleBookingClick(route.id)}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Đặt vé ngay
              </button>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredRoutes.length === 0 && (
          <div className="text-center py-12">
            <Bus className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Không tìm thấy tuyến đường</h3>
            <p className="text-gray-600">Vui lòng thử lại với từ khóa khác hoặc bộ lọc khác</p>
          </div>
        )}

        {/* Stats */}
        <div className="mt-12 bg-white rounded-xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Thống kê</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.totalRoutes}</div>
                <div className="text-sm text-gray-600">Tổng tuyến đường</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {stats.totalSeats}
                </div>
              <div className="text-sm text-gray-600">Ghế có sẵn</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                  {stats.averageRating}
              </div>
              <div className="text-sm text-gray-600">Đánh giá trung bình</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                  {stats.uniqueCompanies}
              </div>
              <div className="text-sm text-gray-600">Nhà xe</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoutesPage;

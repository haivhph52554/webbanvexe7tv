import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bus, MapPin, Clock, Users, Star, Search, Calendar, Filter } from 'lucide-react';

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

const RoutesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'duration' | 'rating'>('price');
  const [filterBusType, setFilterBusType] = useState<string>('all');

  // Mock data - trong thực tế sẽ fetch từ API
  const routes: Route[] = [
    {
      id: "hn-hcm",
      from: "Hà Nội",
      to: "Hồ Chí Minh",
      price: "450,000",
      duration: "24h",
      departureTime: "08:00",
      arrivalTime: "08:00+1",
      busType: "Xe giường nằm VIP",
      availableSeats: 12,
      rating: 4.8,
      company: "Phương Trang",
      features: ["WiFi", "Điều hòa", "Nước uống", "Chăn gối"]
    },
    {
      id: "hn-dn",
      from: "Hà Nội",
      to: "Đà Nẵng",
      price: "320,000",
      duration: "16h",
      departureTime: "20:00",
      arrivalTime: "12:00+1",
      busType: "Xe giường nằm",
      availableSeats: 8,
      rating: 4.6,
      company: "Hoàng Long",
      features: ["WiFi", "Điều hòa", "Nước uống"]
    },
    {
      id: "hcm-nt",
      from: "Hồ Chí Minh",
      to: "Nha Trang",
      price: "180,000",
      duration: "8h",
      departureTime: "22:00",
      arrivalTime: "06:00+1",
      busType: "Xe giường nằm",
      availableSeats: 15,
      rating: 4.7,
      company: "Mai Linh",
      features: ["WiFi", "Điều hòa", "Nước uống", "Chăn gối"]
    },
    {
      id: "hn-hp",
      from: "Hà Nội",
      to: "Hải Phòng",
      price: "80,000",
      duration: "2h",
      departureTime: "06:00",
      arrivalTime: "08:00",
      busType: "Xe ngồi",
      availableSeats: 25,
      rating: 4.5,
      company: "Hải Âu",
      features: ["Điều hòa", "Nước uống"]
    },
    {
      id: "hcm-ct",
      from: "Hồ Chí Minh",
      to: "Cần Thơ",
      price: "120,000",
      duration: "4h",
      departureTime: "14:00",
      arrivalTime: "18:00",
      busType: "Xe ngồi",
      availableSeats: 20,
      rating: 4.4,
      company: "Phương Trang",
      features: ["WiFi", "Điều hòa", "Nước uống"]
    },
    {
      id: "dn-hue",
      from: "Đà Nẵng",
      to: "Huế",
      price: "60,000",
      duration: "2h",
      departureTime: "07:00",
      arrivalTime: "09:00",
      busType: "Xe ngồi",
      availableSeats: 30,
      rating: 4.3,
      company: "Mai Linh",
      features: ["Điều hòa", "Nước uống"]
    },
    {
      id: "hcm-dalat",
      from: "Hồ Chí Minh",
      to: "Đà Lạt",
      price: "200,000",
      duration: "6h",
      departureTime: "23:00",
      arrivalTime: "05:00+1",
      busType: "Xe giường nằm VIP",
      availableSeats: 10,
      rating: 4.9,
      company: "Phương Trang",
      features: ["WiFi", "Điều hòa", "Nước uống", "Chăn gối", "TV"]
    },
    {
      id: "hn-qn",
      from: "Hà Nội",
      to: "Quảng Ninh",
      price: "150,000",
      duration: "3h",
      departureTime: "09:00",
      arrivalTime: "12:00",
      busType: "Xe ngồi",
      availableSeats: 18,
      rating: 4.2,
      company: "Hải Âu",
      features: ["WiFi", "Điều hòa", "Nước uống"]
    }
  ];

  const filteredRoutes = routes
    .filter(route => {
      const matchesSearch = route.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           route.to.toLowerCase().includes(searchTerm.toLowerCase());
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

  const handleBookingClick = (routeId: string) => {
    navigate(`/booking/${routeId}`);
  };

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
              <div className="text-2xl font-bold text-blue-600">{routes.length}</div>
              <div className="text-sm text-gray-600">Tổng tuyến đường</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {routes.reduce((sum, route) => sum + route.availableSeats, 0)}
              </div>
              <div className="text-sm text-gray-600">Ghế có sẵn</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {Math.round(routes.reduce((sum, route) => sum + route.rating, 0) / routes.length * 10) / 10}
              </div>
              <div className="text-sm text-gray-600">Đánh giá trung bình</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(routes.map(route => route.company)).size}
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

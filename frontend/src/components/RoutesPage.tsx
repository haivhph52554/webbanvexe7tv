import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bus, MapPin, Clock, Star, Search, Calendar, Filter } from 'lucide-react';

type RouteDoc = {
  _id: string;
  from_city?: string;
  to_city?: string;
  estimated_duration_min?: number;
  total_distance_km?: number;
  active?: boolean;
};

type TripDoc = {
  _id: string;
  route: string | RouteDoc;
  bus?: { bus_type?: string; seat_count?: number };
  start_time: string; // ISO
  end_time?: string;  // ISO
  base_price?: number;
};

type TripDetailResponse = {
  trip: TripDoc;
  seats: { seat_number: string; status: 'available'|'reserved'|'booked'|'checked_in' }[];
};

const API_BASE =
  ((import.meta as any)?.env?.VITE_BACKEND_URL as string) ||
  'http://localhost:5000';

const fmtTime = (iso?: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const fmtDuration = (mins?: number) => {
  if (typeof mins !== 'number' || Number.isNaN(mins)) return '-';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
};

const RoutesPage: React.FC = () => {
  const navigate = useNavigate();

  // bộ lọc UI
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'duration' | 'rating'>('price');
  const [filterBusType, setFilterBusType] = useState<string>('all');

  // dữ liệu thật
  const [routes, setRoutes] = useState<RouteDoc[]>([]);
  const [trips, setTrips] = useState<TripDoc[]>([]);
  const [availByTrip, setAvailByTrip] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // tải routes + trips
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const [r1, r2] = await Promise.all([
          fetch(`${API_BASE}/api/routes`),
          fetch(`${API_BASE}/api/trips`)
        ]);
        if (!r1.ok) throw new Error(`routes HTTP ${r1.status}`);
        if (!r2.ok) throw new Error(`trips HTTP ${r2.status}`);
        const routesData: RouteDoc[] = await r1.json();
        const tripsData: TripDoc[] = await r2.json();

        if (!mounted) return;

        // chỉ giữ tuyến active
        const routeActive = (routesData || []).filter(x => x?.active !== false);
        setRoutes(routeActive);

        // trips chuẩn hóa: route có thể là object hoặc id – ép về id string
        const normalizedTrips = (tripsData || []).map(t => ({
          ...t,
          route: typeof t.route === 'object' && t.route ? (t.route as RouteDoc)._id : (t.route as string)
        }));
        setTrips(normalizedTrips as TripDoc[]);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || 'Lỗi tải dữ liệu');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // với mỗi route, lấy chuyến “gần nhất sắp khởi hành”
  const cardData = useMemo(() => {
    const now = Date.now();
    return routes.map((route) => {
      const routeTrips = trips.filter(t => String(t.route) === String(route._id));
      if (routeTrips.length === 0) return { route, trip: null as TripDoc | null };

      // lấy chuyến sớm nhất >= now, nếu không có thì lấy chuyến gần nhất trong quá khứ
      const future = routeTrips.filter(t => new Date(t.start_time).getTime() >= now);
      const chosen = (future.length ? future : routeTrips)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0];

      return { route, trip: chosen };
    });
  }, [routes, trips]);

  // tải số ghế trống cho các trip được chọn (song song)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const chosenTrips = cardData.map(c => c.trip?._id).filter(Boolean) as string[];
      const uniq = Array.from(new Set(chosenTrips));
      if (uniq.length === 0) return;

      try {
        const results = await Promise.all(
          uniq.map(async (id) => {
            const res = await fetch(`${API_BASE}/api/trips/${id}`);
            if (!res.ok) throw new Error(`trip ${id} HTTP ${res.status}`);
            const data: TripDetailResponse = await res.json();
            const available = (data.seats || []).filter(s => s.status === 'available').length;
            return { id, available };
          })
        );
        if (!mounted) return;
        const map: Record<string, number> = {};
        results.forEach(r => { map[r.id] = r.available; });
        setAvailByTrip(map);
      } catch (e) {
        // im lặng: vẫn render được, chỉ thiếu số ghế trống
      }
    })();
    return () => { mounted = false; };
  }, [cardData]);

  const filtered = useMemo(() => {
    const items = cardData
      .filter(({ route }) => {
        const kw = searchTerm.trim().toLowerCase();
        if (!kw) return true;
        return (
          (route.from_city || '').toLowerCase().includes(kw) ||
          (route.to_city || '').toLowerCase().includes(kw)
        );
      })
      .filter(({ trip }) => {
        if (!trip) return true;
        if (filterBusType === 'all') return true;
        const type = trip.bus?.bus_type || '';
        return type.includes(filterBusType);
      })
      .map(({ route, trip }) => {
        const availableSeats = trip ? (availByTrip[trip._id] ?? 0) : 0;
        const price = trip?.base_price || 0;
        return {
          id: route._id,
          from: route.from_city || '-',
          to: route.to_city || '-',
          durationStr: fmtDuration(route.estimated_duration_min),
          departureTime: fmtTime(trip?.start_time),
          arrivalTime: fmtTime(trip?.end_time),
          busType: trip?.bus?.bus_type || '-',
          price,
          availableSeats,
          rating: 4.5 // TODO: thay bằng field thực nếu có
        };
      });

    // sort
    return items.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price;
        case 'duration': {
          const parse = (s: string) => {
            const m = /(?:(\d+)h)?\s*(?:(\d+)m)?/.exec(s || '');
            const h = m?.[1] ? +m[1] : 0;
            const mi = m?.[2] ? +m[2] : 0;
            return h * 60 + mi;
          };
          return parse(a.durationStr) - parse(b.durationStr);
        }
        case 'rating':
          return b.rating - a.rating;
        default:
          return 0;
      }
    });
  }, [cardData, searchTerm, filterBusType, sortBy, availByTrip]);

  const handleBookingClick = (routeId: string) => {
    navigate(`/booking/${routeId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button onClick={() => navigate('/')} className="flex items-center text-gray-600 hover:text-blue-600 mr-4">
              <ArrowLeft className="h-5 w-5 mr-2" /> Quay lại
            </button>
            <div className="flex items-center">
              <Bus className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">VeXe7TV</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Tất cả tuyến đường</h2>
          <p className="text-gray-600">Khám phá các tuyến đường xe khách có sẵn</p>
        </div>

        {/* Search & filters */}
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
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="price">Sắp xếp theo giá</option>
                <option value="duration">Sắp xếp theo thời gian</option>
                <option value="rating">Sắp xếp theo đánh giá</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center text-gray-500">Đang tải dữ liệu…</div>
        ) : err ? (
          <div className="text-center text-red-600">Lỗi: {err}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Bus className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Không tìm thấy tuyến đường</h3>
            <p className="text-gray-600">Vui lòng thử lại với từ khóa hoặc bộ lọc khác</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="font-medium text-gray-900">{item.from}</span>
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="border-t border-dashed border-gray-300"></div>
                    </div>
                    <div className="flex items-center">
                      <MapPin className="h-5 w-5 text-green-600 mr-2" />
                      <span className="font-medium text-gray-900">{item.to}</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-1" />
                        {item.durationStr}
                      </div>
                      <div className="text-lg font-bold text-blue-600">
                        {item.price.toLocaleString()}₫
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Giờ khởi hành:</span>
                      <span className="font-medium">{item.departureTime}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Giờ đến:</span>
                      <span className="font-medium">{item.arrivalTime}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Loại xe:</span>
                      <span className="font-medium">{item.busType}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Ghế trống:</span>
                      <span className="font-medium text-green-600">{item.availableSeats} ghế</span>
                    </div>
                  </div>

                  <div className="flex items-center mb-4">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < Math.floor(item.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <span className="ml-2 text-sm text-gray-600">{item.rating}/5</span>
                  </div>

                  <button
                    onClick={() => handleBookingClick(item.id)}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Đặt vé ngay
                  </button>
                </div>
              ))}
            </div>

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
                    {filtered.reduce((sum, r) => sum + r.availableSeats, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Ghế có sẵn (trên các tuyến hiển thị)</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {Math.round((filtered.reduce((s, r) => s + r.rating, 0) / filtered.length) * 10) / 10}
                  </div>
                  <div className="text-sm text-gray-600">Đánh giá trung bình</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{cardData.filter(c => c.trip).length}</div>
                  <div className="text-sm text-gray-600">Số tuyến có chuyến hiển thị</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RoutesPage;

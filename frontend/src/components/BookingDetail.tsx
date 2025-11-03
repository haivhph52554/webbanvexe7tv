// src/components/BookingDetail.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bus, MapPin, Clock, Users, Calendar } from 'lucide-react';

/** ====== Types khớp với API hiện tại ====== */
type TripDoc = {
  _id: string;
  route: {
    _id: string;
    name?: string;
    from_city?: string;
    to_city?: string;
    estimated_duration_min?: number;
  };
  bus: {
    _id: string;
    license_plate?: string;
    bus_type?: string;
    seat_count?: number;
  };
  start_time: string;         // ISO
  end_time?: string | null;   // ISO
  base_price?: number;
  direction?: 'go' | 'return';
  status?: 'scheduled' | 'departed' | 'completed' | 'cancelled';
};

type SeatDoc = {
  _id: string;
  trip: string;
  seat_number: string; // "1", "2", ...
  status: 'available' | 'reserved' | 'booked' | 'checked_in';
  booking_id?: string | null;
};

type TripDetailResponse = {
  trip: TripDoc;
  seats: SeatDoc[];
};

/** Ưu tiên biến môi trường Vite; fallback localhost:5000 */
const API_BASE =
  ((import.meta as any)?.env?.VITE_BACKEND_URL as string) ||
  'http://localhost:5000';

const BookingDetail: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();

  // Danh sách các trip thuộc route
  const [allTrips, setAllTrips] = useState<TripDoc[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [errTrips, setErrTrips] = useState<string | null>(null);

  // Trip đang chọn
  const [selectedTrip, setSelectedTrip] = useState<TripDoc | null>(null);

  // Chi tiết trip + seats
  const [tripDetail, setTripDetail] = useState<TripDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errDetail, setErrDetail] = useState<string | null>(null);

  // UI chọn ghế + thông tin hành khách
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [passengerInfo, setPassengerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    note: ''
  });

  /** 1) Lấy tất cả trips rồi lọc theo routeId trên URL */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingTrips(true);
        setErrTrips(null);

        const res = await fetch(`${API_BASE}/api/trips`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: TripDoc[] = await res.json();

        if (!mounted) return;

        const filtered = (data || []).filter(
          t => String(t?.route?._id) === String(routeId)
        );
        filtered.sort(
          (a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );

        setAllTrips(filtered);
        setSelectedTrip(filtered[0] || null);
      } catch (e: any) {
        if (!mounted) return;
        setErrTrips(e?.message || 'Lỗi tải danh sách chuyến');
      } finally {
        if (mounted) setLoadingTrips(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [routeId]);

  /** 2) Khi đổi selectedTrip → lấy seats của trip đó */
  useEffect(() => {
    if (!selectedTrip?._id) {
      setTripDetail(null);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoadingDetail(true);
        setErrDetail(null);
        setSelectedSeats([]); // reset ghế khi đổi chuyến

        const res = await fetch(`${API_BASE}/api/trips/${selectedTrip._id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: TripDetailResponse = await res.json();
        if (!mounted) return;

        setTripDetail(data);
      } catch (e: any) {
        if (!mounted) return;
        setErrDetail(e?.message || 'Lỗi tải chi tiết chuyến');
      } finally {
        if (mounted) setLoadingDetail(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedTrip?._id]);

  /** ===== Helpers ===== */
  const fmtTime = (iso?: string | null) => {
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

  const busSeatCount = useMemo(
    () => tripDetail?.trip?.bus?.seat_count || 0,
    [tripDetail?.trip?.bus?.seat_count]
  );

  const availableSeatsCount = useMemo(() => {
    const seats = tripDetail?.seats || [];
    return seats.filter(s => s.status === 'available').length;
  }, [tripDetail?.seats]);

  // Map ghế -> trạng thái (để disable ghế đã bán/giữ)
  const seatStatusByNumber = useMemo(() => {
    const map = new Map<number, SeatDoc['status']>();
    const seats = tripDetail?.seats || [];
    for (const s of seats) {
      const n = parseInt(s.seat_number, 10);
      if (!Number.isNaN(n)) map.set(n, s.status);
    }
    return map;
  }, [tripDetail?.seats]);

  const handleSeatSelect = (seatNumber: number) => {
    const status = seatStatusByNumber.get(seatNumber);
    if (status && status !== 'available') return;

    setSelectedSeats(prev =>
      prev.includes(seatNumber)
        ? prev.filter(s => s !== seatNumber)
        : [...prev, seatNumber]
    );
  };

  /** 3) Sang trang /payment, mang theo đủ data để gọi checkout ở PaymentPage */
  const handleBooking = () => {
    if (!tripDetail?.trip?._id) {
      alert('Chưa chọn chuyến.');
      return;
    }
    if (selectedSeats.length === 0) {
      alert('Vui lòng chọn ít nhất một ghế');
      return;
    }
    if (!passengerInfo.name || !passengerInfo.phone) {
      alert('Vui lòng điền đầy đủ thông tin hành khách');
      return;
    }

    navigate('/payment', {
      state: {
        // những thứ PaymentPage cần để gọi POST /api/bookings/checkout
        tripId: tripDetail.trip._id,
        seats: selectedSeats, // mảng số
        passenger: passengerInfo,
        // thông tin hiển thị tóm tắt ở PaymentPage
        route: {
          from: tripDetail.trip.route?.from_city || '',
          to: tripDetail.trip.route?.to_city || '',
          durationMin: tripDetail.trip.route?.estimated_duration_min || null
        },
        bus: {
          busType: tripDetail.trip.bus?.bus_type || '',
          licensePlate: tripDetail.trip.bus?.license_plate || '',
          seatCount: tripDetail.trip.bus?.seat_count || 0
        },
        times: {
          departureTime: tripDetail.trip.start_time,
          arrivalTime: tripDetail.trip.end_time || null
        },
        pricePerSeat: tripDetail.trip.base_price || 0
      }
    });
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
        {/* Chọn chuyến */}
        <div className="mb-6">
          {loadingTrips ? (
            <div className="text-gray-500">Đang tải danh sách chuyến…</div>
          ) : errTrips ? (
            <div className="text-red-600">Lỗi: {errTrips}</div>
          ) : allTrips.length === 0 ? (
            <div className="text-gray-600">Không tìm thấy chuyến nào cho tuyến này.</div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Chọn chuyến:</span>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
                value={selectedTrip?._id || ''}
                onChange={(e) => {
                  const t = allTrips.find(x => x._id === e.target.value) || null;
                  setSelectedTrip(t);
                }}
              >
                {allTrips.map(t => (
                  <option key={t._id} value={t._id}>
                    {t.route?.from_city || '-'} → {t.route?.to_city || '-'} | {fmtTime(t.start_time)} — {fmtTime(t.end_time || undefined)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {selectedTrip && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Thông tin tuyến/chuyến */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Chi tiết tuyến đường</h2>

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <MapPin className="h-6 w-6 text-blue-600 mr-3" />
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedTrip.route?.from_city || '-'}
                      </p>
                      <p className="text-sm text-gray-600">Điểm đi</p>
                    </div>
                  </div>

                  <div className="flex-1 mx-6">
                    <div className="border-t-2 border-dashed border-gray-300"></div>
                    <div className="text-center mt-2">
                      <Clock className="h-4 w-4 inline mr-1" />
                      <span className="text-sm text-gray-600">
                        {fmtDuration(selectedTrip.route?.estimated_duration_min)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <MapPin className="h-6 w-6 text-green-600 mr-3" />
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedTrip.route?.to_city || '-'}
                      </p>
                      <p className="text-sm text-gray-600">Điểm đến</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Giờ khởi hành</p>
                    <p className="text-gray-600">{fmtTime(selectedTrip.start_time)}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Calendar className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Giờ đến</p>
                    <p className="text-gray-600">{fmtTime(selectedTrip.end_time || undefined)}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Bus className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Loại xe</p>
                    <p className="text-gray-600">{selectedTrip.bus?.bus_type || '-'}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Users className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Ghế trống</p>
                    <p className="text-gray-600">
                      {loadingDetail ? '…' : `${availableSeatsCount} ghế`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Chọn ghế */}
              <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Chọn ghế</h3>

                {loadingDetail ? (
                  <div className="text-gray-500">Đang tải sơ đồ ghế…</div>
                ) : errDetail ? (
                  <div className="text-red-600">Lỗi: {errDetail}</div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-3">
                      {Array.from({ length: busSeatCount }, (_, i) => i + 1).map(seatNumber => {
                        const status = seatStatusByNumber.get(seatNumber) || 'available';
                        const isSelected = selectedSeats.includes(seatNumber);
                        const isBlocked = status !== 'available';

                        return (
                          <button
                            key={seatNumber}
                            onClick={() => !isBlocked && handleSeatSelect(seatNumber)}
                            disabled={isBlocked}
                            className={[
                              'p-3 rounded-lg border-2 text-center font-medium transition-colors',
                              isBlocked
                                ? 'bg-red-100 text-gray-500 border-red-300 cursor-not-allowed'
                                : isSelected
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                            ].join(' ')}
                            title={isBlocked ? `Ghế ${seatNumber} đã bán/giữ` : `Ghế ${seatNumber}`}
                          >
                            {seatNumber}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex items-center space-x-6">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded mr-2"></div>
                        <span className="text-sm text-gray-600">Ghế trống</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-blue-600 border-2 border-blue-600 rounded mr-2"></div>
                        <span className="text-sm text-gray-600">Ghế đã chọn</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded mr-2"></div>
                        <span className="text-sm text-gray-600">Ghế đã bán/giữ</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Thông tin hành khách */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Thông tin hành khách</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Họ và tên *</label>
                    <input
                      type="text"
                      value={passengerInfo.name}
                      onChange={(e) => setPassengerInfo({ ...passengerInfo, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập họ và tên"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại *</label>
                    <input
                      type="tel"
                      value={passengerInfo.phone}
                      onChange={(e) => setPassengerInfo({ ...passengerInfo, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập số điện thoại"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={passengerInfo.email}
                      onChange={(e) => setPassengerInfo({ ...passengerInfo, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú</label>
                    <input
                      type="text"
                      value={passengerInfo.note}
                      onChange={(e) => setPassengerInfo({ ...passengerInfo, note: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ghi chú thêm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tóm tắt đặt vé */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-md p-6 sticky top-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Tóm tắt đặt vé</h3>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tuyến đường:</span>
                    <span className="font-medium">
                      {(selectedTrip.route?.from_city || '-')} - {(selectedTrip.route?.to_city || '-')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Số ghế:</span>
                    <span className="font-medium">{selectedSeats.length} ghế</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ghế đã chọn:</span>
                    <span className="font-medium">{selectedSeats.join(', ') || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Giá/ghế:</span>
                    <span className="font-medium">
                      {(selectedTrip.base_price || 0).toLocaleString()}₫
                    </span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Tổng cộng:</span>
                      <span className="text-blue-600">
                        {((selectedTrip.base_price || 0) * selectedSeats.length).toLocaleString()}₫
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleBooking}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
                >
                  Tiếp tục thanh toán
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingDetail;

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../App';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bus, MapPin, Clock, Users, Calendar, Phone } from 'lucide-react';

/** Types matching backend responses */
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
  start_time: string; // ISO
  end_time?: string | null;
  base_price?: number;
  direction?: 'go' | 'return';
  status?: 'scheduled' | 'departed' | 'completed' | 'cancelled';
  driver?: { name?: string; phone?: string; license_number?: string } | null;
  assistant?: { name?: string; phone?: string } | null;
};

type SeatDoc = {
  _id: string;
  trip: string;
  seat_number: string;
  status: 'available' | 'reserved' | 'booked' | 'checked_in';
  booking_id?: string | null;
};

type RouteStopDoc = {
  _id: string;
  route: string;
  stop_name: string;
  order: number;
  type: 'pickup' | 'dropoff' | 'both';
};

type TripDetailResponse = {
  trip: TripDoc;
  seats: SeatDoc[];
  stops?: RouteStopDoc[];
  driver?: { name?: string; phone?: string; license_number?: string } | null;
  assistant?: { name?: string; phone?: string } | null;
};

const API_BASE = ((import.meta as any)?.env?.VITE_BACKEND_URL as string) || '';

// Function to compare seats arrays
const seatsEqual = (a?: SeatDoc[], b?: SeatDoc[]) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((seat, i) => 
    seat.seat_number === b[i].seat_number && 
    seat.status === b[i].status
  );
};

const BookingDetail: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();

  // --- STATE ---
  const [allTrips, setAllTrips] = useState<TripDoc[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [errTrips, setErrTrips] = useState<string | null>(null);

  const [selectedTrip, setSelectedTrip] = useState<TripDoc | null>(null);
  const [tripDetail, setTripDetail] = useState<TripDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errDetail, setErrDetail] = useState<string | null>(null);

  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [passengerInfo, setPassengerInfo] = useState({ name: '', phone: '', email: '', note: '' });
  const [phoneError, setPhoneError] = useState<string | null>(null);
  
  // State chọn điểm đón trả
  const [selectedPickupId, setSelectedPickupId] = useState<string | null>(null);
  const [selectedDropoffId, setSelectedDropoffId] = useState<string | null>(null);

  // --- STATE MỚI: QUẢN LÝ TẦNG (Cho xe giường nằm) ---
  const [activeFloor, setActiveFloor] = useState<1 | 2>(1);

  const { user } = useAuth();

  useEffect(() => {
    if (user && user.email && !passengerInfo.email) {
      setPassengerInfo(prev => ({ ...prev, email: user.email }));
    }
  }, [user]);

  const isValidPhone = (phone: string) => {
    if (!phone) return false;
    const p = phone.trim();
    const re = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;
    return re.test(p);
  };

  // Reset selections when trip changes
  useEffect(() => {
    setSelectedPickupId(null);
    setSelectedDropoffId(null);
    setSelectedSeats([]);
    setActiveFloor(1); // Reset về tầng 1
  }, [selectedTrip?._id]);

  // Validate stops
  useEffect(() => {
    if (!tripDetail?.stops) return;
    const hasPickup = selectedPickupId ? tripDetail.stops.some(s => s._id === selectedPickupId) : true;
    const hasDropoff = selectedDropoffId ? tripDetail.stops.some(s => s._id === selectedDropoffId) : true;
    if (!hasPickup) setSelectedPickupId(null);
    if (!hasDropoff) setSelectedDropoffId(null);
    if (selectedPickupId && selectedDropoffId) {
      const pu = tripDetail.stops.find(s => s._id === selectedPickupId);
      const dr = tripDetail.stops.find(s => s._id === selectedDropoffId);
      if (pu && dr && pu.order >= dr.order) {
        setSelectedDropoffId(null);
      }
    }
  }, [tripDetail?.stops, selectedPickupId, selectedDropoffId]);

  // Fetch Trips
  useEffect(() => {
    let mounted = true;
    const fetchTrips = async () => {
      try {
        setLoadingTrips(true);
        setErrTrips(null);
        const url = API_BASE ? `${API_BASE}/api/trips` : '/api/trips';
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: TripDoc[] = await res.json();
        
        if (!mounted) return;
        const now = new Date();
        const filtered = data
            .filter(t => {
              if (!t?.route) return false;
              const routeIdValue = typeof t.route === 'object' && t.route !== null 
                  ? String(t.route._id || t.route) 
                  : String(t.route);
              const isCorrectRoute = routeIdValue === routeId;
              const isActive = t.status !== 'cancelled';
              const tripStartTime = new Date(t.start_time);
              const isFutureTrip = tripStartTime > now;
              return isCorrectRoute && isActive && isFutureTrip;
            })
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

        setAllTrips(prev => {
          if (prev.length === filtered.length && prev.every((trip, i) => trip._id === filtered[i]._id)) {
            return prev;
          }
          return filtered;
        });

        setSelectedTrip(prev => {
          if (prev && filtered.find(f => f._id === prev._id)) return prev;
          if (!prev && filtered.length > 0) return filtered[0];
          return prev;
        });
      } catch (e: any) {
        if (!mounted) return;
        setErrTrips(e?.message || 'Lỗi tải danh sách chuyến');
      } finally {
        if (mounted) setLoadingTrips(false);
      }
    };
    fetchTrips();
    return () => { mounted = false; };
  }, [routeId]);

  // Fetch Trip Details
  useEffect(() => {
    if (!selectedTrip?._id) {
      setTripDetail(null);
      return;
    }
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const fetchTripDetails = async () => {
      if (!mounted) return;
      try {
        if (!tripDetail) setLoadingDetail(true);
        setErrDetail(null);
        const res = await fetch(API_BASE ? `${API_BASE}/api/trips/${selectedTrip._id}` : `/api/trips/${selectedTrip._id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: TripDetailResponse = await res.json();

        if (!mounted) return;

        const unavailableSelected = selectedSeats.some(sn => {
          const seat = data.seats.find(s => s.seat_number === String(sn));
          return !seat || seat.status !== 'available';
        });

        if (unavailableSelected) {
          setSelectedSeats(prev => prev.filter(sn => {
              const seat = data.seats.find(s => s.seat_number === String(sn));
              return seat && seat.status === 'available';
            })
          );
        }

        if (!tripDetail || !seatsEqual(tripDetail.seats, data.seats)) {
          setTripDetail(data);
        }
      } catch (e: any) {
        if (!mounted) return;
        setErrDetail(e?.message || 'Lỗi tải chi tiết chuyến');
      } finally {
        if (mounted) {
          setLoadingDetail(false);
          timeoutId = setTimeout(fetchTripDetails, 5000);
        }
      }
    };
    fetchTripDetails();
    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [selectedTrip?._id]);

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

  const availableSeatsCount = useMemo(() => {
    return (tripDetail?.seats || []).filter(s => s.status === 'available').length;
  }, [tripDetail?.seats]);

  const selectedAvailableCount = useMemo(() => {
    const availableSeats = tripDetail?.seats?.filter(s => s.status === 'available') || [];
    return selectedSeats.filter(sn => availableSeats.some(s => s.seat_number === String(sn))).length;
  }, [tripDetail?.seats, selectedSeats]);

  const handleSeatSelect = (seatNumber: number) => {
    const status = tripDetail?.seats?.find(s => s.seat_number === String(seatNumber))?.status;
    if (status && status !== 'available') return;
    setSelectedSeats(prev => prev.includes(seatNumber) ? prev.filter(s => s !== seatNumber) : [...prev, seatNumber]);
  };

  const handleSeatClick = (seatNumber: number, status: SeatDoc['status']) => {
    if (status !== 'available') return;
    handleSeatSelect(seatNumber);
  };

  const handleBooking = () => {
    if (!tripDetail?.trip?._id) { alert('Chưa chọn chuyến.'); return; }
    if (selectedSeats.length === 0) { alert('Vui lòng chọn ít nhất một ghế'); return; }
    if (!passengerInfo.name || !passengerInfo.phone) { alert('Vui lòng điền đầy đủ thông tin hành khách'); return; }
    if (!isValidPhone(passengerInfo.phone)) { setPhoneError('Số điện thoại không hợp lệ. Vui lòng nhập số bắt đầu bằng 0 hoặc +84.'); return; }
    
    navigate('/payment', { state: {
      tripId: tripDetail.trip._id,
      seats: selectedSeats,
      passenger: passengerInfo,
      route: { from: tripDetail.trip.route?.from_city || '', to: tripDetail.trip.route?.to_city || '', durationMin: tripDetail.trip.route?.estimated_duration_min || null },
      bus: { busType: tripDetail.trip.bus?.bus_type || '', licensePlate: tripDetail.trip.bus?.license_plate || '', seatCount: tripDetail.trip.bus?.seat_count || 0 },
      driver: tripDetail.driver || null,
      assistant: tripDetail.assistant || null,
      times: { departureTime: tripDetail.trip.start_time, arrivalTime: computedArrivalIso || tripDetail.trip.end_time || null },
      pricePerSeat: computedPricePerSeat
    } });
  };

  const computedPricePerSeat = React.useMemo(() => {
    const base = tripDetail?.trip?.base_price || selectedTrip?.base_price || 0;
    if (!tripDetail?.stops || !selectedPickupId || !selectedDropoffId) return base;
    const pickup = tripDetail.stops.find(s => s._id === selectedPickupId);
    const dropoff = tripDetail.stops.find(s => s._id === selectedDropoffId);
    if (!pickup || !dropoff) return base;
    const orders = tripDetail.stops.map(s => (typeof s.order === 'number' ? s.order : 0));
    const minOrder = Math.min(...orders);
    const maxOrder = Math.max(...orders);
    const totalSegments = (maxOrder - minOrder) || 1;
    const segmentsBetween = Math.max(0, dropoff.order - pickup.order);
    const fraction = Math.min(1, segmentsBetween / totalSegments);
    let price = Math.round(base * fraction);
    if (price <= 0) price = Math.max(1, Math.floor(base * 0.2));
    return price;
  }, [tripDetail?.stops, tripDetail?.trip?.base_price, selectedPickupId, selectedDropoffId, selectedTrip?.base_price]);

  const computedArrivalIso = React.useMemo(() => {
    if (!selectedTrip) return null;
    if (selectedDropoffId && tripDetail?.stops && tripDetail.stops.length > 0) {
      const stops = tripDetail.stops;
      const minOrder = Math.min(...stops.map(s => s.order));
      const maxOrder = Math.max(...stops.map(s => s.order));
      const totalSegments = (maxOrder - minOrder) || 1;
      const dropoff = stops.find(s => s._id === selectedDropoffId);
      const estMin = (selectedTrip.route && (selectedTrip.route as any).estimated_duration_min) || (tripDetail?.trip?.route && (tripDetail.trip.route as any).estimated_duration_min) || 0;
      if (dropoff && typeof dropoff.order === 'number' && estMin) {
        const segmentsBetween = Math.max(0, dropoff.order - minOrder);
        const frac = Math.min(1, segmentsBetween / totalSegments);
        const mins = Math.round(estMin * frac);
        const d = new Date(selectedTrip.start_time);
        d.setMinutes(d.getMinutes() + mins);
        return d.toISOString();
      }
    }
    return selectedTrip.end_time || null;
  }, [selectedTrip, tripDetail?.stops, selectedDropoffId]);

  const computedTotalAmount = React.useMemo(() => {
    return (computedPricePerSeat || 0) * (selectedSeats.length || 0);
  }, [computedPricePerSeat, selectedSeats.length]);

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
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white w-full max-w-xl"
                value={selectedTrip?._id || ''}
                onChange={(e) => {
                  const t = allTrips.find(x => x._id === e.target.value) || null;
                  setSelectedTrip(t);
                }}
              >
                {allTrips.map(t => {
                  const d = new Date(t.start_time);
                  const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                  const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                  const dEnd = t.end_time ? new Date(t.end_time) : null;
                  const timeEndStr = dEnd ? dEnd.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '...';
                      return (
                        <option key={t._id} value={t._id}>
                          {dateStr} | {timeStr} - {timeEndStr} | {t.route?.from_city || '-'} → {t.route?.to_city || '-'}{t.driver?.name ? ` • Tài xế: ${t.driver.name}` : ''}
                        </option>
                      );
                })}
              </select>
            </div>
          )}
        </div>

        {selectedTrip && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Chi tiết tuyến đường</h2>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <MapPin className="h-6 w-6 text-blue-600 mr-3" />
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{selectedTrip.route?.from_city || '-'}</p>
                      <p className="text-sm text-gray-600">Điểm đi</p>
                    </div>
                  </div>
                  <div className="flex-1 mx-6">
                    <div className="border-t-2 border-dashed border-gray-300"></div>
                    <div className="text-center mt-2">
                      <Clock className="h-4 w-4 inline mr-1" />
                      <span className="text-sm text-gray-600">{fmtDuration(selectedTrip.route?.estimated_duration_min)}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-6 w-6 text-green-600 mr-3" />
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{selectedTrip.route?.to_city || '-'}</p>
                      <p className="text-sm text-gray-600">Điểm đến</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Giờ khởi hành</p>
                    <p className="text-gray-600">{fmtTime(selectedTrip.start_time)}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Calendar className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Giờ dự kiến đến</p>
                    <p className="text-gray-600">{fmtTime(computedArrivalIso || undefined)}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="h-6 w-8 mx-auto mb-2 flex items-center justify-center bg-blue-600 text-white rounded text-xs font-bold">BS</div>
                    <p className="font-semibold text-gray-900">Biển số</p>
                    <p className="text-blue-700 font-bold text-lg">{selectedTrip.bus?.license_plate || '---'}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Bus className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Loại xe</p>
                    <p className="text-gray-600">{selectedTrip.bus?.bus_type || '-'}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Users className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Số ghế</p>
                    <p className="text-gray-600">{loadingDetail ? '…' : `${availableSeatsCount - selectedAvailableCount} ghế trống`}</p>
                  </div>
                </div>

                {/* Driver & Assistant info */}
                {(tripDetail?.driver || tripDetail?.assistant) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {tripDetail?.driver && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">T</div>
                          <div>
                            <p className="text-sm text-gray-600">Tài xế</p>
                            <p className="font-medium text-gray-900">{tripDetail.driver.name || '—'}</p>
                            <p className="text-sm text-gray-600 flex items-center gap-2"><Phone className="h-4 w-4" />{tripDetail.driver.phone || '—'}{tripDetail.driver.license_number ? ` • ${tripDetail.driver.license_number}` : ''}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {tripDetail?.assistant && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">L</div>
                          <div>
                            <p className="text-sm text-gray-600">Phụ xe</p>
                            <p className="font-medium text-gray-900">{tripDetail.assistant.name || '—'}</p>
                            <p className="text-sm text-gray-600 flex items-center gap-2"><Phone className="h-4 w-4" />{tripDetail.assistant.phone || '—'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tripDetail?.stops && tripDetail.stops.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <MapPin className="h-5 w-5 text-blue-600 mr-2" />
                      Các điểm dừng trên tuyến
                    </h3>
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-blue-200"></div>
                      <div className="space-y-4 relative">
                        {tripDetail.stops.map((stop, index) => {
                          const isFirst = index === 0;
                          const isLast = index === tripDetail!.stops!.length - 1;
                          const getTypeColor = () => {
                            if (stop.type === 'pickup') return 'bg-green-100 text-green-700 border-green-300';
                            if (stop.type === 'dropoff') return 'bg-red-100 text-red-700 border-red-300';
                            return 'bg-blue-100 text-blue-700 border-blue-300';
                          };
                          const getTypeLabel = () => {
                            if (stop.type === 'pickup') return 'Điểm đón';
                            if (stop.type === 'dropoff') return 'Điểm trả';
                            return 'Điểm đón/trả';
                          };
                          const isSelectedPickup = selectedPickupId === stop._id;
                          const isSelectedDropoff = selectedDropoffId === stop._id;

                          const handleStopClick = () => {
                            if (isSelectedPickup) { setSelectedPickupId(null); return; }
                            if (isSelectedDropoff) { setSelectedDropoffId(null); return; }
                            if (!selectedPickupId) {
                              if (stop.type === 'dropoff') {
                                alert('Không thể chọn điểm trả làm điểm đón. Vui lòng chọn điểm đón hợp lệ.');
                                return;
                              }
                              setSelectedPickupId(stop._id);
                              return;
                            }
                            if (selectedPickupId && !selectedDropoffId) {
                              const pickup = tripDetail!.stops!.find(s => s._id === selectedPickupId);
                              if (pickup && stop.order <= pickup.order) {
                                alert('Vui lòng chọn điểm trả nằm sau điểm đón.');
                                return;
                              }
                              if (stop.type === 'pickup') {
                                alert('Vui lòng chọn điểm trả hợp lệ.');
                                return;
                              }
                              setSelectedDropoffId(stop._id);
                              return;
                            }
                            setSelectedPickupId(stop._id);
                            setSelectedDropoffId(null);
                          };

                          return (
                            <div key={stop._id} className="relative flex items-start pl-10">
                              <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm border-2 ${isFirst ? 'bg-blue-600 text-white border-blue-600' : isLast ? 'bg-green-600 text-white border-green-600' : 'bg-white text-blue-600 border-blue-400'}`}>
                                {stop.order}
                              </div>
                              <div
                                onClick={handleStopClick}
                                role="button"
                                tabIndex={0}
                                className={['flex-1 rounded-lg p-3 border transition-colors cursor-pointer', isSelectedPickup ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-200', isSelectedDropoff ? 'bg-indigo-50 border-indigo-400' : ''].join(' ')}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleStopClick(); }}
                              >
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-gray-900">{stop.stop_name}</p>
                                  <div className="ml-4 text-right">
                                    <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium border ${getTypeColor()}`}>
                                      {getTypeLabel()}
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  {isSelectedPickup && <span className="text-xs font-semibold text-blue-700">Bạn chọn điểm đón</span>}
                                  {isSelectedDropoff && <span className="text-xs font-semibold text-indigo-700">Bạn chọn điểm trả</span>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* --- SƠ ĐỒ GHẾ (TO & RỘNG & MÀU CHUẨN) --- */}
              <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Sơ đồ xe</h3>
                  
                  {/* Chú thích nhanh trạng thái */}
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center"><div className="w-3 h-3 bg-white border border-gray-400 rounded-sm mr-1"></div> Trống</div>
                    <div className="flex items-center"><div className="w-3 h-3 bg-blue-600 rounded-sm mr-1"></div> Đang chọn</div>
                    <div className="flex items-center"><div className="w-3 h-3 bg-red-500 rounded-sm mr-1"></div> Đã bán</div>
                  </div>
                </div>

                {loadingDetail ? (
                  <div className="text-gray-500 py-12 text-center">Đang tải sơ đồ ghế...</div>
                ) : errDetail ? (
                  <div className="text-red-600 py-12 text-center">Lỗi: {errDetail}</div>
                ) : (
                  <>
                    {(() => {
                      // Logic phân loại xe
                      const busType = tripDetail?.trip?.bus?.bus_type || '';
                      const isSleeper = busType.toLowerCase().includes('giường') || busType.toLowerCase().includes('sleeper') || busType.toLowerCase().includes('vip');

                      // Sort ghế
                      const allSeats = (tripDetail?.seats || []).sort((a, b) => parseInt(a.seat_number) - parseInt(b.seat_number));
                      const totalSeats = allSeats.length;

                      // Phân tầng cho xe giường nằm
                      const seatsPerFloor = isSleeper ? Math.ceil(totalSeats / 2) : totalSeats;
                      
                      // Lọc ghế hiển thị
                      const seatsToRender = isSleeper
                        ? allSeats.filter(s => {
                            const num = parseInt(s.seat_number);
                            return activeFloor === 1 ? num <= seatsPerFloor : num > seatsPerFloor;
                          })
                        : allSeats;

                      return (
                        <div className="flex flex-col items-center w-full">
                          
                          {/* KHUNG BAO NGOÀI MÔ PHỎNG SÀN XE */}
                          <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 w-full max-w-2xl mx-auto shadow-inner relative">
                            
                            {/* ĐẦU XE (VÔ LĂNG) */}
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gray-200 text-gray-500 px-4 py-1 rounded-b-lg text-xs font-bold uppercase tracking-widest shadow-sm z-10 flex items-center">
                              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Đầu xe
                            </div>

                            {/* Nút chuyển tầng (Chỉ hiện cho xe giường nằm) - Đặt rộng ra */}
                            {isSleeper && (
                              <div className="flex justify-center mb-8 mt-4">
                                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200 w-full max-w-sm">
                                  <button
                                    onClick={() => setActiveFloor(1)}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
                                      activeFloor === 1 ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                                    }`}
                                  >
                                    Tầng 1 (Dưới)
                                  </button>
                                  <button
                                    onClick={() => setActiveFloor(2)}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${
                                      activeFloor === 2 ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                                    }`}
                                  >
                                    Tầng 2 (Trên)
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* LƯỚI GHẾ */}
                            <div
                              className={`grid gap-y-8 mt-8 px-2 ${
                                isSleeper
                                  ? (totalSeats <= 34 || busType.toLowerCase().includes('vip') || busType.toLowerCase().includes('cabin'))
                                    ? 'grid-cols-2 gap-x-24' // Xe VIP/Cabin: 2 dãy, lối đi giữa rất rộng
                                    : 'grid-cols-3 gap-x-12' // Xe Thường (40 chỗ): 3 dãy
                                  : 'grid-cols-5 gap-x-4'    // Xe Ghế ngồi: 5 cột
                              }`}
                            >
                              {seatsToRender.map((seat) => {
                                const seatNumber = parseInt(seat.seat_number, 10);
                                const status = seat.status || 'available';
                                const isSelected = selectedSeats.includes(seatNumber);

                                // Logic tạo lối đi cho xe ghế ngồi
                                let extraClasses = '';
                                if (!isSleeper) {
                                    const isLastRow = seatNumber > (totalSeats - 5);
                                    const isRightSideStart = !isLastRow && (seatNumber % 4 === 3);
                                    if (isRightSideStart) extraClasses = 'col-start-4'; // Đẩy sang cột 4
                                }

                                return (
                                  <div key={seatNumber} className={`relative flex justify-center ${extraClasses}`}>
                                    <button
                                      onClick={() => handleSeatClick(seatNumber, status)}
                                      disabled={status !== 'available'}
                                      className={[
                                        'relative flex items-center justify-center font-bold text-sm transition-all duration-200 shadow-md group',
                                        // Style khác nhau: TO HƠN NHIỀU
                                        isSleeper
                                          ? 'h-28 w-16 rounded-xl border-2' // Giường: Rất to
                                          : 'h-16 w-12 rounded-t-2xl rounded-b-lg border-b-4', // Ghế: To vừa
                                        
                                        // Màu sắc (CẬP NHẬT MÀU ĐỎ CHO ĐÃ BÁN)
                                        status !== 'available'
                                          ? 'bg-red-500 text-white border-red-600 cursor-not-allowed opacity-90' // Đã bán -> MÀU ĐỎ
                                          : isSelected
                                            ? 'bg-blue-600 text-white border-blue-800 transform translate-y-1 border-b-0 ring-2 ring-blue-300' // Đang chọn -> XANH
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500 hover:shadow-lg hover:-translate-y-1' // Trống -> TRẮNG
                                      ].join(' ')}
                                      title={status !== 'available' ? `Ghế ${seatNumber} đã bán` : `Ghế ${seatNumber}`}
                                    >
                                      {/* Họa tiết trang trí */}
                                      {isSleeper ? (
                                        <>
                                          {/* Gối */}
                                          <div className={`absolute top-2 w-10 h-3 rounded-md ${isSelected?'bg-white/30':'bg-gray-200 group-hover:bg-blue-100'} ${status!=='available'?'bg-white/20':''}`}></div>
                                          {/* Chăn */}
                                          <div className={`absolute bottom-2 w-10 h-10 rounded-sm opacity-10 ${isSelected?'bg-white':'bg-black'} ${status!=='available'?'bg-white opacity-20':''}`}></div>
                                          {/* Icon người nằm (cho sinh động) */}
                                          {status !== 'available' && (
                                            <div className="absolute top-8 opacity-40 text-white">
                                              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M7 19a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h1v-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-10z"/></svg>
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        // Đầu ghế
                                        <div className={`absolute top-1 w-8 h-1 rounded-full opacity-20 ${isSelected?'bg-white':'bg-black'} ${status!=='available'?'bg-white':''}`}></div>
                                      )}
                                      
                                      <span className="z-10 text-lg">{seatNumber}</span>
                                      
                                      {/* Icon check khi chọn */}
                                      {isSelected && (
                                        <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-0.5 shadow-sm">
                                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                          </svg>
                                        </div>
                                      )}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Cuối xe */}
                            <div className="mt-8 text-center text-gray-400 text-xs uppercase tracking-widest border-t border-gray-200 pt-2">
                              Cuối xe
                            </div>
                          </div>

                          {/* Chú thích màu sắc chi tiết hơn (ĐÃ CẬP NHẬT MÀU) */}
                          <div className="mt-8 grid grid-cols-3 gap-4 w-full max-w-lg">
                             <div className="flex items-center justify-center p-3 bg-white border rounded-lg shadow-sm">
                               <div className={`w-6 h-6 bg-white border border-gray-300 mr-3 ${isSleeper?'rounded-md':'rounded-t-lg border-b-4'}`}></div> 
                               <span className="font-medium text-gray-700">Trống</span>
                             </div>
                             <div className="flex items-center justify-center p-3 bg-blue-50 border border-blue-100 rounded-lg shadow-sm">
                               <div className={`w-6 h-6 bg-blue-600 mr-3 ${isSleeper?'rounded-md':'rounded-t-lg'}`}></div> 
                               <span className="font-medium text-blue-700">Đang chọn</span>
                             </div>
                             <div className="flex items-center justify-center p-3 bg-red-50 border border-red-100 rounded-lg shadow-sm">
                               <div className={`w-6 h-6 bg-red-500 border-red-600 mr-3 ${isSleeper?'rounded-md':'rounded-t-lg border-b-4'}`}></div> 
                               <span className="font-medium text-red-600">Đã bán</span>
                             </div>
                          </div>
                        </div>
                      );
                    })()}
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
                      onChange={(e) => { setPassengerInfo({ ...passengerInfo, phone: e.target.value }); if (phoneError) setPhoneError(null); }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập số điện thoại"
                    />
                    {phoneError && <p className="text-sm text-red-600 mt-1">{phoneError}</p>}
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
                    <span className="font-medium">{(selectedTrip.route?.from_city || '-') + ' - ' + (selectedTrip.route?.to_city || '-')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Số ghế:</span>
                    <span className="font-medium">{selectedSeats.length} ghế</span>
                  </div>
                  {tripDetail?.driver && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tài xế:</span>
                      <span className="font-medium">{tripDetail.driver.name}{tripDetail.driver.phone ? ` • ${tripDetail.driver.phone}` : ''}</span>
                    </div>
                  )}
                  {tripDetail?.assistant && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phụ xe:</span>
                      <span className="font-medium">{tripDetail.assistant.name}{tripDetail.assistant.phone ? ` • ${tripDetail.assistant.phone}` : ''}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Giá/ghế:</span>
                    <span className="font-medium">{(computedPricePerSeat || 0).toLocaleString()}₫</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Tổng cộng:</span>
                      <span className="text-blue-600">{(computedTotalAmount || 0).toLocaleString()}₫</span>
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
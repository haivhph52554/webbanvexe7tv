// src/components/BookingDetail.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bus, MapPin, Clock, Users, Calendar } from 'lucide-react';

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

const API_BASE = ((import.meta as any)?.env?.VITE_BACKEND_URL as string) || 'http://localhost:5000';

const BookingDetail: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();

  const [allTrips, setAllTrips] = useState<TripDoc[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [errTrips, setErrTrips] = useState<string | null>(null);

  const [selectedTrip, setSelectedTrip] = useState<TripDoc | null>(null);

  const [tripDetail, setTripDetail] = useState<TripDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errDetail, setErrDetail] = useState<string | null>(null);
  // cache seats per trip to show summaries for multiple trips
  const [tripSeatsMap, setTripSeatsMap] = useState<Record<string, SeatDoc[]>>({});

  useEffect(() => {
    let mounted = true;
    const fetchTrips = async () => {
      try {
        setLoadingTrips(true);
        setErrTrips(null);
        const res = await fetch(`${API_BASE}/api/trips`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: TripDoc[] = await res.json();
        if (!mounted) return;
        
        // Filter and sort trips
        const filtered = data
          .filter(t => {
            // `t.route` may be populated (object with _id) or just an ObjectId/string.
            const tid = t?.route && (t.route._id ? String(t.route._id) : String(t.route));
            return tid === routeId;
          })
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

        // Only update state if data has actually changed
        setAllTrips(prev => {
          if (prev.length === filtered.length && 
              prev.every((trip, i) => trip._id === filtered[i]._id)) {
            return prev;
          }
          return filtered;
        });

        // Only update selectedTrip if necessary
        setSelectedTrip(prev => {
          if (prev && filtered.find(f => f._id === prev._id)) return prev;
          if (!prev && filtered.length > 0) return filtered[0];
          return prev;
        });

        // Fetch seats summary for these trips (non-blocking)
        (async () => {
          try {
            const map: Record<string, SeatDoc[]> = {};
            await Promise.all(filtered.map(async (t) => {
              try {
                const r = await fetch(`${API_BASE}/api/trips/${t._id}`);
                if (!r.ok) return;
                const d: TripDetailResponse = await r.json();
                map[t._id] = d.seats;
              } catch (e) {
                // ignore individual failures
              }
            }));
            if (mounted) setTripSeatsMap(map);
          } catch (e) {
            // ignore
          }
        })();
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

  // when selectedTrip changes, ensure its seats are in cache (used by seat detail view)
  useEffect(() => {
    if (!selectedTrip || !selectedTrip._id) return;
    if (tripSeatsMap[selectedTrip._id]) return;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/trips/${selectedTrip._id}`);
        if (!r.ok) return;
        const d: TripDetailResponse = await r.json();
        setTripSeatsMap(prev => ({ ...prev, [selectedTrip._id]: d.seats }));
        setTripDetail(d);
      } catch (e) {
        // ignore
      }
    })();
  }, [selectedTrip?._id]);

  // Poll trip details (seats) for the selected trip so UI reflects changes made by admin
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

  // Effect for handling trip details and polling
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

        const res = await fetch(`${API_BASE}/api/trips/${selectedTrip._id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: TripDetailResponse = await res.json();

        if (!mounted) return;

        // Check if any selected seats are no longer available
        const unavailableSelected = selectedSeats.some(sn => {
          const seat = data.seats.find(s => s.seat_number === String(sn));
          return !seat || seat.status !== 'available';
        });

        // Only update states if there are actual changes
        if (unavailableSelected) {
          setSelectedSeats(prev => 
            prev.filter(sn => {
              const seat = data.seats.find(s => s.seat_number === String(sn));
              return seat && seat.status === 'available';
            })
          );
        }

        // Only update trip detail if seats have changed
        if (!tripDetail || !seatsEqual(tripDetail.seats, data.seats)) {
          setTripDetail(data);
        }
      } catch (e: any) {
        if (!mounted) return;
        setErrDetail(e?.message || 'Lỗi tải chi tiết chuyến');
      } finally {
        if (mounted) {
          setLoadingDetail(false);
          // Schedule next poll
          timeoutId = setTimeout(fetchTripDetails, 5000); // Increased poll interval to 5s
        }
      }
    };

    fetchTripDetails();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      // release any locally reserved seats if user leaves without booking
      if (reservedLocal.length && selectedTrip?._id) {
        fetch(`${API_BASE}/api/trips/${selectedTrip._id}/release`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seatNumbers: reservedLocal })
        }).catch(() => {});
      }
    };
  }, [selectedTrip?._id, seatsEqual]);

  // Debug: detect mounts/unmounts and page unloads to help diagnose unexpected reloads
  useEffect(() => {
    console.info('[BookingDetail] mounted');
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      console.warn('[BookingDetail] beforeunload', e);
    };
    const onVisibility = () => {
      console.info('[BookingDetail] visibilitychange', document.visibilityState);
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      console.info('[BookingDetail] unmounted');
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

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

  // Local UI state for selected seats and reservations
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [reservedLocal, setReservedLocal] = useState<string[]>([]);
  const [reserveLoading, setReserveLoading] = useState<Record<number, boolean>>({});

  // Đếm số ghế trống thực tế (không trừ ghế đã chọn)
  const availableSeatsCount = useMemo(() => {
    return (tripDetail?.seats || []).filter(s => s.status === 'available').length;
  }, [tripDetail?.seats]);

  // Số ghế đang được giữ (reserved)
  const reservedSeatsCount = useMemo(() => {
    return (tripDetail?.seats || []).filter(s => s.status === 'reserved').length;
  }, [tripDetail?.seats]);

  // Số ghế đã được đặt (booked / checked_in)
  const bookedSeatsCount = useMemo(() => {
    return (tripDetail?.seats || []).filter(s => s.status === 'booked' || s.status === 'checked_in').length;
  }, [tripDetail?.seats]);

  // Số ghế đã chọn (chỉ tính những ghế available)
  const selectedAvailableCount = useMemo(() => {
    const availableSeats = tripDetail?.seats?.filter(s => s.status === 'available') || [];
    return selectedSeats.filter(sn => availableSeats.some(s => s.seat_number === String(sn))).length;
  }, [tripDetail?.seats, selectedSeats]);

  // Compatibility wrapper used by some seat button handlers in the file
  const handleSeatClick = (seatNumber: number, _status: SeatDoc['status']) => {
    // delegate to existing handler
    // prefer handleSeatSelect which contains reservation/release logic
    try {
      // handleSeatSelect declared later in file; it's safe to call here because handlers run after mount
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (handleSeatSelect as any)(seatNumber);
    } catch (e) {
      // fallback: simple toggle
      if (selectedSeats.includes(seatNumber)) {
        releaseSeatOnServer(seatNumber);
      } else {
        reserveSeatOnServer(seatNumber);
      }
    }
  };

  const reserveSeatOnServer = async (seatNumber: number) => {
    try {
      setReserveLoading(l => ({ ...l, [seatNumber]: true }));
      const res = await fetch(`${API_BASE}/api/trips/${selectedTrip?._id}/reserve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatNumbers: [String(seatNumber)], ttlMinutes: 5 })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      const ok = (data.results && data.results[0] && data.results[0].ok);
      if (!ok) throw new Error(data.results[0].reason || 'Không thể giữ ghế');
      setReservedLocal(prev => [...prev, String(seatNumber)]);
      setSelectedSeats(prev => prev.includes(seatNumber) ? prev : [...prev, seatNumber]);
      return true;
    } catch (e: any) {
      alert(e?.message || 'Không thể giữ ghế');
      return false;
    } finally {
      setReserveLoading(l => ({ ...l, [seatNumber]: false }));
    }
  };

  const releaseSeatOnServer = async (seatNumber: number) => {
    try {
      setReserveLoading(l => ({ ...l, [seatNumber]: true }));
      const res = await fetch(`${API_BASE}/api/trips/${selectedTrip?._id}/release`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatNumbers: [String(seatNumber)] })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || `HTTP ${res.status}`);
      }
      setReservedLocal(prev => prev.filter(s => s !== String(seatNumber)));
      setSelectedSeats(prev => prev.filter(s => s !== seatNumber));
      return true;
    } catch (e: any) {
      console.warn('Release failed', e?.message || e);
      return false;
    } finally {
      setReserveLoading(l => ({ ...l, [seatNumber]: false }));
    }
  };

  const handleSeatSelect = (seatNumber: number) => {
    const status = tripDetail?.seats?.find(s => s.seat_number === String(seatNumber))?.status;
    if (status && status !== 'available') return;
    // if already selected -> release; else reserve
    if (selectedSeats.includes(seatNumber)) {
      // release
      releaseSeatOnServer(seatNumber);
    } else {
      // reserve
      reserveSeatOnServer(seatNumber);
    }
  };

  const [passengerInfo, setPassengerInfo] = useState<{ name: string; phone: string; email?: string; note?: string }>({
    name: '',
    phone: '',
    email: '',
    note: ''
  });

  const handleBooking = () => {
    if (!tripDetail?.trip?._id) { alert('Chưa chọn chuyến.'); return; }
    if (selectedSeats.length === 0) { alert('Vui lòng chọn ít nhất một ghế'); return; }
    if (!passengerInfo.name || !passengerInfo.phone) { alert('Vui lòng điền đầy đủ thông tin hành khách'); return; }
    navigate('/payment', { state: {
      tripId: tripDetail.trip._id,
      seats: selectedSeats,
      passenger: passengerInfo,
      route: { from: tripDetail.trip.route?.from_city || '', to: tripDetail.trip.route?.to_city || '', durationMin: tripDetail.trip.route?.estimated_duration_min || null },
      bus: { busType: tripDetail.trip.bus?.bus_type || '', licensePlate: tripDetail.trip.bus?.license_plate || '', seatCount: tripDetail.trip.bus?.seat_count || 0 },
      times: { departureTime: tripDetail.trip.start_time, arrivalTime: tripDetail.trip.end_time || null },
      pricePerSeat: tripDetail.trip.base_price || 0
    } });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-0">Chi tiết đặt chỗ</h1>
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center text-sm text-blue-500 hover:text-blue-700"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Quay lại
        </button>
      </div>

      {loadingTrips ? (
        <p className="text-center py-4">Đang tải danh sách chuyến...</p>
      ) : errTrips ? (
        <p className="text-center py-4 text-red-500">{errTrips}</p>
      ) : (
        <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-4">
          <h2 className="text-xl font-semibold mb-4">Chọn chuyến đi</h2>
          {allTrips.length === 0 ? (
            <p className="text-center py-4">Không tìm thấy chuyến đi nào phù hợp.</p>
          ) : (
            <div>
              {allTrips.map(trip => (
                <div 
                  key={trip._id} 
                  className={`flex items-center justify-between p-4 rounded-lg mb-2 cursor-pointer 
                    ${selectedTrip?._id === trip._id ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                  onClick={() => setSelectedTrip(trip)}
                >
                  <div>
                    <div className="text-lg font-medium">{trip.route?.name || 'Chuyến đi mới'}</div>
                    <div className="text-sm text-gray-500">
                      {trip.route?.from_city} → {trip.route?.to_city}
                    </div>
                    <div className="text-sm text-gray-500">
                      {fmtTime(trip.start_time)} - {fmtTime(trip.end_time)} · {fmtDuration(trip.route?.estimated_duration_min)} · 
                      {trip.bus?.bus_type && ` ${trip.bus.bus_type}`} 
                      {trip.bus?.license_plate && ` | Biển số: ${trip.bus.license_plate}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      {trip.base_price?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) || '-'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {trip.status === 'scheduled' && 'Đã lên lịch'}
                      {trip.status === 'departed' && 'Đã khởi hành'}
                      {trip.status === 'completed' && 'Đã hoàn thành'}
                      {trip.status === 'cancelled' && 'Đã hủy'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedTrip && (
        <div className="bg-white shadow rounded-lg p-4 sm:p-6">
          <h2 className="text-xl font-semibold mb-4">Chi tiết chuyến đi</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm text-gray-500">Tuyến đường</div>
              <div className="text-lg font-medium">{selectedTrip.route?.name || 'Chuyến đi mới'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Thời gian dự kiến</div>
              <div className="text-lg font-medium">{fmtDuration(selectedTrip.route?.estimated_duration_min)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Ngày giờ khởi hành</div>
              <div className="text-lg font-medium">{fmtTime(selectedTrip.start_time)} ngày {new Date(selectedTrip.start_time).getDate()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Ngày giờ đến nơi</div>
              <div className="text-lg font-medium">
                {selectedTrip.end_time ? fmtTime(selectedTrip.end_time) : 'Chưa xác định'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Loại xe</div>
              <div className="text-lg font-medium">{selectedTrip.bus?.bus_type || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Biển số xe</div>
              <div className="text-lg font-medium">{selectedTrip.bus?.license_plate || '-'}</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-sm text-gray-500 mb-2">Chọn ghế</div>
            <div className="grid grid-cols-4 gap-2">
              {(tripDetail?.seats || []).map(seat => {
                const isSelected = selectedSeats.includes(Number(seat.seat_number));
                const isReserved = reservedLocal.includes(seat.seat_number);
                const isAvailable = seat.status === 'available';
                const isBooked = seat.status === 'booked';

                return (
                  <button
                    key={seat._id}
                    disabled={!isAvailable}
                    onClick={() => handleSeatSelect(Number(seat.seat_number))}
                    className={`flex items-center justify-center h-12 rounded-lg font-semibold 
                      ${isSelected ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700'}
                      ${isReserved && !isSelected ? 'ring-2 ring-blue-500' : ''}
                      ${!isAvailable ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}
                    `}
                  >
                    {isBooked ? 'Đã đặt' : isReserved ? 'Đã giữ' : seat.seat_number}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-4">
            <div className="text-sm text-gray-500 mb-2">Thông tin hành khách</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  value={passengerInfo.name}
                  onChange={e => setPassengerInfo({ ...passengerInfo, name: e.target.value })}
                  placeholder="Họ tên hành khách"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={passengerInfo.phone}
                  onChange={e => setPassengerInfo({ ...passengerInfo, phone: e.target.value })}
                  placeholder="Số điện thoại"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <input
                  type="email"
                  value={passengerInfo.email}
                  onChange={e => setPassengerInfo({ ...passengerInfo, email: e.target.value })}
                  placeholder="Email (không bắt buộc)"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={passengerInfo.note}
                  onChange={e => setPassengerInfo({ ...passengerInfo, note: e.target.value })}
                  placeholder="Ghi chú (ví dụ: yêu cầu ngồi gần cửa)"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Users className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <p className="font-semibold text-gray-900">Ghế trống</p>
              <p className="text-gray-600">{loadingDetail ? '…' : `${availableSeatsCount} ghế`}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Users className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <p className="font-semibold text-gray-900">Đang giữ</p>
              <p className="text-gray-600">{loadingDetail ? '…' : `${reservedSeatsCount} ghế`}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Users className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <p className="font-semibold text-gray-900">Đã đặt</p>
              <p className="text-gray-600">{loadingDetail ? '…' : `${bookedSeatsCount} ghế`}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Users className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-gray-900">Đã chọn</p>
              <p className="text-gray-600">{loadingDetail ? '…' : `${selectedAvailableCount} ghế`}</p>
            </div>
          </div>

          {/* Các chuyến sắp tới (tổng quan) */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Các chuyến sắp tới</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {allTrips.map(t => {
                const seats = tripSeatsMap[t._id] || [];
                const av = seats.filter(s => s.status === 'available').length;
                const resv = seats.filter(s => s.status === 'reserved').length;
                const bk = seats.filter(s => s.status === 'booked' || s.status === 'checked_in').length;
                return (
                  <div key={t._id} className="p-4 border rounded-lg cursor-pointer hover:shadow" onClick={() => setSelectedTrip(t)}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">{fmtTime(t.start_time)}</div>
                      <div className="text-sm text-gray-600">{t.base_price?.toLocaleString() || '-'}₫</div>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">{t.route?.from_city} → {t.route?.to_city}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded">{av} có</span>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">{resv} giữ</span>
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded">{bk} đặt</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mb-4">
            <div className="text-sm text-gray-500 mb-2">Chọn ghế</div>
            <div className="grid grid-cols-4 gap-2">
              {(tripDetail?.seats || []).map((seat) => {
                const seatNumber = parseInt(seat.seat_number, 10);
                const status = seat.status;

                return (
                  <button
                    key={seatNumber}
                    onClick={() => handleSeatClick(seatNumber, status)}
                    disabled={status !== 'available'}
                    className={[
                      'flex items-center justify-center h-12 rounded-lg font-semibold',
                      status === 'available' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' :
                      status === 'reserved' ? 'bg-yellow-100 text-yellow-800' :
                      status === 'booked' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
                    ].join(' ')}
                    title={
                      status === 'available' ? `Ghế ${seatNumber} còn trống` :
                      status === 'reserved' ? `Ghế ${seatNumber} đang được giữ` :
                      status === 'booked' ? `Ghế ${seatNumber} đã được đặt` : `Ghế ${seatNumber}`
                    }
                  >
                    {seatNumber}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded mr-2"></div>
              <span className="text-sm text-gray-600">Ghế trống ({availableSeatsCount})</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-300 rounded mr-2"></div>
              <span className="text-sm text-gray-600">Đang giữ ({reservedSeatsCount})</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded mr-2"></div>
              <span className="text-sm text-gray-600">Đã đặt ({bookedSeatsCount})</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-600 border-2 border-blue-600 rounded mr-2"></div>
              <span className="text-sm text-gray-600">Đã chọn ({selectedAvailableCount})</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-between mt-4">
            <button
              onClick={handleBooking}
              className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-lg shadow-md hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              Tiến hành đặt chỗ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingDetail;

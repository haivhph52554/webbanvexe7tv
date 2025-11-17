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
};

const API_BASE = ((import.meta as any)?.env?.VITE_BACKEND_URL as string) || 'http://localhost:5000';

const BookingDetail: React.FC = () => {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();

  const [searchDate, setSearchDate] = useState(new Date().toISOString().split('T')[0]);
  const [allTrips, setAllTrips] = useState<TripDoc[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [errTrips, setErrTrips] = useState<string | null>(null);

  const [selectedTrip, setSelectedTrip] = useState<TripDoc | null>(null);

  const [tripDetail, setTripDetail] = useState<TripDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [errDetail, setErrDetail] = useState<string | null>(null);

  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [passengerInfo, setPassengerInfo] = useState({ name: '', phone: '', email: '', note: '' });
  const [selectedPickupId, setSelectedPickupId] = useState<string | null>(null);
  const [selectedDropoffId, setSelectedDropoffId] = useState<string | null>(null);

  // Reset selections when user chooses a different trip
  useEffect(() => {
    setSelectedPickupId(null);
    setSelectedDropoffId(null);
    setSelectedSeats([]);
  }, [selectedTrip?._id]);

  // Validate selected stops when tripDetail/stops change
  useEffect(() => {
    if (!tripDetail?.stops) return;
    const hasPickup = selectedPickupId ? tripDetail.stops.some(s => s._id === selectedPickupId) : true;
    const hasDropoff = selectedDropoffId ? tripDetail.stops.some(s => s._id === selectedDropoffId) : true;
    if (!hasPickup) setSelectedPickupId(null);
    if (!hasDropoff) setSelectedDropoffId(null);
    // if both present, ensure order validity
    if (selectedPickupId && selectedDropoffId) {
      const pu = tripDetail.stops.find(s => s._id === selectedPickupId);
      const dr = tripDetail.stops.find(s => s._id === selectedDropoffId);
      if (pu && dr && pu.order >= dr.order) {
        // dropoff invalid after stops changed; clear dropoff
        setSelectedDropoffId(null);
      }
    }
  }, [tripDetail?.stops]);

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

  // Đếm số ghế trống thực tế (không trừ ghế đã chọn)
  const availableSeatsCount = useMemo(() => {
    return (tripDetail?.seats || []).filter(s => s.status === 'available').length;
  }, [tripDetail?.seats]);

  // Số ghế đã chọn (chỉ tính những ghế available)
  const selectedAvailableCount = useMemo(() => {
    const availableSeats = tripDetail?.seats?.filter(s => s.status === 'available') || [];
    return selectedSeats.filter(sn => availableSeats.some(s => s.seat_number === String(sn))).length;
  }, [tripDetail?.seats, selectedSeats]);

  const handleSeatSelect = (seatNumber: number) => {
    const status = tripDetail?.seats?.find(s => s.seat_number === String(seatNumber))?.status;
    if (status && status !== 'available') return;
    setSelectedSeats(prev => prev.includes(seatNumber) ? prev.filter(s => s !== seatNumber) : [...prev, seatNumber]);
  };

  // Component implementation inline since we only use it in one place
  const handleSeatClick = (seatNumber: number, status: SeatDoc['status']) => {
    if (status !== 'available') return;
    handleSeatSelect(seatNumber);
  };

  const handleBooking = () => {
    if (!tripDetail?.trip?._id) { alert('Chưa chọn chuyến.'); return; }
    if (selectedSeats.length === 0) { alert('Vui lòng chọn ít nhất một ghế'); return; }
    if (!selectedPickupId || !selectedDropoffId) { alert('Vui lòng chọn điểm đón và điểm trả'); return; }

    // Ensure pickup is before dropoff by order
    const pickup = tripDetail?.stops?.find(s => s._id === selectedPickupId);
    const dropoff = tripDetail?.stops?.find(s => s._id === selectedDropoffId);
    if (!pickup || !dropoff) { alert('Điểm dừng không hợp lệ'); return; }
    if (pickup.order >= dropoff.order) { alert('Vui lòng chọn điểm đón trước điểm trả'); return; }
    if (!passengerInfo.name || !passengerInfo.phone) { alert('Vui lòng điền đầy đủ thông tin hành khách'); return; }
    navigate('/payment', { state: {
      tripId: tripDetail.trip._id,
      seats: selectedSeats,
      passenger: passengerInfo,
      stops: { pickupId: selectedPickupId, dropoffId: selectedDropoffId, pickupName: pickup.stop_name, dropoffName: dropoff.stop_name },
      route: { from: tripDetail.trip.route?.from_city || '', to: tripDetail.trip.route?.to_city || '', durationMin: tripDetail.trip.route?.estimated_duration_min || null },
      bus: { busType: tripDetail.trip.bus?.bus_type || '', licensePlate: tripDetail.trip.bus?.license_plate || '', seatCount: tripDetail.trip.bus?.seat_count || 0 },
      times: { departureTime: tripDetail.trip.start_time, arrivalTime: tripDetail.trip.end_time || null },
      pricePerSeat: computedPricePerSeat
    } });
  };

  // Compute price per seat based on selected stops (same logic as server-side)
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
                    <p className="font-semibold text-gray-900">Số ghế</p>
                    <p className="text-gray-600">
                      {loadingDetail ? '…' : `${availableSeatsCount - selectedAvailableCount} ghế trống`}
                    </p>
                  </div>
                </div>

                {/* Hiển thị điểm dừng */}
                {tripDetail?.stops && tripDetail.stops.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <MapPin className="h-5 w-5 text-blue-600 mr-2" />
                      Các điểm dừng trên tuyến
                    </h3>
                    <div className="relative">
                      {/* Đường thẳng nối các điểm */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-blue-200"></div>
                      
                      <div className="space-y-4 relative">
                        {(() => {
                          const stops = tripDetail?.stops || [];
                          return stops.map((stop, index) => {
                          const isFirst = index === 0;
                          const isLast = index === stops.length - 1;
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
                                  const pickup = stops.find(s => s._id === selectedPickupId);
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
                              <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm border-2 ${
                                isFirst 
                                  ? 'bg-blue-600 text-white border-blue-600' 
                                  : isLast
                                  ? 'bg-green-600 text-white border-green-600'
                                  : 'bg-white text-blue-600 border-blue-400'
                              }`}>
                                {stop.order}
                              </div>

                              <div
                                onClick={handleStopClick}
                                role="button"
                                tabIndex={0}
                                className={[
                                  'flex-1 rounded-lg p-3 border transition-colors cursor-pointer',
                                  isSelectedPickup ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-200',
                                  isSelectedDropoff ? 'bg-indigo-50 border-indigo-400' : ''
                                ].join(' ')}
                                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') handleStopClick(); }}
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
                                  {isSelectedPickup && (
                                    <span className="text-xs font-semibold text-blue-700">Bạn chọn điểm đón</span>
                                  )}
                                  {isSelectedDropoff && (
                                    <span className="text-xs font-semibold text-indigo-700">Bạn chọn điểm trả</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                )}
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
                      {(tripDetail?.seats || []).map((seat) => {
                        const seatNumber = parseInt(seat.seat_number, 10);
                        // Find the current status of this seat
                        const seatStatus = tripDetail?.seats?.find(
                          s => s.seat_number === String(seatNumber)
                        );
                        const status = seatStatus?.status || 'available';
                        const isSelected = selectedSeats.includes(seatNumber);


                        return (
                          <button
                            key={seatNumber}
                            onClick={() => handleSeatClick(seatNumber, status)}
                            disabled={status !== 'available'}
                            className={[
                              'p-3 rounded-lg border-2 text-center font-medium transition-colors',
                              status !== 'available'
                                ? 'bg-red-100 text-gray-500 border-red-300 cursor-not-allowed'
                                : isSelected
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                            ].join(' ')}
                            title={status !== 'available' ? `Ghế ${seatNumber} đã bán/giữ` : `Ghế ${seatNumber}`}
                          >
                            {seatNumber}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded mr-2"></div>
                        <span className="text-sm text-gray-600">Ghế trống ({availableSeatsCount - selectedAvailableCount})</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded mr-2"></div>
                        <span className="text-sm text-gray-600">Ghế đã bán/giữ ({(tripDetail?.seats?.length || 0) - availableSeatsCount})</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-blue-600 border-2 border-blue-600 rounded mr-2"></div>
                        <span className="text-sm text-gray-600">Đã chọn ({selectedAvailableCount})</span>
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
                  {tripDetail?.stops && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Điểm đón / trả:</span>
                      <span className="font-medium text-right">
                        {selectedPickupId ? (tripDetail.stops.find(s => s._id === selectedPickupId)?.stop_name || '-') : '-'}
                        {' '} / {' '}
                        {selectedDropoffId ? (tripDetail.stops.find(s => s._id === selectedDropoffId)?.stop_name || '-') : '-'}
                      </span>
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

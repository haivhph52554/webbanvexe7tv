// components/PaymentSuccess.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Bus, MapPin, Clock, Calendar, XCircle } from 'lucide-react';

type SuccessPayload = {
  bookingId: string;
  paymentId: string;
  route: { from: string; to: string; durationMin: number | null };
  times: { departureTime: string; arrivalTime: string | null };
  bus: { busType: string; seatCount: number; licensePlate?: string };
  driver?: { name?: string; phone?: string; licenseNumber?: string } | null;
  assistant?: { name?: string; phone?: string } | null;
  seats: (number|string)[];
  passenger: { name?: string; phone?: string; email?: string; note?: string } | null;
  pricePerSeat: number;
  totalAmount: number;
  paymentMethod: 'momo'|'banking'|'cod';
};

const PaymentSuccess: React.FC = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const s = (state || null) as SuccessPayload | null;

  // Kiểm tra callback từ VNPay
  const successParam = searchParams.get('success');
  const bookingIdParam = searchParams.get('bookingId');
  const paymentIdParam = searchParams.get('paymentId');
  const errorParam = searchParams.get('error');

  const [bookingStatus, setBookingStatus] = useState<string | null>(() => {
    if (successParam === 'true') return 'paid';
    if (errorParam) return 'failed';
    if (!s) return null;
    return (s.paymentMethod === 'banking' || s.paymentMethod === 'momo' || s.paymentMethod === 'vnpay') ? 'pending' : 'paid';
  });
  const [bookingData, setBookingData] = useState<SuccessPayload | null>(s);
  const pollingRef = useRef<number | null>(null);

  // Fetch booking data nếu có bookingId từ URL (callback từ VNPay)
  useEffect(() => {
    if (bookingIdParam && !s) {
      const fetchBooking = async () => {
        try {
          const API_BASE = 'http://localhost:5000';
          const res = await fetch(`${API_BASE}/api/bookings/${bookingIdParam}`);
          if (res.ok) {
            const booking = await res.json();
            // Convert booking to SuccessPayload format
            const payload: SuccessPayload = {
              bookingId: booking._id,
              paymentId: booking.payment_id || paymentIdParam || '',
              route: {
                from: booking.pickup_name || booking.route_snapshot?.from || '',
                to: booking.dropoff_name || booking.route_snapshot?.to || '',
                durationMin: booking.route_snapshot?.estimated_duration_min || null,
              },
              times: {
                departureTime: booking.start_time,
                arrivalTime: booking.end_time || null,
              },
              bus: {
                busType: booking.bus_snapshot?.bus_type || '',
                seatCount: booking.bus_snapshot?.seat_count || 0,
                licensePlate: booking.bus_snapshot?.license_plate || '',
              },
              driver: booking.driver_snapshot || null,
              assistant: booking.assistant_snapshot || null,
              seats: booking.seat_numbers.map((s: string) => parseInt(s, 10)),
              passenger: booking.passenger || null,
              pricePerSeat: (booking.total_amount || 0) / (booking.seat_numbers?.length || 1),
              totalAmount: booking.total_amount || 0,
              paymentMethod: 'vnpay',
            };
            setBookingData(payload);
          }
        } catch (err) {
          console.error('Error fetching booking:', err);
        }
      };
      fetchBooking();
    }
  }, [bookingIdParam, paymentIdParam, s]);

  const currentData = bookingData || s;

  if (!currentData && !bookingIdParam) {
    // nếu F5 mất state và không có bookingId từ URL thì quay về trang chủ
    navigate('/');
    return null;
  }

  if (!currentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  const fmtTime = (iso?: string | null) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  // Sử dụng currentData thay vì s
  const data = currentData;

  

  // Save the ticket into localStorage so MyTicketsPage (which reads localStorage) shows it
  useEffect(() => {
    if (!data) return;

    try {
      const key = 'vexe7tv_tickets';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');

      // Build ticket shape compatible with MyTicketsPage
      const ticket = {
        id: data.bookingId,
        bookingId: data.bookingId,
        route: {
          from: data.route.from,
          to: data.route.to,
          price: (data.pricePerSeat || 0).toString(),
          duration: data.route.durationMin?.toString() || '',
          departureTime: data.times.departureTime,
          arrivalTime: data.times.arrivalTime || '',
          busType: data.bus.busType || '',
          licensePlate: data.bus.licensePlate || ''
        },
        seats: (data.seats || []).map((x: any) => Number(x)),
        passenger: data.passenger || { name: '', phone: '', email: '', note: '' },
        driver: data.driver || null,
        assistant: data.assistant || null,
        totalAmount: data.totalAmount || 0,
        paymentMethod: data.paymentMethod,
        bookingDate: new Date().toISOString(),
        status: (data.paymentMethod === 'banking' || data.paymentMethod === 'momo' || data.paymentMethod === 'vnpay') 
          ? (bookingStatus === 'paid' ? 'confirmed' : 'pending') 
          : 'confirmed'
      };

      // avoid duplicates
      const exists = existing.some((t: any) => t.bookingId === ticket.bookingId);
      if (!exists) {
        const updated = [ticket, ...existing];
        localStorage.setItem(key, JSON.stringify(updated));
      } else {
        // Update existing ticket
        const idx = existing.findIndex((t: any) => t.bookingId === ticket.bookingId);
        if (idx !== -1) {
          existing[idx] = ticket;
          localStorage.setItem(key, JSON.stringify(existing));
        }
      }
    } catch (err) {
      console.error('Failed to save ticket to localStorage', err);
    }
  }, [data, bookingStatus]);

  // Poll backend to check booking status when payment is pending
  useEffect(() => {
    if (!data) return;
    if (bookingStatus !== 'pending' && bookingStatus !== null) return;

    const checkStatus = async () => {
      try {
        const API_BASE = 'http://localhost:5000';
        const res = await fetch(`${API_BASE}/api/bookings/${data.bookingId}`);
        if (!res.ok) return;
        const bookingData = await res.json();
        if (bookingData && bookingData.status) {
          const newStatus = bookingData.status === 'paid' ? 'paid' : bookingData.status === 'cancelled' ? 'cancelled' : 'pending';
          if (newStatus !== bookingStatus) {
            setBookingStatus(newStatus);

            // update localStorage ticket if exists
            try {
              const key = 'vexe7tv_tickets';
              const existing = JSON.parse(localStorage.getItem(key) || '[]');
              const idx = existing.findIndex((t: any) => t.bookingId === data.bookingId);
              if (idx !== -1) {
                existing[idx].status = newStatus === 'paid' ? 'confirmed' : newStatus === 'cancelled' ? 'cancelled' : 'pending';
                localStorage.setItem(key, JSON.stringify(existing));
              }
            } catch (e) { console.warn('Failed update localStorage after status change', e); }
          }
        }
      } catch (e) {
        // ignore network errors silently
      }
    };

    // initial check then interval (chỉ poll nếu chưa có success từ URL)
    if (!successParam) {
      checkStatus();
      pollingRef.current = window.setInterval(checkStatus, 5000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [data, bookingStatus, successParam]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <div className="flex items-center">
              <Bus className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">VeXe7TV</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
       {/* LOGIC HIỂN THỊ: Chấp nhận cả Banking, MoMo và VNPay là pending để hiện QR */}
        {(data.paymentMethod === 'banking' || data.paymentMethod === 'momo') && data.totalAmount > 0 && bookingStatus === 'pending' ? (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 mb-8 text-center max-w-md mx-auto">
            <h3 className="text-xl font-bold text-yellow-800 mb-4 animate-pulse">
              {bookingStatus === 'cancelled' ? '❌ Đặt vé không thành công' : '⏳ Đơn hàng đang chờ thanh toán!'}
            </h3>
            
            <div className="bg-white p-2 inline-block rounded-lg shadow-sm border">
              {/* QR Code VietQR tự động */}
              <img 
                src={`https://img.vietqr.io/image/BIDV-8851715585-compact.jpg?amount=${data.totalAmount}&addInfo=VEXE ${data.bookingId}`} 
                alt="QR Code thanh toán" 
                className="h-48 w-48 mx-auto"
              />
            </div>
            
            <div className="mt-4 text-sm text-gray-800 space-y-1">
              <p>Ngân hàng: <strong>BIDV - PGD Lê Trọng Tấn</strong></p>
              <p>Số tài khoản: <strong className="text-lg">8851715585</strong></p>
              <p>Chủ tài khoản: <strong>NGUYEN TIEN DUNG</strong></p>
              <p className="pt-2">Nội dung chuyển khoản (Bắt buộc):</p>
              <p className="font-mono font-bold text-red-600 text-lg bg-white inline-block px-2 py-1 rounded border border-red-200">
                VEXE {data.bookingId}
              </p>
            </div>
            
            {bookingStatus === 'cancelled' ? (
              <p className="mt-4 text-red-600 font-semibold">
                Đơn hàng của bạn đã bị hủy vì quá hạn thanh toán. Vui lòng đặt lại nếu cần.
              </p>
            ) : (
              <p className="mt-4 text-red-600 text-xs italic">
                * Vui lòng chuyển khoản đúng nội dung để hệ thống tự động xử lý.
              </p>
            )}
          </div>
        ) : errorParam ? (
          /* TRƯỜNG HỢP LỖI: Thanh toán thất bại */
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Thanh toán thất bại</h2>
            <p className="text-red-600 mb-4">{decodeURIComponent(errorParam)}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Về trang chủ
            </button>
          </div>
        ) : (
          /* TRƯỜNG HỢP: Đã thanh toán thành công (COD, VNPay thành công, hoặc logic khác) */
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Đặt vé thành công!</h2>
            <p className="text-gray-600">Mã đặt vé: {data.bookingId}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Vé điện tử */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Vé điện tử</h3>
                
                {/* Logic kiểm tra: Nếu là Banking/Momo/VNPay -> Hiện Chờ thanh toán (Vàng), Ngược lại -> Đã thanh toán (Xanh) */}
                {(data.paymentMethod === 'banking' || data.paymentMethod === 'momo' || data.paymentMethod === 'vnpay') && bookingStatus === 'pending' ? (
                   bookingStatus === 'cancelled' ? (
                     <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">❌ Đã hủy</span>
                   ) : (
                     <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">⏳ Chờ thanh toán</span>
                   )
                ) : (
                   <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">✅ Đã thanh toán</span>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-gray-900 mb-1">VeXe7TV</div>
                  <div className="text-sm text-gray-600">Mã đặt vé: {data.bookingId}</div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="text-center">
                    <MapPin className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                    <div className="font-semibold text-gray-900">{data.route.from}</div>
                    <div className="text-sm text-gray-600">{fmtTime(data.times.departureTime)}</div>
                  </div>

                  <div className="flex-1 mx-4">
                    <div className="border-t border-dashed border-gray-300"></div>
                    <div className="text-center mt-1">
                      <Clock className="h-4 w-4 inline mr-1" />
                      <span className="text-sm text-gray-600">
                        {data.route.durationMin ? `${Math.floor((data.route.durationMin||0)/60)}h ${(data.route.durationMin||0)%60}m` : '-'}
                      </span>
                    </div>
                  </div>

                  <div className="text-center">
                    <MapPin className="h-6 w-6 text-green-600 mx-auto mb-1" />
                    <div className="font-semibold text-gray-900">{data.route.to}</div>
                    <div className="text-sm text-gray-600">{fmtTime(data.times.arrivalTime)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-600">Ghế:</span><span className="ml-2 font-medium">{data.seats.join(', ')}</span></div>
                  <div><span className="text-gray-600">Xe:</span><span className="ml-2 font-medium">{data.bus.busType} {data.bus.licensePlate ? `(${data.bus.licensePlate})` : ''}</span></div>
                  <div><span className="text-gray-600">Loại xe:</span><span className="ml-2 font-medium">{data.bus.busType}</span></div>
                  <div><span className="text-gray-600">Hành khách:</span><span className="ml-2 font-medium">{data.passenger?.name || '-'}</span></div>
                  <div><span className="text-gray-600">SĐT:</span><span className="ml-2 font-medium">{data.passenger?.phone || '-'}</span></div>
                  <div><span className="text-gray-600">Tài xế:</span><span className="ml-2 font-medium">{data.driver?.name || '-'}</span></div>
                  <div><span className="text-gray-600">SĐT tài xế:</span><span className="ml-2 font-medium">{data.driver?.phone || '-'}</span></div>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                disabled={bookingStatus === 'cancelled'}
                className={`w-full py-2 px-4 rounded-lg transition-colors font-medium ${bookingStatus === 'cancelled' ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {bookingStatus === 'cancelled' ? 'Vé đã hủy' : 'In / Tải vé điện tử'}
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Thông tin chuyến đi</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-blue-600 mr-3" />
                  <div>
                    <p className="font-semibold text-gray-900">Ngày khởi hành</p>
                    <p className="text-gray-600">{new Date(data.times.departureTime).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-semibold text-gray-900">Giờ khởi hành</p>
                    <p className="text-gray-600">{fmtTime(data.times.departureTime)}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Bus className="h-5 w-5 text-purple-600 mr-3" />
                  <div>
                    <p className="font-semibold text-gray-900">Loại xe</p>
                    <p className="text-gray-600">{data.bus.busType}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Thanh toán */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Chi tiết thanh toán</h3>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between"><span className="text-gray-600">Mã đặt vé:</span><span className="font-medium">{data.bookingId}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Mã thanh toán:</span><span className="font-medium">{data.paymentId || '-'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Phương thức:</span><span className="font-medium">
                  {data.paymentMethod === 'momo' ? 'Ví MoMo' : 
                   data.paymentMethod === 'vnpay' ? 'VNPay' :
                   data.paymentMethod === 'cod' ? 'Thanh toán tại xe' : 
                   'Chuyển khoản ngân hàng'}
                </span></div>
                <div className="flex justify-between"><span className="text-gray-600">Số ghế:</span><span className="font-medium">{data.seats.length} ghế</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Giá vé/ghế:</span><span className="font-medium">{(data.pricePerSeat || 0).toLocaleString()}₫</span></div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Tổng thanh toán:</span>
                    <span className="text-green-600">{(data.totalAmount || 0).toLocaleString()}₫</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/')}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>

        {/* footer nhỏ */}
        <div className="mt-12 text-center text-sm text-gray-500">
          Cần hỗ trợ? Hotline 1900 1234 • support@vexe7tv.com
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;

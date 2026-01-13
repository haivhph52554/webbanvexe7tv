// components/PaymentSuccess.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Bus, MapPin, Clock, Calendar } from 'lucide-react';

const API_BASE = ((import.meta as any)?.env?.VITE_BACKEND_URL as string) || 'http://localhost:5555';

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
  // totalAmount là số tiền thực tế thanh toán (sau giảm)
   totalAmount: number;
   // Các field mới từ backend (tùy chọn)
   originalTotal?: number;     // Tổng tiền gốc trước giảm
   discountAmount?: number;    // Số tiền giảm
   voucherCode?: string | null;
  paymentMethod: 'momo'|'banking'|'cod'|'vnpay';
};


const formatBookingCode = (bookingId: string) => {
  if (!bookingId) return '';
  const clean = bookingId.replace(/-/g, '').toUpperCase();
  return `VXR-7TV-${clean.slice(-6)}`;
};

const formatPaymentCode = (paymentId: string) => {
  if (!paymentId) return '';
  const clean = paymentId.replace(/-/g, '').toUpperCase();
  return `PAY-${clean.slice(-8)}`;
};

const PaymentSuccess: React.FC = () => {
  const { state } = useLocation();  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingIdParam = searchParams.get('bookingId');
  const status = searchParams.get('status') || 'success';
  const [payload, setPayload] = useState<SuccessPayload | null>((state || null) as SuccessPayload | null);
  const [loading, setLoading] = useState(!state && !!bookingIdParam);
  const [error, setError] = useState<string | null>(null);
  const bookingCode = formatBookingCode(payload?.bookingId || bookingIdParam || '');
  const paymentCode = formatPaymentCode(payload?.paymentId || '');

  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  // Khởi tạo với thông tin từ payload ban đầu, nếu có
  const [driverInfo, setDriverInfo] = useState<{ name?: string; phone?: string } | null>(null);
  const [assistantInfo, setAssistantInfo] = useState<{ name?: string; phone?: string } | null>(null);
  const pollingRef = useRef<number | null>(null);

  const fmtTime = (iso?: string | null) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    if (!bookingIdParam || payload) return;
    let mounted = true;
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/api/bookings/${bookingIdParam}/summary`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (mounted) setPayload(data);
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Không thể tải thông tin thanh toán');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchSummary();
    return () => { mounted = false; };
  }, [bookingIdParam, payload]);

  useEffect(() => {
    if (!payload) return;
    setBookingStatus((payload.paymentMethod === 'banking' || payload.paymentMethod === 'momo') ? 'pending' : 'paid');
    if (payload.driver && (payload.driver.name || payload.driver.phone)) {
      setDriverInfo({ name: payload.driver.name || '', phone: payload.driver.phone || '' });
    }
    if (payload.assistant && (payload.assistant.name || payload.assistant.phone)) {
      setAssistantInfo({ name: payload.assistant.name || '', phone: payload.assistant.phone || '' });
    }
  }, [payload]);

  useEffect(() => {
    if (!payload && !loading && !bookingIdParam) {
      navigate('/');
    }
  }, [payload, loading, bookingIdParam, navigate]);

  

  // Save the ticket into localStorage so MyTicketsPage (which reads localStorage) shows it
  useEffect(() => {
    if (!payload || status !== 'success') return;

    try {
      const key = 'vexe7tv_tickets';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');

      // Build ticket shape compatible with MyTicketsPage
      const ticket = {
        id: payload.bookingId,
        bookingId: payload.bookingId,
        route: {
          from: payload.route.from,
          to: payload.route.to,
          price: (payload.pricePerSeat || 0).toString(),
          duration: payload.route.durationMin?.toString() || '',
          departureIso: payload.times.departureTime,
          departureTime: (new Date(payload.times.departureTime)).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          arrivalTime: payload.times.arrivalTime ? (new Date(payload.times.arrivalTime)).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
          busType: payload.bus.busType || ''
          ,
          licensePlate: payload.bus.licensePlate || ''
        },
        seats: (payload.seats || []).map((x: any) => Number(x)),
        passenger: payload.passenger || { name: '', phone: '', email: '', note: '' },
        driver: payload.driver || null,
        assistant: payload.assistant || null,
        totalAmount: payload.totalAmount || 0,
        paymentMethod: payload.paymentMethod,
        bookingDate: new Date().toISOString(),
        status: (payload.paymentMethod === 'banking' || payload.paymentMethod === 'momo') ? 'pending' : 'confirmed'
      };

      // avoid duplicates
      const exists = existing.some((t: any) => t.bookingId === ticket.bookingId);
      if (!exists) {
        const updated = [ticket, ...existing];
        localStorage.setItem(key, JSON.stringify(updated));
      }
    } catch (err) {
      console.error('Failed to save ticket to localStorage', err);
    }
  }, [payload, status]);

  // Fetch booking details to get driver and assistant info when component mounts
  useEffect(() => {
    const bookingIdStr = String(payload?.bookingId || bookingIdParam || '');
    if (!bookingIdStr) return;

    const fetchBookingDetails = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/bookings/${bookingIdStr}`);
        if (!res.ok) {
          console.warn('Failed to fetch booking details:', res.status);
          return;
        }
        const data = await res.json();
        console.log('Booking data received:', { 
          hasDriverSnapshot: !!data?.driver_snapshot,
          driverSnapshot: data?.driver_snapshot,
          bookingId: data?._id
        });
        
        // Cập nhật thông tin tài xế và lơ xe từ driver_snapshot và assistant_snapshot
        if (data?.driver_snapshot) {
          const driverName = data.driver_snapshot.name || '';
          const driverPhone = data.driver_snapshot.phone || '';
          console.log('Driver snapshot found:', { name: driverName, phone: driverPhone });
          
          // Cập nhật ngay cả khi chỉ có name hoặc phone
          if (driverName || driverPhone) {
            setDriverInfo({
              name: driverName,
              phone: driverPhone
            });
            console.log('Driver info state updated:', { name: driverName, phone: driverPhone });
          } else {
            console.warn('Driver snapshot exists but both name and phone are empty');
          }
        } else {
          console.warn('No driver_snapshot in booking data');
        }
        if (data?.assistant_snapshot) {
          const assistantName = data.assistant_snapshot.name || '';
          const assistantPhone = data.assistant_snapshot.phone || '';
          if (assistantName || assistantPhone) {
            setAssistantInfo({
              name: assistantName,
              phone: assistantPhone
            });
          }
        }
      } catch (e) {
        console.error('Error fetching booking details:', e);
      }
    };

    // Fetch ngay khi component mount để lấy thông tin tài xế và lơ xe
    fetchBookingDetails();
  }, [payload?.bookingId, bookingIdParam]);

  // Poll backend to check booking status when payment is pending
  useEffect(() => {
    if (!payload) return;
    if (bookingStatus !== 'pending') return;

    const checkStatus = async () => {
      try {
        const bookingIdStr = String(payload.bookingId);
        const res = await fetch(`${API_BASE}/api/bookings/${bookingIdStr}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.status && data.status !== bookingStatus) {
          setBookingStatus(data.status);

          // Cập nhật thông tin tài xế và lơ xe nếu có
          if (data?.driver_snapshot) {
            setDriverInfo({
              name: data.driver_snapshot.name || '',
              phone: data.driver_snapshot.phone || ''
            });
          }
          if (data?.assistant_snapshot) {
            setAssistantInfo({
              name: data.assistant_snapshot.name || '',
              phone: data.assistant_snapshot.phone || ''
            });
          }

          // update localStorage ticket if exists
          try {
            const key = 'vexe7tv_tickets';
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            const idx = existing.findIndex((t: any) => t.bookingId === payload.bookingId);
            if (idx !== -1) {
              existing[idx].status = data.status === 'cancelled' ? 'cancelled' : existing[idx].status;
              localStorage.setItem(key, JSON.stringify(existing));
            }
          } catch (e) { console.warn('Failed update localStorage after status change', e); }
        }
      } catch (e) {
        // ignore network errors silently
      }
    };

    // initial check then interval
    checkStatus();
    pollingRef.current = window.setInterval(checkStatus, 5000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [payload, bookingStatus]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-gray-600">Đang tải thông tin thanh toán...</div>
      </div>
    );
  }

  if (status !== 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-900 mb-2">Thanh toán chưa thành công</div>
          <div className="text-gray-600 mb-4">{error || 'Vui lòng thử lại hoặc chọn phương thức khác.'}</div>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 mb-4">Không tìm thấy thông tin thanh toán.</div>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

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
       {/* LOGIC HIỂN THỊ: Chấp nhận cả Banking và MoMo là pending để hiện QR */}
        {(payload.paymentMethod === 'banking' || payload.paymentMethod === 'momo') && payload.totalAmount > 0 ? (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 mb-8 text-center max-w-md mx-auto">
            <h3 className="text-xl font-bold text-yellow-800 mb-4 animate-pulse">
              {bookingStatus === 'cancelled' ? '❌ Đặt vé không thành công' : '⏳ Đơn hàng đang chờ thanh toán!'}
            </h3>
            
            <div className="bg-white p-2 inline-block rounded-lg shadow-sm border">
              {/* QR Code VietQR tự động */}
              <img 
                src={`https://img.vietqr.io/image/MB-0945555555-compact.jpg?amount=${payload.totalAmount}&addInfo=${bookingCode}`} 
                alt="QR Code thanh toán" 
                className="h-48 w-48 mx-auto"
              />
            </div>
            
            <div className="mt-4 text-sm text-gray-800 space-y-1">
              <p>Ngân hàng: <strong>MB Bank</strong></p>
              <p>Số tài khoản: <strong className="text-lg">0945555555</strong></p>
              <p>Chủ tài khoản: <strong>NGUYEN VAN A</strong></p>
              <p className="pt-2">Nội dung chuyển khoản (Bắt buộc):</p>
              <p className="font-mono font-bold text-red-600 text-lg bg-white inline-block px-2 py-1 rounded border border-red-200">
               {bookingCode}
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
        ) : (
          /* TRƯỜNG HỢP CŨ: Đã thanh toán (COD hoặc logic khác) */
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Đặt vé thành công!</h2>
            <p className="text-gray-600">Mã đặt vé: {bookingCode}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Vé điện tử */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Vé điện tử</h3>
                
                {/* Logic kiểm tra: Nếu là Banking/Momo -> Hiện Chờ thanh toán (Vàng), Ngược lại -> Đã thanh toán (Xanh) */}
                {(payload.paymentMethod === 'banking' || payload.paymentMethod === 'momo') ? (
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
                  <div className="text-sm text-gray-600">Mã đặt vé: {bookingCode}</div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="text-center">
                    <MapPin className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                    <div className="font-semibold text-gray-900">{payload.route.from}</div>
                    <div className="text-sm text-gray-600">{fmtTime(payload.times.departureTime)}</div>
                  </div>

                  <div className="flex-1 mx-4">
                    <div className="border-t border-dashed border-gray-300"></div>
                    <div className="text-center mt-1">
                      <Clock className="h-4 w-4 inline mr-1" />
                      <span className="text-sm text-gray-600">
                        {payload.route.durationMin ? `${Math.floor((payload.route.durationMin||0)/60)}h ${(payload.route.durationMin||0)%60}m` : '-'}
                      </span>
                    </div>
                  </div>

                  <div className="text-center">
                    <MapPin className="h-6 w-6 text-green-600 mx-auto mb-1" />
                    <div className="font-semibold text-gray-900">{payload.route.to}</div>
                    <div className="text-sm text-gray-600">{fmtTime(payload.times.arrivalTime)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-600">Ghế:</span><span className="ml-2 font-medium">{payload.seats.join(', ')}</span></div>
                  <div><span className="text-gray-600">Xe:</span><span className="ml-2 font-medium">{payload.bus.busType} {payload.bus.licensePlate ? `(${payload.bus.licensePlate})` : ''}</span></div>
                  <div><span className="text-gray-600">Loại xe:</span><span className="ml-2 font-medium">{payload.bus.busType}</span></div>
                  <div><span className="text-gray-600">Hành khách:</span><span className="ml-2 font-medium">{payload.passenger?.name || '-'}</span></div>
                  <div><span className="text-gray-600">SĐT:</span><span className="ml-2 font-medium">{payload.passenger?.phone || '-'}</span></div>
                  <div><span className="text-gray-600">Tài xế:</span><span className="ml-2 font-medium">{driverInfo?.name || payload.driver?.name || '-'}</span></div>
                  <div><span className="text-gray-600">SĐT tài xế:</span><span className="ml-2 font-medium">{driverInfo?.phone || payload.driver?.phone || '-'}</span></div>
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
                    <p className="text-gray-600">{new Date(payload.times.departureTime).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-semibold text-gray-900">Giờ khởi hành</p>
                    <p className="text-gray-600">{fmtTime(payload.times.departureTime)}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Bus className="h-5 w-5 text-purple-600 mr-3" />
                  <div>
                    <p className="font-semibold text-gray-900">Loại xe</p>
                    <p className="text-gray-600">{payload.bus.busType}</p>
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
                <div className="flex justify-between"><span className="text-gray-600">Mã đặt vé:</span><span className="font-medium">{bookingCode}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Mã thanh toán:</span><span className="font-medium">{paymentCode}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Phương thức:</span><span className="font-medium">{payload.paymentMethod === 'momo' ? 'Ví MoMo' : payload.paymentMethod === 'cod' ? 'Thanh toán tại xe' : payload.paymentMethod === 'vnpay' ? 'VNPay' : 'Chuyển khoản ngân hàng'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Số ghế:</span><span className="font-medium">{payload.seats.length} ghế</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Giá vé/ghế:</span><span className="font-medium">{(payload.pricePerSeat || 0).toLocaleString()}₫</span></div>
                {typeof payload.originalTotal === 'number' && payload.originalTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tổng tiền gốc:</span>
                    <span className="font-medium line-through text-gray-400">{payload.originalTotal.toLocaleString()}₫</span>
                  </div>
                )}
                {typeof payload.discountAmount === 'number' && payload.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Giảm giá{ payload.voucherCode ? ` (${payload.voucherCode})` : ''}:</span>
                    <span>-{payload.discountAmount.toLocaleString()}₫</span>
                  </div>
                )}
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Tổng thanh toán:</span>
                    <span className="text-green-600">{(payload.totalAmount || 0).toLocaleString()}₫</span>
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

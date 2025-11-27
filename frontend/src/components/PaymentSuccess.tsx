// components/PaymentSuccess.tsx
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Bus, MapPin, Clock, Calendar } from 'lucide-react';

type SuccessPayload = {
  bookingId: string;
  paymentId: string;
  route: { from: string; to: string; durationMin: number | null };
  times: { departureTime: string; arrivalTime: string | null };
  bus: { busType: string; seatCount: number; licensePlate?: string };
  seats: (number|string)[];
  passenger: { name?: string; phone?: string; email?: string; note?: string } | null;
  pricePerSeat: number;
  totalAmount: number;
  paymentMethod: 'momo'|'banking'|'cod';
};

const PaymentSuccess: React.FC = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const s = (state || null) as SuccessPayload | null;

  if (!s) {
    // nếu F5 mất state thì quay về trang chủ (hoặc bạn có thể gọi GET /api/bookings/:id nếu truyền id qua query)
    navigate('/');
    return null;
  }

  const fmtTime = (iso?: string | null) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  

  // Save the ticket into localStorage so MyTicketsPage (which reads localStorage) shows it
  useEffect(() => {
    if (!s) return;

    try {
      const key = 'vexe7tv_tickets';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');

      // Build ticket shape compatible with MyTicketsPage
      const ticket = {
        id: s.bookingId,
        bookingId: s.bookingId,
        route: {
          from: s.route.from,
          to: s.route.to,
          price: (s.pricePerSeat || 0).toString(),
          duration: s.route.durationMin?.toString() || '',
          departureTime: s.times.departureTime,
          arrivalTime: s.times.arrivalTime || '',
          busType: s.bus.busType || ''
        },
        seats: (s.seats || []).map((x: any) => Number(x)),
        passenger: s.passenger || { name: '', phone: '', email: '', note: '' },
        totalAmount: s.totalAmount || 0,
        paymentMethod: s.paymentMethod,
        bookingDate: new Date().toISOString(),
        status: 'confirmed'
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
  }, [s]);

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
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Đặt vé thành công!</h2>
          <p className="text-gray-600">Mã đặt vé: {s.bookingId}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Vé điện tử */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Vé điện tử</h3>
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Đã thanh toán</span>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-gray-900 mb-1">VeXe7TV</div>
                  <div className="text-sm text-gray-600">Mã đặt vé: {s.bookingId}</div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="text-center">
                    <MapPin className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                    <div className="font-semibold text-gray-900">{s.route.from}</div>
                    <div className="text-sm text-gray-600">{fmtTime(s.times.departureTime)}</div>
                  </div>

                  <div className="flex-1 mx-4">
                    <div className="border-t border-dashed border-gray-300"></div>
                    <div className="text-center mt-1">
                      <Clock className="h-4 w-4 inline mr-1" />
                      <span className="text-sm text-gray-600">
                        {s.route.durationMin ? `${Math.floor((s.route.durationMin||0)/60)}h ${(s.route.durationMin||0)%60}m` : '-'}
                      </span>
                    </div>
                  </div>

                  <div className="text-center">
                    <MapPin className="h-6 w-6 text-green-600 mx-auto mb-1" />
                    <div className="font-semibold text-gray-900">{s.route.to}</div>
                    <div className="text-sm text-gray-600">{fmtTime(s.times.arrivalTime)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-600">Ghế:</span><span className="ml-2 font-medium">{s.seats.join(', ')}</span></div>
                  <div><span className="text-gray-600">Xe:</span><span className="ml-2 font-medium">{s.bus.busType} {s.bus.licensePlate ? `(${s.bus.licensePlate})` : ''}</span></div>
                  <div><span className="text-gray-600">Loại xe:</span><span className="ml-2 font-medium">{s.bus.busType}</span></div>
                  <div><span className="text-gray-600">Hành khách:</span><span className="ml-2 font-medium">{s.passenger?.name || '-'}</span></div>
                  <div><span className="text-gray-600">SĐT:</span><span className="ml-2 font-medium">{s.passenger?.phone || '-'}</span></div>
                </div>
              </div>

              <button
                onClick={() => window.print()}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                In / Tải vé điện tử
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Thông tin chuyến đi</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-blue-600 mr-3" />
                  <div>
                    <p className="font-semibold text-gray-900">Ngày khởi hành</p>
                    <p className="text-gray-600">{new Date(s.times.departureTime).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-semibold text-gray-900">Giờ khởi hành</p>
                    <p className="text-gray-600">{fmtTime(s.times.departureTime)}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Bus className="h-5 w-5 text-purple-600 mr-3" />
                  <div>
                    <p className="font-semibold text-gray-900">Loại xe</p>
                    <p className="text-gray-600">{s.bus.busType}</p>
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
                <div className="flex justify-between"><span className="text-gray-600">Mã đặt vé:</span><span className="font-medium">{s.bookingId}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Mã thanh toán:</span><span className="font-medium">{s.paymentId}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Phương thức:</span><span className="font-medium">{s.paymentMethod === 'momo' ? 'Ví MoMo' : s.paymentMethod === 'cod' ? 'Thanh toán tại xe' : 'Chuyển khoản ngân hàng'}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Số ghế:</span><span className="font-medium">{s.seats.length} ghế</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Giá vé/ghế:</span><span className="font-medium">{(s.pricePerSeat || 0).toLocaleString()}₫</span></div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Tổng thanh toán:</span>
                    <span className="text-green-600">{(s.totalAmount || 0).toLocaleString()}₫</span>
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

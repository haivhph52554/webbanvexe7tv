import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bus, MapPin, Clock, Calendar, Download, Eye, Trash2, XCircle } from 'lucide-react';
import { useAuth } from '../App';

interface Ticket {
  id: string;
  bookingId: string;
  route: {
    from: string;
    to: string;
    price: string;
    duration: string;
    departureTime: string;
    arrivalTime: string;
    busType: string;
  };
  seats: number[];
  passenger: {
    name: string;
    phone: string;
    email: string;
    note: string;
  };
  totalAmount: number;
  paymentMethod: string;
  bookingDate: string;
  status: 'confirmed' | 'cancelled' | 'used';
}

type BookingDoc = {
  _id: string;
  user?: any;
  trip?: any;
  route_snapshot?: {
    from: string;
    to: string;
    estimated_duration_min?: number;
  };
  bus_snapshot?: {
    bus_type: string;
    license_plate: string;
    seat_count: number;
  };
  start_time: string;
  end_time?: string | null;
  seat_numbers: string[];
  total_amount?: number;
  total_price?: number;
  passenger?: {
    name: string;
    phone: string;
    email: string;
    note: string;
  };
  status: 'pending' | 'paid' | 'cancelled' | 'completed';
  createdAt: string;
};

const API_BASE = ((import.meta as any)?.env?.VITE_BACKEND_URL as string) || 'http://localhost:5000';

const MyTicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'cancelled' | 'used'>('all');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch từ API với credentials để gửi cookie token
        const res = await fetch(`${API_BASE}/api/bookings`, {
          credentials: 'include', // Quan trọng để gửi cookie
        });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        
        const bookings: BookingDoc[] = await res.json();
        
        // Chuyển đổi Booking format sang Ticket format
        const convertedTickets: Ticket[] = bookings.map((booking) => {
          const fmtTime = (iso?: string | null) => {
            if (!iso) return '-';
            const d = new Date(iso);
            if (Number.isNaN(d.getTime())) return '-';
            return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          };

          const fmtDate = (iso?: string | null) => {
            if (!iso) return new Date().toISOString();
            return iso;
          };

          const durationMin = booking.route_snapshot?.estimated_duration_min || 0;
          const duration = durationMin 
            ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
            : '-';

          // Map status từ booking sang ticket
          const mapStatus = (status: string): 'confirmed' | 'cancelled' | 'used' => {
            if (status === 'cancelled') return 'cancelled';
            if (status === 'completed') return 'used';
            return 'confirmed'; // pending, paid -> confirmed
          };

          return {
            id: booking._id,
            bookingId: booking._id.substring(0, 8).toUpperCase(),
            route: {
              from: booking.route_snapshot?.from || '-',
              to: booking.route_snapshot?.to || '-',
              price: String(booking.total_amount || booking.total_price || 0),
              duration,
              departureTime: fmtTime(booking.start_time),
              arrivalTime: fmtTime(booking.end_time),
              busType: booking.bus_snapshot?.bus_type || '-',
            },
            seats: booking.seat_numbers.map(s => parseInt(s, 10)).filter(n => !Number.isNaN(n)),
            passenger: booking.passenger || {
              name: '',
              phone: '',
              email: '',
              note: '',
            },
            totalAmount: booking.total_amount || booking.total_price || 0,
            paymentMethod: 'banking', // Có thể lấy từ payment nếu cần
            bookingDate: fmtDate(booking.createdAt),
            status: mapStatus(booking.status),
          };
        });

        setTickets(convertedTickets);
      } catch (err: any) {
        setError(err.message || 'Lỗi khi tải danh sách vé');
        console.error('Error fetching bookings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user]); // Re-fetch khi user thay đổi

  const filteredTickets = tickets.filter(ticket => {
    if (filterStatus === 'all') return true;
    return ticket.status === filterStatus;
  });

  const handleViewTicket = (ticket: Ticket) => {
    // Chuyển đến trang chi tiết vé
    navigate('/ticket-detail', { state: { ticket } });
  };

  const handleDownloadTicket = (ticket: Ticket) => {
    // Simulate download
    alert(`Đang tải xuống vé ${ticket.bookingId}`);
  };

  const handleCancelTicket = (ticketId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn hủy vé này?')) {
      const updatedTickets = tickets.map(ticket => 
        ticket.id === ticketId ? { ...ticket, status: 'cancelled' as const } : ticket
      );
      setTickets(updatedTickets);
      localStorage.setItem('vexe7tv_tickets', JSON.stringify(updatedTickets));
    }
  };

  const handleDeleteTicket = (ticketId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa vé này?')) {
      const updatedTickets = tickets.filter(ticket => ticket.id !== ticketId);
      setTickets(updatedTickets);
      localStorage.setItem('vexe7tv_tickets', JSON.stringify(updatedTickets));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'used': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Đã xác nhận';
      case 'cancelled': return 'Đã hủy';
      case 'used': return 'Đã sử dụng';
      default: return 'Không xác định';
    }
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
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Vé của tôi</h2>
          <p className="text-gray-600">Quản lý và theo dõi các vé đã đặt</p>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tất cả ({tickets.length})
            </button>
            <button
              onClick={() => setFilterStatus('confirmed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'confirmed'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Đã xác nhận ({tickets.filter(t => t.status === 'confirmed').length})
            </button>
            <button
              onClick={() => setFilterStatus('cancelled')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'cancelled'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Đã hủy ({tickets.filter(t => t.status === 'cancelled').length})
            </button>
            <button
              onClick={() => setFilterStatus('used')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'used'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Đã sử dụng ({tickets.filter(t => t.status === 'used').length})
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Đang tải danh sách vé...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
            {!user && (
              <p className="text-sm text-red-600 mt-2">
                Vui lòng <button onClick={() => navigate('/login')} className="underline font-medium">đăng nhập</button> để xem vé của bạn.
              </p>
            )}
          </div>
        )}

        {/* Tickets List */}
        {!loading && !error && filteredTickets.length > 0 ? (
          <div className="space-y-6">
            {filteredTickets.map((ticket) => (
              <div key={ticket.id} className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-3 rounded-lg mr-4">
                      <Bus className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {ticket.route.from} → {ticket.route.to}
                      </h3>
                      <p className="text-sm text-gray-600">Mã đặt vé: {ticket.bookingId}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
                      {getStatusText(ticket.status)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">Ngày đặt</p>
                      <p className="font-medium">{new Date(ticket.bookingDate).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-green-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">Giờ khởi hành</p>
                      <p className="font-medium">{ticket.route.departureTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-purple-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">Ghế</p>
                      <p className="font-medium">{ticket.seats.join(', ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Bus className="h-5 w-5 text-orange-600 mr-2" />
                    <div>
                      <p className="text-sm text-gray-600">Loại xe</p>
                      <p className="font-medium">{ticket.route.busType}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-blue-600">
                    {ticket.totalAmount.toLocaleString()}₫
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewTicket(ticket)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Xem chi tiết
                    </button>
                    {ticket.status === 'confirmed' && (
                      <>
                        <button
                          onClick={() => handleDownloadTicket(ticket)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Tải vé
                        </button>
                        <button
                          onClick={() => handleCancelTicket(ticket.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Hủy vé
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteTicket(ticket.id)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !loading && !error ? (
          <div className="text-center py-12">
            <Bus className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Chưa có vé nào</h3>
            <p className="text-gray-600 mb-6">
              {user 
                ? 'Bạn chưa đặt vé nào. Hãy đặt vé để bắt đầu hành trình!'
                : 'Vui lòng đăng nhập để xem vé của bạn hoặc đặt vé mới.'}
            </p>
            <div className="flex gap-4 justify-center">
              {!user && (
                <button
                  onClick={() => navigate('/login')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Đăng nhập
                </button>
              )}
              <button
                onClick={() => navigate('/')}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Đặt vé ngay
              </button>
            </div>
          </div>
        ) : null}

        {/* Stats */}
        {tickets.length > 0 && (
          <div className="mt-12 bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Thống kê</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{tickets.length}</div>
                <div className="text-sm text-gray-600">Tổng vé</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {tickets.filter(t => t.status === 'confirmed').length}
                </div>
                <div className="text-sm text-gray-600">Đã xác nhận</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {tickets.filter(t => t.status === 'cancelled').length}
                </div>
                <div className="text-sm text-gray-600">Đã hủy</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {tickets.reduce((sum, ticket) => sum + ticket.totalAmount, 0).toLocaleString()}₫
                </div>
                <div className="text-sm text-gray-600">Tổng chi phí</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTicketsPage;

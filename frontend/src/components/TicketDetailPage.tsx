import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bus, MapPin, Clock, Calendar, Download, Home, User, Phone, Mail, FileText } from 'lucide-react';

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

const TicketDetailPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const ticket = location.state?.ticket as Ticket;

  if (!ticket) {
    navigate('/my-tickets');
    return null;
  }

  const handleDownloadTicket = () => {
    // Simulate ticket download
    alert(`Đang tải xuống vé ${ticket.bookingId}`);
  };

  const handleBackToTickets = () => {
    navigate('/my-tickets');
  };

  const handleBackToHome = () => {
    navigate('/');
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

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'momo': return 'Ví MoMo';
      case 'banking': return 'Chuyển khoản ngân hàng';
      case 'cod': return 'Thanh toán tại xe';
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
              onClick={handleBackToTickets}
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Chi tiết vé</h2>
          <p className="text-gray-600">Thông tin đầy đủ về vé đã đặt</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Vé điện tử */}
          <div className="space-y-6">
            {/* Vé điện tử */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Vé điện tử</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}>
                  {getStatusText(ticket.status)}
                </span>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-gray-900 mb-1">VeXe7TV</div>
                  <div className="text-sm text-gray-600">Mã đặt vé: {ticket.bookingId}</div>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="text-center">
                    <MapPin className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                    <div className="font-semibold text-gray-900">{ticket.route.from}</div>
                    <div className="text-sm text-gray-600">{ticket.route.departureTime}</div>
                  </div>
                  
                  <div className="flex-1 mx-4">
                    <div className="border-t border-dashed border-gray-300"></div>
                    <div className="text-center mt-1">
                      <Clock className="h-4 w-4 inline mr-1" />
                      <span className="text-sm text-gray-600">{ticket.route.duration}</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <MapPin className="h-6 w-6 text-green-600 mx-auto mb-1" />
                    <div className="font-semibold text-gray-900">{ticket.route.to}</div>
                    <div className="text-sm text-gray-600">{ticket.route.arrivalTime}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Ghế:</span>
                    <span className="ml-2 font-medium">{ticket.seats.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Loại xe:</span>
                    <span className="ml-2 font-medium">{ticket.route.busType}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Hành khách:</span>
                    <span className="ml-2 font-medium">{ticket.passenger.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">SĐT:</span>
                    <span className="ml-2 font-medium">{ticket.passenger.phone}</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleDownloadTicket}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <Download className="h-5 w-5 mr-2" />
                Tải vé điện tử
              </button>
            </div>

            {/* Thông tin chuyến đi */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Thông tin chuyến đi</h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-blue-600 mr-3" />
                  <div>
                    <p className="font-semibold text-gray-900">Ngày đặt vé</p>
                    <p className="text-gray-600">{new Date(ticket.bookingDate).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-semibold text-gray-900">Giờ khởi hành</p>
                    <p className="text-gray-600">{ticket.route.departureTime}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Bus className="h-5 w-5 text-purple-600 mr-3" />
                  <div>
                    <p className="font-semibold text-gray-900">Loại xe</p>
                    <p className="text-gray-600">{ticket.route.busType}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Thông tin chi tiết */}
          <div className="space-y-6">
            {/* Thông tin hành khách */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Thông tin hành khách</h3>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-blue-600 mr-3" />
                  <div>
                    <p className="font-semibold text-gray-900">Họ và tên</p>
                    <p className="text-gray-600">{ticket.passenger.name}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-green-600 mr-3" />
                  <div>
                    <p className="font-semibold text-gray-900">Số điện thoại</p>
                    <p className="text-gray-600">{ticket.passenger.phone}</p>
                  </div>
                </div>
                
                {ticket.passenger.email && (
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-purple-600 mr-3" />
                    <div>
                      <p className="font-semibold text-gray-900">Email</p>
                      <p className="text-gray-600">{ticket.passenger.email}</p>
                    </div>
                  </div>
                )}
                
                {ticket.passenger.note && (
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-orange-600 mr-3" />
                    <div>
                      <p className="font-semibold text-gray-900">Ghi chú</p>
                      <p className="text-gray-600">{ticket.passenger.note}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chi tiết thanh toán */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Chi tiết thanh toán</h3>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Mã đặt vé:</span>
                  <span className="font-medium">{ticket.bookingId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phương thức thanh toán:</span>
                  <span className="font-medium">{getPaymentMethodText(ticket.paymentMethod)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Số ghế:</span>
                  <span className="font-medium">{ticket.seats.length} ghế</span>
                </div>
                {/* Removed explicit 'Ghế đã chọn' row to avoid duplicate display */}
                <div className="flex justify-between">
                  <span className="text-gray-600">Giá vé/ghế:</span>
                  <span className="font-medium">{ticket.route.price}₫</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Phí dịch vụ:</span>
                  <span className="font-medium">0₫</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Tổng thanh toán:</span>
                    <span className="text-green-600">{ticket.totalAmount.toLocaleString()}₫</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lưu ý quan trọng */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-yellow-800 mb-3">Lưu ý quan trọng</h3>
              <ul className="space-y-2 text-sm text-yellow-700">
                <li>• Vui lòng có mặt tại bến xe trước giờ khởi hành 30 phút</li>
                <li>• Mang theo CMND/CCCD để đối chiếu khi lên xe</li>
                <li>• Vé điện tử đã được gửi về email của bạn</li>
                <li>• Liên hệ hotline 1900 1234 nếu cần hỗ trợ</li>
              </ul>
            </div>

            {/* Hành động */}
            <div className="space-y-3">
              <button
                onClick={handleBackToTickets}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center font-medium"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Về danh sách vé
              </button>
              
              <button
                onClick={handleBackToHome}
                className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center font-medium"
              >
                <Home className="h-5 w-5 mr-2" />
                Về trang chủ
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Cần hỗ trợ?</h3>
            <p className="text-gray-600 mb-4">
              Nếu bạn có bất kỳ thắc mắc nào về chuyến đi, vui lòng liên hệ với chúng tôi
            </p>
            <div className="flex justify-center space-x-6 text-sm">
              <div className="flex items-center">
                <span className="font-medium">Hotline:</span>
                <span className="ml-2 text-blue-600">1900 1234</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium">Email:</span>
                <span className="ml-2 text-blue-600">support@vexe7tv.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailPage;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bus, Phone, Mail, MapPin, Clock, MessageCircle, Send, CheckCircle } from 'lucide-react';

const ContactPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate form submission
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    }, 3000);
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
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Liên hệ với chúng tôi</h2>
          <p className="text-gray-600">Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="space-y-8">
            {/* Contact Cards */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Thông tin liên hệ</h3>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="bg-blue-100 p-3 rounded-lg mr-4">
                    <Phone className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Hotline</h4>
                    <p className="text-gray-600 mb-1">1900 1234</p>
                    <p className="text-sm text-gray-500">Hỗ trợ 24/7</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-green-100 p-3 rounded-lg mr-4">
                    <Mail className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Email</h4>
                    <p className="text-gray-600 mb-1">support@vexe7tv.com</p>
                    <p className="text-sm text-gray-500">Phản hồi trong 24h</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-purple-100 p-3 rounded-lg mr-4">
                    <MapPin className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Địa chỉ</h4>
                    <p className="text-gray-600 mb-1">123 Đường Trịnh Văn Bô, Quận Nam Từ Liêm</p>
                    <p className="text-gray-600 mb-1">TP.Hà Nội, Việt Nam</p>
                    <p className="text-sm text-gray-500">Trụ sở chính</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-orange-100 p-3 rounded-lg mr-4">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Giờ làm việc</h4>
                    <p className="text-gray-600 mb-1">Thứ 2 - Thứ 6: 8:00 - 18:00</p>
                    <p className="text-gray-600 mb-1">Thứ 7: 8:00 - 12:00</p>
                    <p className="text-sm text-gray-500">Hotline hoạt động 24/7</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Câu hỏi thường gặp</h3>
              
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-1">Làm thế nào để đặt vé?</h4>
                  <p className="text-gray-600 text-sm">Chọn tuyến đường, chọn ghế, nhập thông tin và thanh toán.</p>
                </div>
                
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-1">Có thể hủy vé không?</h4>
                  <p className="text-gray-600 text-sm">Có thể hủy vé trước giờ khởi hành 2 tiếng.</p>
                </div>
                
                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-1">Thanh toán như thế nào?</h4>
                  <p className="text-gray-600 text-sm">Hỗ trợ MoMo, chuyển khoản ngân hàng và thanh toán tại xe.</p>
                </div>
                
                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-semibold text-gray-900 mb-1">Có hỗ trợ hoàn tiền không?</h4>
                  <p className="text-gray-600 text-sm">Có chính sách hoàn tiền theo điều khoản dịch vụ.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Gửi tin nhắn</h3>
            
            {isSubmitted ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Tin nhắn đã được gửi!</h4>
                <p className="text-gray-600">Chúng tôi sẽ phản hồi trong thời gian sớm nhất.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Họ và tên *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập họ và tên"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập email"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nhập số điện thoại"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Chủ đề *
                    </label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Chọn chủ đề</option>
                      <option value="booking">Đặt vé</option>
                      <option value="cancel">Hủy vé</option>
                      <option value="refund">Hoàn tiền</option>
                      <option value="complaint">Khiếu nại</option>
                      <option value="suggestion">Góp ý</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nội dung tin nhắn *
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nhập nội dung tin nhắn..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
                >
                  <Send className="h-5 w-5 mr-2" />
                  Gửi tin nhắn
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-xl p-6 text-center">
            <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="h-6 w-6 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Chat trực tuyến</h4>
            <p className="text-gray-600 text-sm">Hỗ trợ trực tuyến 24/7 qua chat</p>
          </div>
          
          <div className="bg-green-50 rounded-xl p-6 text-center">
            <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="h-6 w-6 text-green-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Hotline</h4>
            <p className="text-gray-600 text-sm">Gọi ngay 1900 1234 để được hỗ trợ</p>
          </div>
          
          <div className="bg-purple-50 rounded-xl p-6 text-center">
            <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-6 w-6 text-purple-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Email</h4>
            <p className="text-gray-600 text-sm">Gửi email đến support@vexe7tv.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;

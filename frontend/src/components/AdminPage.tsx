// frontend/src/components/AdminPage.tsxxx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Trip {
  _id: string;
  route: any;
  bus: any;
  start_time: string;
  end_time: string;
  base_price: number;
  direction: string;
}

interface Booking {
  _id: string;
  trip: any;
  user: any;
  seats: string[];
  total_price: number;
  status: string;
  createdAt: string;
}

const AdminPage: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'trips' | 'bookings'>('trips');

  // URL Backend
  const API_BASE = 'http://localhost:5000';

  useEffect(() => {
    fetchTrips();
    fetchBookings();
  }, []);

  const fetchTrips = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/trips`);
      const data = await response.json();
      setTrips(data);
    } catch (error) {
      console.error('Error fetching trips:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      // Dùng endpoint admin để lấy tất cả booking
      const response = await fetch(`${API_BASE}/api/bookings`);
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đặt chỗ này?')) {
      return;
    }

    try {
      // Gọi API xóa trong admin routes
      const response = await fetch(`${API_BASE}/admin/bookings/${bookingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error deleting booking');
      }

      // Refresh the bookings list
      fetchBookings();
    } catch (error) {
      console.error('Error:', error);
      alert('Có lỗi khi xóa đặt chỗ. Vui lòng thử lại.');
    }
  };

  // --- HÀM DUYỆT THANH TOÁN (MỚI) ---
  const handleApprovePayment = async (bookingId: string) => {
    if (!window.confirm('Xác nhận đã nhận được tiền cho đơn này?')) return;
    
    try {
      // Gọi API update status (Lưu ý: dùng /admin/bookings/... theo đúng file adminRoutes.js)
      const response = await fetch(`${API_BASE}/admin/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }) // Chuyển sang trạng thái đã thanh toán
      });

      if (response.ok) {
        alert('Đã duyệt đơn thành công!');
        fetchBookings(); // Load lại danh sách để cập nhật trạng thái
      } else {
        const err = await response.json();
        alert('Lỗi khi duyệt đơn: ' + (err.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error approving:', error);
      alert('Lỗi kết nối đến server');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#1e3a8a',
        color: 'white',
        padding: '1.5rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
          <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>← Về trang chủ</Link>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem' }}>
        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          backgroundColor: 'white',
          padding: '0.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
        }}>
          <button
            onClick={() => setActiveTab('trips')}
            style={{
              flex: 1,
              padding: '1rem',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: activeTab === 'trips' ? '#1e3a8a' : 'transparent',
              color: activeTab === 'trips' ? 'white' : '#333',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              transition: 'all 0.3s'
            }}
          >
            Quản lý Chuyến xe ({trips.length})
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            style={{
              flex: 1,
              padding: '1rem',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: activeTab === 'bookings' ? '#1e3a8a' : 'transparent',
              color: activeTab === 'bookings' ? 'white' : '#333',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
              transition: 'all 0.3s'
            }}
          >
            Quản lý Đặt chỗ ({bookings.length})
          </button>
        </div>

        {/* Trips Tab */}
        {activeTab === 'trips' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, color: '#1e3a8a' }}>Danh sách Chuyến xe</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>ID</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Tuyến</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Thời gian</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Giá cơ bản</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Hướng</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map((trip) => (
                    <tr key={trip._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '1rem' }}>{trip._id.substring(0, 8)}...</td>
                      <td style={{ padding: '1rem' }}>{trip.route?.name || 'N/A'}</td>
                      <td style={{ padding: '1rem' }}>
                        {new Date(trip.start_time).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {trip.base_price?.toLocaleString('vi-VN')} ₫
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '4px',
                          backgroundColor: trip.direction === 'go' ? '#dbeafe' : '#fed7aa',
                          color: trip.direction === 'go' ? '#1e40af' : '#c2410c'
                        }}>
                          {trip.direction === 'go' ? 'Đi' : 'Về'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {trips.length === 0 && (
                <p style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  Chưa có chuyến xe nào
                </p>
              )}
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, color: '#1e3a8a' }}>Danh sách Đặt chỗ</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>ID</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Khách hàng</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Ghế</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Tổng tiền</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Trạng thái</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Ngày đặt</th>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '1rem' }}>{booking._id.substring(0, 8)}...</td>
                      <td style={{ padding: '1rem' }}>{booking.user?.name || 'N/A'}</td>
                      <td style={{ padding: '1rem' }}>{booking.seats?.join(', ') || 'N/A'}</td>
                      <td style={{ padding: '1rem' }}>
                        {booking.total_price?.toLocaleString('vi-VN')} ₫
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '4px',
                          backgroundColor: 
                            booking.status === 'paid' || booking.status === 'confirmed' || booking.status === 'completed' 
                              ? '#d1fae5' 
                              : booking.status === 'pending' 
                                ? '#fef3c7' 
                                : '#fee2e2',
                          color: 
                            booking.status === 'paid' || booking.status === 'confirmed' || booking.status === 'completed'
                              ? '#065f46' 
                              : booking.status === 'pending' 
                                ? '#d97706' 
                                : '#991b1b'
                        }}>
                          {booking.status === 'paid' ? 'Đã thanh toán' : booking.status === 'pending' ? 'Chờ thanh toán' : booking.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {new Date(booking.createdAt).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        {/* NÚT DUYỆT: Chỉ hiện khi trạng thái là pending */}
                        {booking.status === 'pending' && (
                          <button
                            onClick={() => handleApprovePayment(booking._id)}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#10b981', // Màu xanh lá
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              marginRight: '8px',
                              transition: 'all 0.2s'
                            }}
                            title="Xác nhận đã nhận tiền"
                          >
                            ✔ Duyệt
                          </button>
                        )}

                        <button 
                          onClick={() => handleDeleteBooking(booking._id)}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bookings.length === 0 && (
                <p style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  Chưa có đặt chỗ nào
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
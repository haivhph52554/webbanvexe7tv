import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { LogOut, Bus, User, CheckCircle, XCircle, MapPin } from 'lucide-react';

const API_BASE = ((import.meta as any)?.env?.VITE_BACKEND_URL as string) || '';

const AssistantPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Load danh sách chuyến được phân công
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/assistant/my-trips`, {
          credentials: 'include',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token') || ''}` } // Nếu dùng header token
        });
        if (res.ok) {
          const data = await res.json();
          setTrips(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchTrips();
  }, []);

  // 2. Load hành khách khi chọn chuyến
  const handleSelectTrip = async (tripId: string) => {
    setSelectedTripId(tripId);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/assistant/trip/${tripId}/passengers`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setPassengers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 3. Xử lý điểm danh
  const handleCheckIn = async (bookingId: string, status: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/assistant/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bookingId, status })
      });
      
      if (res.ok) {
        // Cập nhật UI ngay lập tức
        setPassengers(prev => prev.map(p => 
          p._id === bookingId ? { ...p, checkinStatus: status } : p
        ));
      } else {
        alert('Lỗi khi cập nhật trạng thái');
      }
    } catch (err) {
      alert('Lỗi kết nối');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header riêng cho Assistant */}
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bus className="text-blue-600" />
          <h1 className="text-xl font-bold">Cổng Phụ Xe</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-medium text-gray-700 flex items-center gap-2">
            <User size={18} /> {user?.name}
          </span>
          <button onClick={() => { logout(); navigate('/login'); }} className="text-red-600 hover:text-red-800">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        {!selectedTripId ? (
          /* DANH SÁCH CHUYẾN XE */
          <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Chuyến xe được phân công</h2>
            {trips.length === 0 ? <p>Chưa có chuyến nào được phân công.</p> : (
              <div className="grid gap-4 md:grid-cols-2">
                {trips.map(trip => (
                  <div key={trip._id} 
                       onClick={() => handleSelectTrip(trip._id)}
                       className="bg-white p-5 rounded-xl shadow cursor-pointer hover:shadow-md transition border-l-4 border-blue-500">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg mb-1">
                          {trip.route?.from_city} → {trip.route?.to_city}
                        </h3>
                        <p className="text-gray-500 text-sm flex items-center gap-1">
                          <MapPin size={14} /> {trip.bus?.license_plate}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-blue-600 font-bold">
                          {new Date(trip.start_time).toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {new Date(trip.start_time).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* DANH SÁCH HÀNH KHÁCH */
          <div>
            <button onClick={() => setSelectedTripId(null)} className="mb-4 text-blue-600 font-medium">← Quay lại danh sách chuyến</button>
            <h2 className="text-2xl font-bold mb-4">Danh sách hành khách</h2>
            
            {loading ? <p>Đang tải...</p> : (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-4">Ghế</th>
                      <th className="p-4">Hành khách</th>
                      <th className="p-4">SĐT</th>
                      <th className="p-4">Trạng thái</th>
                      <th className="p-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {passengers.map(p => (
                      <tr key={p._id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-bold text-blue-600">
                          {p.seat_numbers.join(', ')}
                        </td>
                        <td className="p-4">
                          {p.passenger?.name || p.user?.name || 'Khách lẻ'}
                        </td>
                        <td className="p-4 text-gray-600">
                          {p.passenger?.phone || p.user?.phone}
                        </td>
                        <td className="p-4">
                          {p.checkinStatus === 'checked_in' && <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle size={16}/> Đã lên xe</span>}
                          {p.checkinStatus === 'no_show' && <span className="text-red-600 font-bold flex items-center gap-1"><XCircle size={16}/> Vắng mặt</span>}
                          {!p.checkinStatus && <span className="text-gray-400">Chưa đón</span>}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button onClick={() => handleCheckIn(p._id, 'checked_in')} 
                                  className={`px-3 py-1 rounded text-sm font-medium ${p.checkinStatus === 'checked_in' ? 'bg-green-100 text-green-800' : 'bg-gray-100 hover:bg-green-100 text-gray-800'}`}>
                            Lên xe
                          </button>
                          <button onClick={() => handleCheckIn(p._id, 'no_show')}
                                  className={`px-3 py-1 rounded text-sm font-medium ${p.checkinStatus === 'no_show' ? 'bg-red-100 text-red-800' : 'bg-gray-100 hover:bg-red-100 text-gray-800'}`}>
                            Vắng
                          </button>
                        </td>
                      </tr>
                    ))}
                    {passengers.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-gray-500">Chưa có hành khách nào đặt chuyến này.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssistantPage;
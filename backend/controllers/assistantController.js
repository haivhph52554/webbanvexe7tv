// backend/controllers/assistantController.js
const Assistant = require('../models/Assistant');
const Booking = require('../models/Booking');
const Trip = require('../models/Trip');
const Checkin = require('../models/Checkin');

// 1. Lấy danh sách chuyến xe được phân công cho Phụ xe đang đăng nhập
exports.getMyTrips = async (req, res) => {
  try {
    // Tìm phụ xe dựa trên userId (lấy từ token đăng nhập)
    const assistant = await Assistant.findOne({ userId: req.user._id });
    if (!assistant) {
      return res.status(404).json({ message: 'Không tìm thấy thông tin phụ xe' });
    }

    // Lấy các chuyến trong assigned_trips
    // (Nếu muốn lấy cả từ assigned_routes thì cần logic phức tạp hơn, tạm thời lấy trips trực tiếp)
    const trips = await Trip.find({
      _id: { $in: assistant.assigned_trips },
      // Chỉ lấy chuyến chưa hoàn thành hoặc vừa hoàn thành gần đây
      status: { $in: ['scheduled', 'departed'] } 
    })
    .populate('route')
    .populate('bus')
    .sort({ start_time: 1 });

    res.json(trips);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 2. Lấy danh sách hành khách (Bookings) của một chuyến cụ thể
exports.getTripPassengers = async (req, res) => {
  try {
    const { tripId } = req.params;
    
    // Lấy tất cả booking đã thanh toán của chuyến này
    const bookings = await Booking.find({ 
      trip: tripId,
      status: { $in: ['paid', 'completed'] } // Chỉ hiện vé đã thanh toán
    })
    .populate('user', 'name phone email') // Thông tin người đặt
    .sort({ 'seat_numbers': 1 });

    // Lấy thông tin check-in hiện tại
    const bookingIds = bookings.map(b => b._id);
    const checkins = await Checkin.find({ booking: { $in: bookingIds } });

    // Ghép thông tin checkin vào booking để trả về FE
    const result = bookings.map(booking => {
      const checkinInfo = checkins.find(c => c.booking.toString() === booking._id.toString());
      return {
        ...booking.toObject(),
        checkinStatus: checkinInfo ? checkinInfo.status : null // null, 'checked_in', 'no_show', ...
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 3. Điểm danh hành khách
exports.checkInPassenger = async (req, res) => {
  try {
    const { bookingId, status } = req.body; // status: 'checked_in', 'checked_out', 'no_show'
    const assistantUser = await Assistant.findOne({ userId: req.user._id });

    if (!['checked_in', 'checked_out', 'no_show'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    // Tìm hoặc tạo mới bản ghi Checkin
    let checkin = await Checkin.findOne({ booking: bookingId });
    
    if (checkin) {
      checkin.status = status;
      checkin.assistant = assistantUser._id;
      checkin.checkin_time = new Date();
      await checkin.save();
    } else {
      checkin = await Checkin.create({
        booking: bookingId,
        assistant: assistantUser._id,
        status: status,
        checkin_time: new Date()
      });
    }

    res.json({ success: true, message: 'Cập nhật điểm danh thành công', data: checkin });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
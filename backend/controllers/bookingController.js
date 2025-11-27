// controllers/bookingController.js
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Trip = require('../models/Trip');
const TripSeatStatus = require('../models/TripSeatStatus');
const RouteStop = require('../models/RouteStop');
const { sendBookingConfirmationEmail } = require('../utils/mailer');

const normalizeToNumber = (v) => {
  const num = parseInt(String(v).replace(/\D/g, ''), 10);
  return Number.isNaN(num) ? null : num;
};

exports.checkout = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { tripId, seatNumbers, passenger, paymentMethod, amount, stops } = req.body;

    if (!tripId || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      return res.status(400).json({ error: 'Thiếu tripId hoặc seatNumbers' });
    }

    const runFlow = async (maybeSession) => {
      const s = (query) => (maybeSession ? query.session(maybeSession) : query);
      const wopt = maybeSession ? { session: maybeSession } : {};

      // 1) Lấy trip + tham chiếu bus/route
      const trip = await s(
        Trip.findById(tripId)
          .populate('route')
          .populate('bus')
      );
      if (!trip) throw new Error('Trip không tồn tại');

      const seatCount = trip.bus?.seat_count || 0;
      if (!seatCount) throw new Error('Chuyến chưa có seat_count của bus');

      // 2) Chuẩn hoá danh sách ghế người dùng chọn (dưới dạng số)
      const requestedNums = (seatNumbers || [])
        .map(normalizeToNumber)
        .filter((n) => n != null);
      if (!requestedNums.length) throw new Error('Thiếu seatNumbers');

      // 3) Lấy ghế hiện có của trip
      let allSeatDocs = await s(TripSeatStatus.find({ trip: trip._id }));

      // 3a) Nếu CHƯA có ghế nào => seed toàn bộ 1..seat_count
      if (allSeatDocs.length === 0) {
        const seedDocs = [];
        for (let i = 1; i <= seatCount; i++) {
          seedDocs.push({
            trip: trip._id,
            seat_number: String(i), // "1","2",...
            status: 'available',
            booking_id: null
          });
        }
        await TripSeatStatus.insertMany(seedDocs, wopt);
        allSeatDocs = await s(TripSeatStatus.find({ trip: trip._id }));
      }

      // 3b) Map số ghế -> doc
      const seatByNum = new Map();
      // num -> doc
      for (const s of allSeatDocs) {
        const n = normalizeToNumber(s.seat_number);
        if (n != null && !seatByNum.has(n)) seatByNum.set(n, s);
      }

      // 3c) Nếu thiếu doc cho các ghế người dùng chọn => seed bổ sung (miễn là trong 1..seat_count)
      const missingNums = requestedNums.filter((n) => !seatByNum.has(n));
      if (missingNums.length) {
        const invalid = missingNums.filter((n) => n < 1 || n > seatCount);
        if (invalid.length) throw new Error('Số ghế vượt quá seat_count của xe');
        const addDocs = missingNums.map((n) => ({
          trip: trip._id,
          seat_number: String(n),
          status: 'available',
          booking_id: null
        }));
        await TripSeatStatus.insertMany(addDocs, wopt);

        // nạp bổ sung vào map
        const fresh = await s(TripSeatStatus.find({
          trip: trip._id,
          seat_number: { $in: missingNums.map(String) }
        }));
        for (const s of fresh) {
          const n = normalizeToNumber(s.seat_number);
          if (n != null) seatByNum.set(n, s);
        }
      }

      // 4) Lấy doc thật để đặt
      const willBookDocs = requestedNums.map((n) => seatByNum.get(n));
      if (willBookDocs.some((d) => !d)) throw new Error('Một số ghế không tồn tại trong chuyến');

      // 5) Kiểm tra trạng thái available
      if (willBookDocs.some((d) => d.status !== 'available')) {
        throw new Error('Có ghế đã được giữ/đặt');
      }

      // 6) Tính tiền ở server — nếu client truyền thông tin điểm dừng, tính theo đoạn giữa pickup/dropoff
      let pricePerSeat = trip.base_price || 0;
      let computedTotal = pricePerSeat * requestedNums.length;

      if (stops && stops.pickupId && stops.dropoffId) {
        // Load stops for route to compute relative fraction by order
        const pickupStop = await RouteStop.findById(stops.pickupId);
        const dropoffStop = await RouteStop.findById(stops.dropoffId);
        if (pickupStop && dropoffStop && String(pickupStop.route) === String(dropoffStop.route)) {
          const routeStops = await RouteStop.find({ route: pickupStop.route }).sort({ order: 1 });
          if (routeStops && routeStops.length > 0) {
            const orders = routeStops.map(s => (typeof s.order === 'number' ? s.order : 0));
            const minOrder = Math.min(...orders);
            const maxOrder = Math.max(...orders);
            const totalSegments = (maxOrder - minOrder) || 1;
            const segmentsBetween = Math.max(0, dropoffStop.order - pickupStop.order);
            const fraction = Math.min(1, segmentsBetween / totalSegments);
            // Compute prorated price per seat based on fraction of route length
            pricePerSeat = Math.round((trip.base_price || 0) * fraction);
            if (pricePerSeat <= 0) pricePerSeat = Math.max(1, Math.floor((trip.base_price || 0) * 0.2));
            computedTotal = pricePerSeat * requestedNums.length;
          }
        }
      }
      
      // 7) Tạo booking
      const seatLabels = willBookDocs.map((d) => d.seat_number);
      
      // --- LOGIC MỚI: Xác định trạng thái ---
      // Nếu là Banking hoặc MoMo -> Pending. COD -> Paid (hoặc pending tùy bạn, ở đây để paid cho đơn giản)
      const initialStatus = (paymentMethod === 'banking' || paymentMethod === 'momo') ? 'pending' : 'paid';

      const [booking] = await Booking.create(
        [
          {
            // Gắn user nếu đã đăng nhập
            user: req.user ? req.user._id : undefined,
            trip: trip._id,
            start_time: trip.start_time,
            end_time: trip.end_time || null,
            seat_numbers: seatLabels,
            passenger: passenger || null,
            total_amount: computedTotal,
            total_price: computedTotal,
            
            // --- SỬA Ở ĐÂY ---
            status: initialStatus, 
            stops: stops, 
            // -----------------

            route_snapshot: {
              from: trip.route?.from_city || '',
              to: trip.route?.to_city || '',
              estimated_duration_min: trip.route?.estimated_duration_min || null
            },
            pickup: stops && stops.pickupId ? String(stops.pickupId) : undefined,
            dropoff: stops && stops.dropoffId ? String(stops.dropoffId) : undefined,
            pickup_name: (stops && stops.pickupId && typeof stops.pickupName === 'string') ? stops.pickupName : undefined,
            dropoff_name: (stops && stops.dropoffId && typeof stops.dropoffName === 'string') ? stops.dropoffName : undefined,
            bus_snapshot: {
              bus_type: trip.bus?.bus_type || '',
              license_plate: trip.bus?.license_plate || '',
              seat_count: trip.bus?.seat_count || 0
            }
          }
        ],
        wopt
      );

      // 8) Tạo payment
      const [payment] = await Payment.create(
        [
          {
            booking: booking._id,
            method: paymentMethod || 'banking',
            amount: computedTotal,
            transaction_code: `TX${Date.now()}`,
            
            // --- SỬA Ở ĐÂY ---
            status: initialStatus === 'paid' ? 'success' : 'pending',
            paid_at: initialStatus === 'paid' ? new Date() : null
            // -----------------
          }
        ],
        wopt
      );

      // Link payment vào booking (nếu schema có field)
      booking.payment = payment._id;
      booking.payment_id = payment._id;
      // Ensure user is saved on booking (if middleware set req.user)
      if (req.user && !booking.user) booking.user = req.user._id;
      await booking.save(wopt);

      // 9) Cập nhật trạng thái ghế theo _id (an toàn nhất)
      const idsToUpdate = willBookDocs.map((d) => d._id);
      await TripSeatStatus.updateMany(
        { _id: { $in: idsToUpdate } },
        { $set: { status: 'booked', booking_id: booking._id, updated_at: new Date() } },
        wopt
      );

      // 10) Chuẩn bị payload trả về FE (seats trả về dạng SỐ cho UI)
      const payload = {
        bookingId: String(booking._id),
        paymentId: String(payment._id),
        route: {
          from: booking.route_snapshot.from,
          to: booking.route_snapshot.to,
          durationMin: booking.route_snapshot.estimated_duration_min
        },
        times: { departureTime: booking.start_time, arrivalTime: booking.end_time },
        bus: { busType: booking.bus_snapshot.bus_type, seatCount: booking.bus_snapshot.seat_count, licensePlate: booking.bus_snapshot.license_plate },
        seats: requestedNums,
        passenger: booking.passenger || null,
        pricePerSeat,
        totalAmount: computedTotal,
        paymentMethod: payment.method
      };

      // Include selected stops info if present
      if (stops && stops.pickupId && stops.dropoffId) {
        payload.stops = {
          pickupId: String(stops.pickupId),
          dropoffId: String(stops.dropoffId),
          pickupName: stops.pickupName || (booking.pickup_name || null),
          dropoffName: stops.dropoffName || (booking.dropoff_name || null)
        };
      }

      // Gửi email xác nhận (không chặn response)
      // Nếu người dùng đã đăng nhập, ưu tiên gửi đến email đã đăng ký của tài khoản
      const recipientEmail = (req.user && req.user.email) ? req.user.email : (booking?.passenger?.email);
      if (recipientEmail) {
        // Fire-and-forget
        sendBookingConfirmationEmail(recipientEmail, payload)
          .catch((e) => console.error('Send email error:', e));
      }

      return payload;
    };

    // TẮT transaction hoàn toàn để tương thích MongoDB standalone
    const payload = await runFlow(null);
    return res.json(payload);
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(400).json({ error: err.message || 'Checkout failed' });
  } finally {
    session.endSession();
  }
};

// Dùng cho "Vé của tôi" / F5 success
exports.listOfUser = async (req, res) => {
  try {
    const { userId, phone } = req.query;
    // Nếu có user đăng nhập, tự động filter theo user đó
    // Ưu tiên: req.user > userId query > phone query > không filter
    let q = {};
    if (req.user && req.user._id) {
      // User đã đăng nhập - chỉ lấy bookings của user đó
      q = { user: req.user._id };
    } else if (userId) {
      // Admin có thể truyền userId để xem bookings của user khác
      q = { user: userId };
    } else if (phone) {
      // Tìm theo số điện thoại (cho trường hợp chưa đăng nhập)
      q = { 'passenger.phone': phone };
    }
    // Nếu không có gì, q = {} sẽ trả về tất cả (chỉ nên dùng cho admin)
    
    const docs = await Booking.find(q)
      .populate('trip')
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });
    res.json(docs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.detail = async (req, res) => {
  try {
    const doc = await Booking.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// API Hủy vé dành cho khách hàng
exports.cancel = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Không tìm thấy vé' });
    }

    // Chỉ cho phép hủy khi đang pending
    if (booking.status !== 'pending') {
      return res.status(400).json({ error: 'Chỉ có thể hủy vé khi đang chờ thanh toán' });
    }

    // 1. Cập nhật trạng thái Booking
    booking.status = 'cancelled';
    await booking.save();

    // 2. Nhả ghế ra (trả về status available)
    await TripSeatStatus.updateMany(
      { booking_id: booking._id },
      { $set: { status: 'available', booking_id: null } }
    );

    res.json({ success: true, message: 'Hủy vé thành công' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
};
// backend/controllers/bookingController.js
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Trip = require('../models/Trip');
const Driver = require('../models/Driver');
const Assistant = require('../models/Assistant');
const TripSeatStatus = require('../models/TripSeatStatus');
const RouteStop = require('../models/RouteStop');
const { sendBookingConfirmationEmail } = require('../utils/mailer');

// Cấu hình đơn giản cho mã giảm giá người dùng mới
const NEW_USER_VOUCHER = {
  code: (process.env.NEW_USER_VOUCHER_CODE || 'NEWUSER').toUpperCase(),
  discountPercent: Number(process.env.NEW_USER_VOUCHER_PERCENT || 20), // giảm 20%
  maxDiscount: Number(process.env.NEW_USER_VOUCHER_MAX || 50000)      // tối đa 50k
};

const normalizeToNumber = (v) => {
  const num = parseInt(String(v).replace(/\D/g, ''), 10);
  return Number.isNaN(num) ? null : num;
};

exports.checkout = async (req, res) => {
  // [FIX] Bỏ qua Transaction để tránh lỗi "Transaction numbers are only allowed..."
  // const session = await mongoose.startSession(); 
  
  try {
    const { tripId, seatNumbers, passenger, paymentMethod, amount, stops, voucherCode } = req.body;

    if (!tripId || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      return res.status(400).json({ error: 'Thiếu tripId hoặc seatNumbers' });
    }

    // 1) Lấy trip + tham chiếu bus/route
    const trip = await Trip.findById(tripId)
      .populate('route')
      .populate('bus');

    if (!trip) throw new Error('Trip không tồn tại');

    const seatCount = trip.bus?.seat_count || 0;
    if (!seatCount) throw new Error('Chuyến chưa có seat_count của bus');

    // 2) Chuẩn hoá danh sách ghế người dùng chọn
    const requestedNums = (seatNumbers || [])
      .map(normalizeToNumber)
      .filter((n) => n != null);

    if (!requestedNums.length) throw new Error('Thiếu seatNumbers');

    // 3) Lấy ghế hiện có của trip
    let allSeatDocs = await TripSeatStatus.find({ trip: trip._id });

    // 3a) Nếu CHƯA có ghế nào => seed toàn bộ
    if (allSeatDocs.length === 0) {
      const seedDocs = [];
      for (let i = 1; i <= seatCount; i++) {
        seedDocs.push({
          trip: trip._id,
          seat_number: String(i),
          status: 'available',
          booking_id: null
        });
      }
      await TripSeatStatus.insertMany(seedDocs); // Không dùng session
      allSeatDocs = await TripSeatStatus.find({ trip: trip._id });
    }

    // 3b) Map số ghế -> doc
    const seatByNum = new Map();
    for (const s of allSeatDocs) {
      const n = normalizeToNumber(s.seat_number);
      if (n != null && !seatByNum.has(n)) seatByNum.set(n, s);
    }

    // 3c) Nếu thiếu doc cho các ghế người dùng chọn => seed bổ sung
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
      await TripSeatStatus.insertMany(addDocs); // Không dùng session

      const fresh = await TripSeatStatus.find({
        trip: trip._id,
        seat_number: { $in: missingNums.map(String) }
      });
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

    // 6) Tính tiền & Xử lý chặng đường
    // ============================================================
    let fraction = 1; 
    let pricePerSeat = trip.base_price || 0;

    if (stops && stops.pickupId && stops.dropoffId) {
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
          
          fraction = Math.min(1, segmentsBetween / totalSegments);
          
          pricePerSeat = Math.round((trip.base_price || 0) * fraction);
          if (pricePerSeat <= 0) pricePerSeat = Math.max(1, Math.floor((trip.base_price || 0) * 0.2));
        }
      }
    }
    
    let computedTotal = pricePerSeat * requestedNums.length;
    if (computedTotal < 0) computedTotal = 0;

    // 6b) Áp dụng mã giảm giá (nếu có)
    let appliedVoucherCode = null;
    let appliedVoucherType = null;
    let discountAmount = 0;

    const normalizedVoucherCode = voucherCode ? String(voucherCode).trim().toUpperCase() : null;

    if (normalizedVoucherCode) {
      if (!passenger || !passenger.phone) {
        throw new Error('Vui lòng nhập số điện thoại để áp dụng mã giảm giá');
      }

      if (normalizedVoucherCode === NEW_USER_VOUCHER.code) {
        // Kiểm tra xem SĐT này đã từng dùng mã new user cho booking đã thanh toán chưa
        const existed = await Booking.exists({
          'passenger.phone': passenger.phone,
          status: { $in: ['paid', 'completed'] },
          voucher_type: 'new_user'
        });

        if (existed) {
          throw new Error('Số điện thoại này đã sử dụng mã giảm giá người dùng mới.');
        }

        appliedVoucherCode = normalizedVoucherCode;
        appliedVoucherType = 'new_user';

        const rawDiscount = Math.floor(
          (computedTotal * NEW_USER_VOUCHER.discountPercent) / 100
        );
        discountAmount = Math.min(rawDiscount, NEW_USER_VOUCHER.maxDiscount);
      } else {
        throw new Error('Mã giảm giá không hợp lệ hoặc chưa được hỗ trợ.');
      }
    }

    if (discountAmount < 0) discountAmount = 0;
    if (discountAmount > computedTotal) discountAmount = computedTotal;

    const finalAmount = computedTotal - discountAmount;
    // ============================================================

    // 7) Tạo booking
    const seatLabels = willBookDocs.map((d) => d.seat_number);
    const initialStatus = (paymentMethod === 'banking' || paymentMethod === 'momo') ? 'pending' : 'paid';

    let assignedDriver = null;
    let assignedAssistant = null;
    try {
      assignedDriver = await Driver.findOne({ $or: [{ assigned_trips: trip._id }, { assigned_routes: trip.route }] });
    } catch (e) { /* ignore */ }
    try {
      assignedAssistant = await Assistant.findOne({ $or: [{ assigned_trips: trip._id }, { assigned_routes: trip.route }] });
    } catch (e) { /* ignore */ }

    // Tính toán giờ đến dự kiến
    let calculatedArrivalTime = trip.end_time;
    if (trip.start_time && trip.end_time) {
        const startTime = new Date(trip.start_time).getTime();
        const endTime = new Date(trip.end_time).getTime();
        const totalDuration = endTime - startTime;
        
        const passengerDuration = totalDuration * fraction;
        calculatedArrivalTime = new Date(startTime + passengerDuration);
    }

    const [booking] = await Booking.create(
      [{
        user: req.user ? req.user._id : undefined,
        trip: trip._id,
        start_time: trip.start_time,
        end_time: calculatedArrivalTime,
        seat_numbers: seatLabels,
        passenger: passenger || null,
        total_amount: computedTotal,          // Tổng tiền gốc (chưa giảm)
        total_price: finalAmount,             // Tổng tiền sau khi giảm - dùng cho doanh thu
        voucher_code: appliedVoucherCode,
        voucher_type: appliedVoucherType,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        status: initialStatus, 
        stops: stops, 
        
        route_snapshot: {
          from: trip.route?.from_city || '',
          to: trip.route?.to_city || '',
          estimated_duration_min: trip.route?.estimated_duration_min || null
        },
        pickup: stops && stops.pickupId ? String(stops.pickupId) : undefined,
        dropoff: stops && stops.dropoffId ? String(stops.dropoffId) : undefined,
        pickup_name: (stops && stops.pickupName) ? stops.pickupName : undefined,
        dropoff_name: (stops && stops.dropoffName) ? stops.dropoffName : undefined,
        bus_snapshot: {
          bus_type: trip.bus?.bus_type || '',
          license_plate: trip.bus?.license_plate || '',
          seat_count: trip.bus?.seat_count || 0
        },
        driver_snapshot: assignedDriver ? {
          name: assignedDriver.name || '',
          phone: assignedDriver.phone || '',
          license_number: assignedDriver.license_number || ''
        } : undefined,
        assistant_snapshot: assignedAssistant ? {
          name: assignedAssistant.name || '',
          phone: assignedAssistant.phone || ''
        } : undefined
      }]
      // [FIX] Bỏ tham chiếu session
    );

    // 8) Tạo payment
    const [payment] = await Payment.create(
      [{
        booking: booking._id,
        method: paymentMethod || 'banking',
        amount: finalAmount,
        transaction_code: `TX${Date.now()}`,
        status: initialStatus === 'paid' ? 'success' : 'pending',
        paid_at: initialStatus === 'paid' ? new Date() : null
      }]
      // [FIX] Bỏ tham chiếu session
    );

    booking.payment = payment._id;
    booking.payment_id = payment._id;
    if (req.user && !booking.user) booking.user = req.user._id;
    await booking.save(); // [FIX] Bỏ session

    // 9) Cập nhật trạng thái ghế
    const idsToUpdate = willBookDocs.map((d) => d._id);
    await TripSeatStatus.updateMany(
      { _id: { $in: idsToUpdate } },
      { $set: { status: 'booked', booking_id: booking._id, updated_at: new Date() } }
      // [FIX] Bỏ session
    );

    // 10) Chuẩn bị payload trả về FE
    const payload = {
      bookingId: String(booking._id),
      paymentId: String(payment._id),
      route: {
        from: (stops && stops.pickupName) ? stops.pickupName : booking.route_snapshot.from,
        to: (stops && stops.dropoffName) ? stops.dropoffName : booking.route_snapshot.to,
        durationMin: booking.route_snapshot.estimated_duration_min
      },
      times: { 
          departureTime: booking.start_time, 
          arrivalTime: calculatedArrivalTime
      },
      bus: { 
          busType: booking.bus_snapshot.bus_type, 
          seatCount: booking.bus_snapshot.seat_count, 
          licensePlate: booking.bus_snapshot.license_plate 
      },
      driver: booking.driver_snapshot || null,
      assistant: booking.assistant_snapshot || null,
      seats: requestedNums,
      passenger: booking.passenger || null,
      pricePerSeat,
      originalTotal: computedTotal,
      discountAmount,
      totalAmount: finalAmount,
      paymentMethod: payment.method,
      stops: stops ? {
        pickupName: stops.pickupName,
        dropoffName: stops.dropoffName
      } : null
    };

    // Gửi email xác nhận
    const recipientEmail = (req.user && req.user.email) ? req.user.email : (booking?.passenger?.email);
    if (recipientEmail) {
      sendBookingConfirmationEmail(recipientEmail, payload)
        .catch((e) => console.error('Send email error:', e));
    }

    return res.json(payload);

  } catch (err) {
    console.error('Checkout error:', err);
    res.status(400).json({ error: err.message || 'Checkout failed' });
  } 
  // [FIX] Không cần session.endSession() nữa
};

exports.listOfUser = async (req, res) => {
  try {
    const { userId, phone } = req.query;
    let q = {};
    if (req.user && req.user._id) {
      q = { user: req.user._id };
    } else if (userId) {
      q = { user: userId };
    } else if (phone) {
      q = { 'passenger.phone': phone };
    }
    
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
    
    // Nếu không có driver_snapshot hoặc driver_snapshot rỗng, thử lấy từ trip
    if (!doc.driver_snapshot || !doc.driver_snapshot.name || !doc.driver_snapshot.phone) {
      try {
        const trip = await Trip.findById(doc.trip);
        if (trip) {
          const routeId = trip.route?._id || trip.route;
          
          // Tìm driver được assign cho trip hoặc route
          const assignedDriver = await Driver.findOne({ 
            $or: [
              { assigned_trips: { $in: [trip._id] } },
              { assigned_routes: { $in: [routeId] } }
            ]
          }).select('name phone license_number').lean();
          
          if (assignedDriver && (assignedDriver.name || assignedDriver.phone)) {
            doc.driver_snapshot = {
              name: assignedDriver.name || '',
              phone: assignedDriver.phone || '',
              license_number: assignedDriver.license_number || ''
            };
            // Lưu lại vào database để lần sau không cần fetch
            await doc.save();
            console.log('Driver snapshot updated for booking:', doc._id, assignedDriver.name);
          }
        }
      } catch (e) {
        console.error('Error fetching driver for booking:', e);
      }
    }
    
    // Tương tự cho assistant
    if (!doc.assistant_snapshot || !doc.assistant_snapshot.name || !doc.assistant_snapshot.phone) {
      try {
        const trip = await Trip.findById(doc.trip);
        if (trip) {
          const routeId = trip.route?._id || trip.route;
          
          const assignedAssistant = await Assistant.findOne({ 
            $or: [
              { assigned_trips: { $in: [trip._id] } },
              { assigned_routes: { $in: [routeId] } }
            ]
          }).select('name phone').lean();
          
          if (assignedAssistant && (assignedAssistant.name || assignedAssistant.phone)) {
            doc.assistant_snapshot = {
              name: assignedAssistant.name || '',
              phone: assignedAssistant.phone || ''
            };
            // Lưu lại vào database để lần sau không cần fetch
            await doc.save();
          }
        }
      } catch (e) {
        console.error('Error fetching assistant for booking:', e);
      }
    }
    
    res.json(doc);
  } catch (e) {
    console.error('Error in booking detail:', e);
    res.status(500).json({ error: e.message });
  }
};

exports.cancel = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Không tìm thấy vé' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ error: 'Chỉ có thể hủy vé khi đang chờ thanh toán' });
    }

    booking.status = 'cancelled';
    await booking.save();

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
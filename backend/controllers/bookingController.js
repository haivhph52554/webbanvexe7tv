// controllers/bookingController.js
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Trip = require('../models/Trip');
const TripSeatStatus = require('../models/TripSeatStatus');

const normalizeToNumber = (v) => {
  const num = parseInt(String(v).replace(/\D/g, ''), 10);
  return Number.isNaN(num) ? null : num;
};

exports.checkout = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { tripId, seatNumbers, passenger, paymentMethod, amount } = req.body;

    if (!tripId || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      return res.status(400).json({ error: 'Thiếu tripId hoặc seatNumbers' });
    }

    await session.withTransaction(async () => {
      // 1) Lấy trip + tham chiếu bus/route
      const trip = await Trip.findById(tripId)
        .populate('route')
        .populate('bus')
        .session(session);
      if (!trip) throw new Error('Trip không tồn tại');

      const seatCount = trip.bus?.seat_count || 0;
      if (!seatCount) throw new Error('Chuyến chưa có seat_count của bus');

      // 2) Chuẩn hoá danh sách ghế người dùng chọn (dưới dạng số)
      const requestedNums = (seatNumbers || [])
        .map(normalizeToNumber)
        .filter((n) => n != null);

      if (!requestedNums.length) throw new Error('Thiếu seatNumbers');

      // 3) Lấy ghế hiện có của trip
      let allSeatDocs = await TripSeatStatus.find({ trip: trip._id }).session(session);

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
        await TripSeatStatus.insertMany(seedDocs, { session });
        allSeatDocs = await TripSeatStatus.find({ trip: trip._id }).session(session);
      }

      // 3b) Map số ghế -> doc
      const seatByNum = new Map(); // num -> doc
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
        await TripSeatStatus.insertMany(addDocs, { session });

        // nạp bổ sung vào map
        const fresh = await TripSeatStatus.find({
          trip: trip._id,
          seat_number: { $in: missingNums.map(String) }
        }).session(session);
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

      // 6) Tính tiền ở server
      const pricePerSeat = trip.base_price || 0;
      const computedTotal = pricePerSeat * requestedNums.length;
      // if (Number(amount) !== computedTotal) throw new Error('Sai tổng tiền');

      // 7) Tạo booking — lưu label ghế y như DB (có thể là "1", "A1", ...)
      const seatLabels = willBookDocs.map((d) => d.seat_number);
      const [booking] = await Booking.create(
        [
          {
            trip: trip._id,
            start_time: trip.start_time,
            end_time: trip.end_time || null,
            seat_numbers: seatLabels,
            passenger: passenger || null,
            total_amount: computedTotal,
            status: 'paid',
            route_snapshot: {
              from: trip.route?.from_city || '',
              to: trip.route?.to_city || '',
              estimated_duration_min: trip.route?.estimated_duration_min || null
            },
            bus_snapshot: {
              bus_type: trip.bus?.bus_type || '',
              license_plate: trip.bus?.license_plate || '',
              seat_count: trip.bus?.seat_count || 0
            }
          }
        ],
        { session }
      );

      // 8) Tạo payment
      const [payment] = await Payment.create(
        [
          {
            booking: booking._id,
            method: paymentMethod || 'banking',
            amount: computedTotal,
            transaction_code: `TX${Date.now()}`,
            status: 'success',
            paid_at: new Date()
          }
        ],
        { session }
      );

      // Link payment vào booking (nếu schema có field)
      booking.payment = payment._id;
      booking.payment_id = payment._id;
      await booking.save({ session });

      // 9) Cập nhật trạng thái ghế theo _id (an toàn nhất)
      const idsToUpdate = willBookDocs.map((d) => d._id);
      await TripSeatStatus.updateMany(
        { _id: { $in: idsToUpdate } },
        { $set: { status: 'booked', booking_id: booking._id, updated_at: new Date() } },
        { session }
      );

      // 10) Trả payload cho FE (seats trả về dạng SỐ cho UI)
      res.json({
        bookingId: String(booking._id),
        paymentId: String(payment._id),
        route: {
          from: booking.route_snapshot.from,
          to: booking.route_snapshot.to,
          durationMin: booking.route_snapshot.estimated_duration_min
        },
        times: { departureTime: booking.start_time, arrivalTime: booking.end_time },
        bus: { busType: booking.bus_snapshot.bus_type, seatCount: booking.bus_snapshot.seat_count },
        seats: requestedNums, // FE hiển thị số
        passenger: booking.passenger || null,
        pricePerSeat,
        totalAmount: computedTotal,
        paymentMethod: payment.method
      });
    });
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
    const q = userId ? { user: userId } : phone ? { 'passenger.phone': phone } : {};
    const docs = await Booking.find(q).sort({ createdAt: -1 });
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

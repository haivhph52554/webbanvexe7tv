// controllers/bookingController.js
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Trip = require('../models/Trip');
const TripSeatStatus = require('../models/TripSeatStatus');
const nodemailer = require('nodemailer');
const generateTicketImage = require('../utils/generateTicketImage');

const normalizeToNumber = (v) => {
  const num = parseInt(String(v).replace(/\D/g, ''), 10);
  return Number.isNaN(num) ? null : num;
};

async function sendBookingEmail(booking) {
  // Support multiple env variable names for convenience and backwards compatibility
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
  const secure = (process.env.SMTP_SECURE === 'true') || (String(port) === '465');
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || '';
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || user;

  if (!user || !pass) {
    console.warn('Email credentials not configured (SMTP_USER/SMTP_PASS or EMAIL_USER/EMAIL_PASS). Skipping email send.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  const passenger = booking.passenger || {};
  const to = passenger.email;
  if (!to) {
    console.warn('No passenger email provided; skipping booking email for booking', String(booking._id));
    return;
  }

  const subject = `Xác nhận vé - Mã đặt chỗ ${booking._id}`;
  const seats = (booking.seat_numbers || []).join(', ');
  const price = booking.total_price || booking.total_amount || 0;
  const dep = booking.start_time ? new Date(booking.start_time).toLocaleString('vi-VN') : '-';
  const route = booking.route_snapshot ? `${booking.route_snapshot.from} → ${booking.route_snapshot.to}` : '';

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #111;">
      <p>Xin chào ${passenger.name || ''},</p>
      <p>Cảm ơn bạn đã đặt vé. Thông tin đơn hàng của bạn:</p>
      <ul>
        <li><strong>Mã đặt chỗ:</strong> ${booking._id}</li>
        <li><strong>Tuyến:</strong> ${route}</li>
        <li><strong>Khởi hành:</strong> ${dep}</li>
        <li><strong>Ghế:</strong> ${seats}</li>
        <li><strong>Tổng:</strong> ${price.toLocaleString('vi-VN')}₫</li>
      </ul>
      ${passenger.note ? `<p><strong>Ghi chú:</strong> ${passenger.note}</p>` : ''}
      <p>Xin vui lòng lưu email này để đối chiếu khi lên xe.</p>
      <p>Trân trọng,<br/>VeXe7TV</p>
    </div>
  `;

  try {
    await transporter.sendMail({ from, to, subject, html });
    console.info('Booking email sent to', to);
  } catch (err) {
    console.warn('Failed to send booking email', err?.message || err);
  }
}

exports.checkout = async (req, res) => {
  // Detect whether the MongoDB deployment supports transactions (replica set or mongos).
  // On standalone servers, transactions are not supported and creating a session may cause "Transaction numbers are only allowed" errors.
  let session = null;
  let useTransaction = false;
  try {
    const admin = mongoose.connection.db.admin();
    // ismaster works across server versions; newer servers support 'hello'
    const info = await admin.command({ ismaster: 1 }).catch(() => null);
    // If setName exists → replica set. If msg === 'isdbgrid' → mongos (sharded)
    const supportsTxn = info && (info.setName || info.msg === 'isdbgrid');
    if (supportsTxn) {
      session = await mongoose.startSession();
      try {
        await session.startTransaction();
        useTransaction = true;
      } catch (e) {
        useTransaction = false;
        console.warn('Transactions not available despite replica-set response, falling back.');
      }
    } else {
      useTransaction = false;
      // no session created — run non-transactional
    }
  } catch (e) {
    useTransaction = false;
    session = null;
  }

  const opts = (extra = {}) => (useTransaction && session ? { session, ...extra } : extra);

  try {
    const { tripId, seatNumbers, passenger, paymentMethod, amount } = req.body;

    if (!tripId || !Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      return res.status(400).json({ error: 'Thiếu tripId hoặc seatNumbers' });
    }

    // 1) Lấy trip + tham chiếu bus/route
    const tripQuery = Trip.findById(tripId).populate('route').populate('bus');
    if (useTransaction) tripQuery.session(session);
    const trip = await tripQuery;
    if (!trip) throw new Error('Trip không tồn tại');

    const seatCount = trip.bus?.seat_count || 0;
    if (!seatCount) throw new Error('Chuyến chưa có seat_count của bus');

    // 2) Chuẩn hoá danh sách ghế người dùng chọn (có thể là '1', 1, hoặc 'A1')
    const requestedRaw = (seatNumbers || []).map((s) => String(s || '').trim()).filter((s) => s.length > 0);
    if (!requestedRaw.length) throw new Error('Thiếu seatNumbers');

    // 3) Lấy ghế hiện có của trip
    const seatDocsQuery = TripSeatStatus.find({ trip: trip._id });
    if (useTransaction) seatDocsQuery.session(session);
    let allSeatDocs = await seatDocsQuery;

    // 3a) Nếu CHƯA có ghế nào => seed toàn bộ 1..seat_count
    if (allSeatDocs.length === 0) {
      const seedDocs = [];
      for (let i = 1; i <= seatCount; i++) {
        seedDocs.push({ trip: trip._id, seat_number: String(i), status: 'available', booking_id: null });
      }
      await TripSeatStatus.insertMany(seedDocs, opts());
      const reloadQuery = TripSeatStatus.find({ trip: trip._id });
      if (useTransaction) reloadQuery.session(session);
      allSeatDocs = await reloadQuery;
    }

    // 3b) Build lookups: by exact label and by numeric value
    const seatByLabel = new Map();
    const seatByNum = new Map();
    for (const s of allSeatDocs) {
      const label = String(s.seat_number).trim().toLowerCase();
      if (!seatByLabel.has(label)) seatByLabel.set(label, s);
      const n = normalizeToNumber(s.seat_number);
      if (n != null && !seatByNum.has(n)) seatByNum.set(n, s);
    }

    // 3c) Resolve requested seats to docs: prefer exact label match, else numeric match
    const willBookDocs = [];
    const missingNumsToCreate = [];
    for (const raw of requestedRaw) {
      const rawLower = raw.toLowerCase();
      let doc = seatByLabel.get(rawLower);
      if (!doc) {
        const n = normalizeToNumber(raw);
        if (n != null) doc = seatByNum.get(n);
      }

      if (!doc) {
        const n = normalizeToNumber(raw);
        if (n != null) {
          if (n < 1 || n > seatCount) throw new Error('Số ghế vượt quá seat_count của xe');
          if (!missingNumsToCreate.includes(n)) missingNumsToCreate.push(n);
        } else {
          throw new Error('Một số ghế không tồn tại trong chuyến');
        }
      } else {
        willBookDocs.push(doc);
      }
    }

    // If needed, create missing numeric seat docs
    if (missingNumsToCreate.length) {
      const addDocs = missingNumsToCreate.map((n) => ({ trip: trip._id, seat_number: String(n), status: 'available', booking_id: null }));
      await TripSeatStatus.insertMany(addDocs, opts());
      const freshQuery = TripSeatStatus.find({ trip: trip._id, seat_number: { $in: missingNumsToCreate.map(String) } });
      if (useTransaction) freshQuery.session(session);
      const fresh = await freshQuery;
      for (const s of fresh) {
        const label = String(s.seat_number).trim().toLowerCase();
        const n = normalizeToNumber(s.seat_number);
        if (!seatByLabel.has(label)) seatByLabel.set(label, s);
        if (n != null && !seatByNum.has(n)) seatByNum.set(n, s);
        if (n != null && missingNumsToCreate.includes(n)) willBookDocs.push(s);
      }
    }

    if (willBookDocs.some((d) => !d)) throw new Error('Một số ghế không tồn tại trong chuyến');
    if (willBookDocs.some((d) => d.status !== 'available')) throw new Error('Có ghế đã được giữ/đặt');

    // 6) Tính tiền ở server — hỗ trợ giá linh hoạt theo đoạn nếu client gửi fromStop/toStop
    // passenger có thể chứa fromStop và toStop (là stop_name hoặc stop id)
    let pricePerSeat = trip.base_price || 0;
    let computedTotal = pricePerSeat * willBookDocs.length;

    if (passenger && passenger.fromStop && passenger.toStop) {
      // fetch stops for this route
      const RouteStop = require('../models/RouteStop');
      const stops = await RouteStop.find({ route: trip.route._id }).lean();

      const findKm = (v) => {
        if (!v) return null;
        const byId = stops.find(s => String(s._id) === String(v));
        if (byId) return byId.km_from_start;
        const byName = stops.find(s => (s.stop_name || '').toLowerCase() === String(v).toLowerCase());
        if (byName) return byName.km_from_start;
        return null;
      };

      const kmFrom = findKm(passenger.fromStop);
      const kmTo = findKm(passenger.toStop);

      if (kmFrom != null && kmTo != null && kmTo > kmFrom) {
        const routeDistance = trip.route.total_distance_km || (kmTo - kmFrom);
        const segmentKm = kmTo - kmFrom;
        // price scales linearly by distance proportion
        const factor = segmentKm / Math.max(routeDistance, 1);
        pricePerSeat = Math.round((trip.base_price || 0) * factor);
        computedTotal = pricePerSeat * willBookDocs.length;
      }
    }

    // 7) Tạo booking
    const seatLabels = willBookDocs.map((d) => d.seat_number);
    const [booking] = await Booking.create([
      {
        trip: trip._id,
        start_time: trip.start_time,
        end_time: trip.end_time || null,
        seat_numbers: seatLabels,
        passenger: passenger || null,
        total_amount: computedTotal,
        total_price: computedTotal,
        status: 'paid',
        route_snapshot: {
          from: trip.route?.from_city || '',
          to: trip.route?.to_city || '',
          estimated_duration_min: trip.route?.estimated_duration_min || null
        },
        bus_snapshot: { bus_type: trip.bus?.bus_type || '', license_plate: trip.bus?.license_plate || '', seat_count: trip.bus?.seat_count || 0 }
      }
    ], useTransaction ? { session } : {});

    // 8) Tạo payment
    const [payment] = await Payment.create([
      { booking: booking._id, method: paymentMethod || 'banking', amount: computedTotal, transaction_code: `TX${Date.now()}`, status: 'success', paid_at: new Date() }
    ], useTransaction ? { session } : {});

    booking.payment = payment._id;
    booking.payment_id = payment._id;
    await booking.save(useTransaction ? { session } : {});

    // 9) Cập nhật trạng thái ghế theo _id
    const idsToUpdate = willBookDocs.map((d) => d._id);
    await TripSeatStatus.updateMany({ _id: { $in: idsToUpdate } }, { $set: { status: 'booked', booking_id: booking._id, updated_at: new Date() } }, useTransaction ? { session } : {});

    // Commit if using transaction
    if (useTransaction) await session.commitTransaction();

    // 10) Trả payload cho FE
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
      seats: requestedRaw.map(s => { const n = normalizeToNumber(s); return n != null ? n : s; }),
      passenger: booking.passenger || null,
      pricePerSeat,
      totalAmount: computedTotal,
      paymentMethod: payment.method
    });

    // Send booking confirmation email
    if (booking.status === 'paid' || booking.status === 'confirmed') {
      sendBookingEmail(booking);
    }
  } catch (err) {
    try { if (useTransaction) await session.abortTransaction(); } catch (e) {}
    console.error('Checkout error:', err);
    res.status(400).json({ error: err.message || 'Checkout failed' });
  } finally {
    if (session) session.endSession();
  }
 }

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

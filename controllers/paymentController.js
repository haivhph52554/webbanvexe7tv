const Payment = require('../models/Payment');
const Booking = require('../models/Booking');

// GET /api/payments
exports.getAllPayments = async (req, res) => {
  try {
    // ✅ populate 'booking' (không phải 'ticketId')
    const payments = await Payment.find().populate('booking');
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/payments
// Lưu ý: trong luồng “checkout” bạn đã tạo Payment trong bookingController.
// Hàm này chỉ dùng khi bạn muốn tự tạo payment rời (ít dùng).
exports.createPayment = async (req, res) => {
  try {
    const { booking, user, method = 'banking', amount, transaction_code, status = 'success' } = req.body;

    if (!booking) return res.status(400).json({ error: 'Thiếu booking' });
    if (!amount)  return res.status(400).json({ error: 'Thiếu amount' });

    const existedBooking = await Booking.findById(booking);
    if (!existedBooking) return res.status(404).json({ error: 'Booking không tồn tại' });

    // Tạo paymentId duy nhất để không bị E11000 nếu có unique index
    const paymentId = `PAY${Date.now()}${Math.floor(Math.random() * 1e6)}`;

    const doc = await Payment.create({
      booking,
      user: user || existedBooking.user || null,
      method,
      amount,
      transaction_code: transaction_code || `TX${Date.now()}`,
      status,
      paymentId,               // ✅ luôn set để tránh null
      paid_at: new Date(),
    });

    // (tuỳ chọn) nếu Booking schema có field payment/payment_id, bạn có thể link vào:
    // existedBooking.payment = doc._id;
    // existedBooking.payment_id = doc._id;
    // await existedBooking.save();

    res.status(201).json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

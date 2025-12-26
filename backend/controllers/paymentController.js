const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const { createPaymentUrl, processReturn } = require('../utils/vnpay');

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

// GET /api/payments/:id
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('booking');
    if (!payment) {
      return res.status(404).json({ error: 'Payment không tồn tại' });
    }
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/payments
// Lưu ý: trong luồng "checkout" bạn đã tạo Payment trong bookingController.
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

// POST /api/payments/create-vnpay-url
// Tạo URL thanh toán VNPay
exports.createVnpayUrl = async (req, res) => {
  try {
    const { bookingId, amount, orderDescription } = req.body;

    if (!bookingId || !amount) {
      return res.status(400).json({ error: 'Thiếu bookingId hoặc amount' });
    }

    // Kiểm tra booking có tồn tại không
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking không tồn tại' });
    }

    // Kiểm tra payment đã tồn tại chưa
    let payment = await Payment.findOne({ booking: bookingId });
    
    if (!payment) {
      // Tạo payment mới nếu chưa có
      const paymentId = `PAY${Date.now()}${Math.floor(Math.random() * 1e6)}`;
      payment = await Payment.create({
        booking: bookingId,
        user: booking.user || null,
        method: 'vnpay',
        amount: amount,
        status: 'pending',
        paymentId,
        payment_gateway: 'vnpay',
      });

      // Link payment vào booking
      booking.payment = payment._id;
      booking.payment_id = payment._id;
      await booking.save();
    } else {
      // Cập nhật payment nếu đã có
      payment.method = 'vnpay';
      payment.amount = amount;
      payment.status = 'pending';
      payment.payment_gateway = 'vnpay';
      await payment.save();
    }

    // Tạo orderId từ bookingId (dùng bookingId làm orderId để dễ tìm lại)
    const orderId = String(bookingId);

    // Lấy IP của client
    const ipAddr = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
                   '127.0.0.1';

    // Tạo URL thanh toán VNPay
    const paymentUrl = createPaymentUrl({
      orderId: orderId,
      amount: amount,
      orderDescription: orderDescription || `Thanh toan ve xe - Booking ${bookingId}`,
      ipAddr: ipAddr,
    });

    // Lưu payment_url và order_id vào payment
    payment.payment_url = paymentUrl;
    payment.order_id = orderId;
    await payment.save();

    res.json({
      success: true,
      paymentUrl,
      paymentId: payment._id,
      orderId,
    });
  } catch (err) {
    console.error('Error creating VNPay URL:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/payments/vnpay-return
// Xử lý callback từ VNPay
exports.vnpayReturn = async (req, res) => {
  try {
    const vnp_Params = req.query;
    
    // Xử lý kết quả thanh toán
    const result = processReturn(vnp_Params);

    if (result.success) {
      // Tìm payment theo orderId (vnp_TxnRef)
      const orderId = vnp_Params['vnp_TxnRef'];
      
      if (!orderId) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success?error=invalid_order`);
      }

      // Tìm payment theo order_id
      const payment = await Payment.findOne({ 
        order_id: orderId,
        status: 'pending',
        method: 'vnpay'
      }).populate('booking');

      if (!payment) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success?error=payment_not_found`);
      }

      // Cập nhật payment
      payment.status = 'success';
      payment.transaction_code = result.transactionNo;
      payment.transaction_no = result.transactionNo;
      payment.bank_code = result.bankCode;
      payment.response_code = result.responseCode;
      payment.paid_at = new Date();
      await payment.save();

      // Cập nhật booking
      const booking = payment.booking;
      if (booking) {
        booking.status = 'paid';
        await booking.save();
      }

      // Redirect về frontend với thông tin thành công
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success?success=true&bookingId=${booking._id}&paymentId=${payment._id}`);
    } else {
      // Thanh toán thất bại
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success?error=${encodeURIComponent(result.message)}`);
    }
  } catch (err) {
    console.error('Error processing VNPay return:', err);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success?error=server_error`);
  }
};

// POST /api/payments/vietqr-webhook
// Webhook từ VietQR để tự động xác nhận thanh toán khi có chuyển khoản
exports.vietqrWebhook = async (req, res) => {
  try {
    const { 
      accountNumber,      // Số tài khoản nhận
      amount,            // Số tiền
      content,           // Nội dung chuyển khoản (VEXE {bookingId})
      transactionDate,    // Ngày giao dịch
      reference,         // Mã tham chiếu
    } = req.body;

    // Kiểm tra số tài khoản có đúng không
    const expectedAccount = process.env.BANK_ACCOUNT || '8851715585';
    if (accountNumber !== expectedAccount) {
      return res.status(400).json({ error: 'Số tài khoản không khớp' });
    }

    // Parse nội dung chuyển khoản để lấy bookingId
    // Format: "VEXE {bookingId}" hoặc "VEXE{bookingId}"
    const contentMatch = content.match(/VEXE\s*([A-Z0-9]+)/i);
    if (!contentMatch) {
      return res.status(400).json({ error: 'Nội dung chuyển khoản không hợp lệ' });
    }

    const bookingIdFromContent = contentMatch[1];
    
    // Tìm booking theo ID (có thể là full ID hoặc short ID)
    let booking = await Booking.findById(bookingIdFromContent);
    
    // Nếu không tìm thấy, thử tìm theo short ID (8 ký tự đầu)
    if (!booking) {
      const bookings = await Booking.find({ 
        status: 'pending',
        total_amount: amount 
      });
      
      // Tìm booking có ID bắt đầu bằng bookingIdFromContent
      booking = bookings.find(b => 
        String(b._id).startsWith(bookingIdFromContent) || 
        String(b._id).substring(0, 8).toUpperCase() === bookingIdFromContent.toUpperCase()
      );
    }

    if (!booking) {
      console.log(`Booking not found for content: ${content}, amount: ${amount}`);
      return res.status(404).json({ error: 'Không tìm thấy booking tương ứng' });
    }

    // Kiểm tra số tiền có khớp không (cho phép sai lệch nhỏ)
    const amountDiff = Math.abs(booking.total_amount - amount);
    if (amountDiff > 1000) { // Cho phép sai lệch tối đa 1000 VND
      console.log(`Amount mismatch: booking=${booking.total_amount}, received=${amount}`);
      return res.status(400).json({ error: 'Số tiền không khớp' });
    }

    // Tìm payment tương ứng
    let payment = await Payment.findOne({ 
      booking: booking._id,
      status: 'pending',
      method: { $in: ['banking', 'momo'] }
    });

    if (!payment) {
      // Tạo payment mới nếu chưa có
      const paymentId = `PAY${Date.now()}${Math.floor(Math.random() * 1e6)}`;
      payment = await Payment.create({
        booking: booking._id,
        user: booking.user || null,
        method: 'banking',
        amount: amount,
        transaction_code: reference || `TX${Date.now()}`,
        status: 'success',
        paymentId,
        paid_at: new Date(transactionDate || new Date()),
        bank_code: 'BIDV',
      });
    } else {
      // Cập nhật payment
      payment.status = 'success';
      payment.transaction_code = reference || payment.transaction_code || `TX${Date.now()}`;
      payment.paid_at = new Date(transactionDate || new Date());
      payment.bank_code = 'BIDV';
      await payment.save();
    }

    // Cập nhật booking
    booking.status = 'paid';
    await booking.save();

    console.log(`Payment confirmed automatically for booking ${booking._id}, amount: ${amount}`);

    res.json({ 
      success: true, 
      message: 'Thanh toán đã được xác nhận tự động',
      bookingId: booking._id,
      paymentId: payment._id
    });
  } catch (err) {
    console.error('Error processing VietQR webhook:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/payments/confirm-banking
// API để xác nhận thanh toán thủ công (nếu webhook không hoạt động)
exports.confirmBankingPayment = async (req, res) => {
  try {
    const { bookingId, transactionCode, amount } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: 'Thiếu bookingId' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking không tồn tại' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ error: 'Booking không ở trạng thái pending' });
    }

    // Tìm payment
    let payment = await Payment.findOne({ 
      booking: booking._id,
      status: 'pending',
      method: { $in: ['banking', 'momo'] }
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment không tồn tại' });
    }

    // Cập nhật payment
    payment.status = 'success';
    if (transactionCode) payment.transaction_code = transactionCode;
    if (amount) payment.amount = amount;
    payment.paid_at = new Date();
    await payment.save();

    // Cập nhật booking
    booking.status = 'paid';
    await booking.save();

    res.json({ 
      success: true, 
      message: 'Thanh toán đã được xác nhận',
      bookingId: booking._id,
      paymentId: payment._id
    });
  } catch (err) {
    console.error('Error confirming banking payment:', err);
    res.status(500).json({ error: err.message });
  }
};

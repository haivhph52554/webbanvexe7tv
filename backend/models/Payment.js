const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Ví dụ: 'momo' | 'banking' | 'cod' | 'vnpay'
    method: { type: String, enum: ['momo', 'banking', 'cod', 'vnpay'], required: true },

    amount: { type: Number, required: true },              // số tiền đã thanh toán
    transaction_code: { type: String },                    // mã giao dịch từ cổng thanh toán
    transaction_no: { type: String },                     // mã giao dịch VNPay (vnp_TransactionNo)
    bank_code: { type: String },                           // mã ngân hàng (vnp_BankCode)

    // Mã nội bộ của bạn, để đối soát. Đặt unique + sparse để không dính lỗi khi null.
    paymentId: { type: String, unique: true, sparse: true },

    status: { type: String, enum: ['success', 'failed', 'pending'], default: 'success' },
    paid_at: { type: Date, default: Date.now },
    
    // Thông tin bổ sung cho thanh toán online
    payment_url: { type: String },                         // URL thanh toán (nếu có)
    response_code: { type: String },                       // Mã phản hồi từ cổng thanh toán
    payment_gateway: { type: String },                     // Cổng thanh toán (vnpay, momo, etc.)
    order_id: { type: String },                            // Mã đơn hàng từ cổng thanh toán (vnp_TxnRef)
  },
  { collection: 'payments', timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);

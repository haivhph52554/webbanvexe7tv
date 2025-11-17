const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Ví dụ: 'momo' | 'banking' | 'cod'
    method: { type: String, enum: ['momo', 'banking', 'cod'], required: true },

    amount: { type: Number, required: true },              // số tiền đã thanh toán
    transaction_code: { type: String },                    // mã giao dịch từ cổng thanh toán

    // Mã nội bộ của bạn, để đối soát. Đặt unique + sparse để không dính lỗi khi null.
    paymentId: { type: String, unique: true, sparse: true },

    status: { type: String, enum: ['success', 'failed', 'pending'], default: 'success' },
    paid_at: { type: Date, default: Date.now },
  },
  { collection: 'payments', timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);

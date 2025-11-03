// models/Booking.js
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional nếu chưa đăng nhập
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },

  // Snapshot để FE hiển thị không cần populate nhiều
  route_snapshot: {
    from: String,
    to: String,
    estimated_duration_min: Number
  },
  bus_snapshot: {
    bus_type: String,
    license_plate: String,
    seat_count: Number
  },

  start_time: Date,
  end_time: Date,

  seat_numbers: [String],

  // giữ tương thích ngược lẫn tên mới
  total_amount: Number,
  total_price: Number,

  passenger: {
    name: String,
    phone: String,
    email: String,
    note: String
  },

  status: { type: String, enum: ['pending','paid','cancelled','completed'], default: 'pending' },

  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  payment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);

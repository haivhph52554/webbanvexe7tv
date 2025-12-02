const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  // Liên kết với bảng User để sau này làm chức năng đăng nhập
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Thông tin cá nhân
  name: { type: String, required: true },
  email: { 
    type: String, 
    required: true,
    unique: true, 
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email không hợp lệ']
  },
  phone: { 
    type: String, 
    required: true,
    match: [/^(0|84|\+84)[0-9]{9}$/, 'Số điện thoại không hợp lệ']
  },

  // Thông tin chuyên môn
  license_number: { type: String, required: true }, // Bắt buộc với tài xế
  experience_years: { type: Number, default: 0 },
  employee_id: { type: String },

  // Danh sách các chuyến được phân công (Để Admin xem lịch trình)
  assigned_trips: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip'
  }],

  // Trạng thái tài xế
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema);
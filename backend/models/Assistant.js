const mongoose = require('mongoose');

const assistantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Vui lòng nhập họ tên']
  },
  email: {
    type: String,
    required: [true, 'Vui lòng nhập email'],
    unique: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Vui lòng nhập email hợp lệ'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Vui lòng nhập số điện thoại'],
    match: [
      /^(0|84|\+84)[0-9]{9}$/,
      'Vui lòng nhập số điện thoại hợp lệ'
    ]
  },
  employee_id: {
    type: String,
    sparse: true
  },
  license_number: {
    type: String,
    sparse: true
  },
  experience_years: {
    type: Number,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  assigned_trips: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip'
  }],
  assigned_routes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route'
  }]
}, { 
  timestamps: true,
  collection: 'assistants' // Đảm bảo đọc từ collection 'assistants'
});

module.exports = mongoose.model('Assistant', assistantSchema);


const mongoose = require('mongoose');


const assistantSchema = new mongoose.Schema({
 
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  name: {
    type: String
  },
  email: {
    type: String,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Vui lòng nhập email hợp lệ']
  },
  phone: {
    type: String,
    match: [/^(0|84|\+84)[0-9]{9}$/, 'Vui lòng nhập số điện thoại hợp lệ']
  },

  // Admin-related fields
  employee_id: {
    type: String
  },
  license_number: {
    type: String
  },
  experience_years: {
    type: Number,
    min: 0,
    default: 0
  },

  // Assignment fields (kept from older admin UI)
  assigned_trips: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip'
  }],
  assigned_routes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route'
  }],

  // Operational fields used by assistant controller
  busId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus'
  },
  currentTrip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip'
  },
  checkInList: [{
    passengerId: mongoose.Schema.Types.ObjectId,
    ticketId: mongoose.Schema.Types.ObjectId,
    checkedIn: Boolean,
    checkedInTime: Date
  }],

  // status -- include values used in different parts of app
  status: {
    type: String,
    enum: ['active', 'inactive', 'available', 'on_trip', 'off_duty'],
    default: 'available'
  },

  rating: {
    type: Number,
    default: 5,
    min: 1,
    max: 5
  },
  totalTrips: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'assistants'
});

module.exports = mongoose.model('Assistant', assistantSchema);

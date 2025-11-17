const mongoose = require('mongoose');

const assistantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  busId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus',
    required: true
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
  status: {
    type: String,
    enum: ['available', 'on_trip', 'off_duty'],
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
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Assistant', assistantSchema);
const mongoose = require('mongoose');

const checkinSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  assistant: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  checkin_time: Date,
  status: { type: String, enum: ['checked_in','no_show'] }
}, { timestamps: true });

module.exports = mongoose.model('Checkin', checkinSchema);

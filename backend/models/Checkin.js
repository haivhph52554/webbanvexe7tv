const mongoose = require('mongoose');

const checkinSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  assistant: { type: mongoose.Schema.Types.ObjectId, ref: 'Assistant' },
  checkin_time: Date,
  checkout_time: Date,
  status: { type: String, enum: ['checked_in','checked_out','no_show'] }
}, { timestamps: true });

module.exports = mongoose.model('Checkin', checkinSchema);

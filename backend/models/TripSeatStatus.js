const mongoose = require('mongoose');

const tripSeatStatusSchema = new mongoose.Schema({
  trip: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  seat_number: String,
  status: { type: String, enum: ['available','reserved','booked','checked_in'], default: 'available' },
  booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  expire_at: { type: Date, default: null }
}, { timestamps: true, collection: 'trip_seat_status' });

module.exports = mongoose.model('TripSeatStatus', tripSeatStatusSchema);

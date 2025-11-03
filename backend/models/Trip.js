const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  bus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  start_time: { type: Date, required: true },
  end_time: { type: Date },
  base_price: Number,
  direction: { type: String, enum: ['go','return'], default: 'go' },
  status: { type: String, enum: ['scheduled','departed','completed','cancelled'], default: 'scheduled' }
}, { timestamps: true });

module.exports = mongoose.model('Trip', tripSchema);

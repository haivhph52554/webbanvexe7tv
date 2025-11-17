const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  license_plate: { type: String, required: true, unique: true },
  bus_type: String,
  seat_count: Number,
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Bus', busSchema);

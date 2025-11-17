const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  from_city: String,
  to_city: String,
  total_distance_km: Number,
  estimated_duration_min: Number,
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Route', routeSchema);

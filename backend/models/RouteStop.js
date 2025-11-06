const mongoose = require('mongoose');

const routeStopSchema = new mongoose.Schema({
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  stop_name: String,
  order: Number,
  type: { type: String, enum: ['pickup','dropoff','both'], default: 'both' },
  km_from_start: { type: Number, default: null } // distance in km from route start
});

module.exports = mongoose.model('RouteStop', routeStopSchema, 'route_stops');

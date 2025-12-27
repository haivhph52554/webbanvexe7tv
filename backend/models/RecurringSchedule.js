const mongoose = require('mongoose');

const RecurringScheduleSchema = new mongoose.Schema({
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  bus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  frequency: { type: String, enum: ['daily','weekly'], default: 'daily' },
  daysOfWeek: [{ type: Number }], // 0 (Sun) - 6 (Sat) used when frequency is weekly
  timesOfDay: [{ type: String }], // array of 'HH:MM' strings
  start_date: { type: Date, required: true },
  end_date: { type: Date },
  active: { type: Boolean, default: true },
  base_price: { type: Number, default: 0 },
  lastGeneratedUntil: { type: Date }, // timestamp up to which trips have been generated
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RecurringSchedule', RecurringScheduleSchema);

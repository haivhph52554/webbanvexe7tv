const connectDB = require('../db');
const Booking = require('../models/Booking');

(async () => {
  try {
    await connectDB();
    console.log('Starting bookings migration...');

    const res = await Booking.updateMany(
      { $or: [{ total_price: { $exists: false } }, { total_price: null }] },
      [{ $set: { total_price: { $ifNull: ['$total_price', '$total_amount'] } } }]
    );

    console.log('Migration result:', res);
    console.log('Done.');
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
})();

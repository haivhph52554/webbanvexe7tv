/**
 * Script: reset_booking_seats.js
 * Usage: node reset_booking_seats.js <bookingId> [--cancel]
 * Example: node reset_booking_seats.js 693142ece6f5fb4e8a4a655a --cancel
 *
 * This script connects to the project's MongoDB (using ./db.js), finds the booking,
 * sets all TripSeatStatus documents with booking_id equal to the booking _id back to
 * status 'available' and clears booking_id. If --cancel is provided it also sets
 * booking.status = 'cancelled'.
 */

const connectDB = require('../db');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const TripSeatStatus = require('../models/TripSeatStatus');

async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) {
    console.error('Usage: node reset_booking_seats.js <bookingId> [--cancel]');
    process.exit(1);
  }
  const bookingId = args[0];
  const shouldCancel = args.includes('--cancel');

  try {
    await connectDB();
    console.log('Connected to DB');

    const booking = await Booking.findById(bookingId).lean();
    if (!booking) {
      console.error('Booking not found:', bookingId);
      process.exitCode = 2;
      return;
    }

    // Count affected seats
    const result = await TripSeatStatus.updateMany(
      { booking_id: mongoose.Types.ObjectId(bookingId) },
      { $set: { status: 'available', booking_id: null } }
    );

    console.log(`Updated TripSeatStatus matched=${result.matchedCount} modified=${result.modifiedCount}`);

    if (shouldCancel) {
      const updated = await Booking.findByIdAndUpdate(bookingId, { status: 'cancelled' }, { new: true });
      console.log('Booking status updated to cancelled for', String(updated._id));
    }

    console.log('Done.');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e && e.message ? e.message : e);
    process.exitCode = 3;
  } finally {
    try { await mongoose.disconnect(); } catch (e) {}
  }
}

main();

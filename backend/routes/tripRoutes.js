const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const Bus = require('../models/Bus');
const TripSeatStatus = require('../models/TripSeatStatus');

// Reserve seats for a short period
router.post('/:id/reserve', async (req, res) => {
  const { seatNumbers, ttlMinutes } = req.body || {};
  const tripId = req.params.id;
  if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) return res.status(400).json({ error: 'Thiếu seatNumbers' });
  const ttl = Number(ttlMinutes) || 5;
  try {
    const now = new Date();
    // clear expired first
    await TripSeatStatus.updateMany({ trip: tripId, status: 'reserved', expire_at: { $lte: now } }, { $set: { status: 'available', expire_at: null, booking_id: null } });

    // Try to reserve each seat if available
    const results = [];
    for (const raw of seatNumbers) {
      const sn = String(raw);
      const seat = await TripSeatStatus.findOne({ trip: tripId, seat_number: sn });
      if (!seat) {
        results.push({ seat: sn, ok: false, reason: 'not_found' });
        continue;
      }
      if (seat.status !== 'available') {
        results.push({ seat: sn, ok: false, reason: seat.status });
        continue;
      }
      seat.status = 'reserved';
      seat.expire_at = new Date(Date.now() + ttl * 60 * 1000);
      await seat.save();
      results.push({ seat: sn, ok: true });
    }
    res.json({ results, ttlMinutes: ttl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Release reserved seats
router.post('/:id/release', async (req, res) => {
  const { seatNumbers } = req.body || {};
  const tripId = req.params.id;
  if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) return res.status(400).json({ error: 'Thiếu seatNumbers' });
  try {
    const resu = await TripSeatStatus.updateMany({ trip: tripId, seat_number: { $in: seatNumbers.map(String) }, status: 'reserved' }, { $set: { status: 'available', expire_at: null, booking_id: null } });
    res.json({ modified: resu.modifiedCount || resu.nModified || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  const trips = await Trip.find().populate('route').populate('bus');
  res.json(trips);
});

router.post('/', async (req, res) => {
  try {
    const trip = await Trip.create(req.body);
    const bus = await Bus.findById(trip.bus);

    const seatCount = bus?.seat_count || 0;
    const seatDocs = [];

    for (let i = 1; i <= seatCount; i++) {
      seatDocs.push({ trip: trip._id, seat_number: String(i), status: 'available' });
    }

    if (seatDocs.length) await TripSeatStatus.insertMany(seatDocs);

    res.status(201).json(trip);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/trips/:id  → lấy chi tiết chuyến + trạng thái ghế
router.get('/:id', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('route')
      .populate('bus');

    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    // Lấy danh sách ghế
    // Clear expired reservations before returning
    const now = new Date();
    await TripSeatStatus.updateMany({ trip: trip._id, status: 'reserved', expire_at: { $lte: now } }, { $set: { status: 'available', expire_at: null, booking_id: null } });

    const seats = await TripSeatStatus.find({ trip: trip._id }).sort({ seat_number: 1 });

    res.json({ trip, seats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;

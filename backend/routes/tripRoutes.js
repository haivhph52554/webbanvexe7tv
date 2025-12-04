const express = require('express');
const router = express.Router();
const Trip = require('../models/Trip');
const Bus = require('../models/Bus');
const TripSeatStatus = require('../models/TripSeatStatus');
const RouteStop = require('../models/RouteStop');
const tripController = require('../controllers/tripController');


router.get('/route/:routeId', tripController.getTripsByRoute);
router.get('/:tripId/seats', tripController.getSeatsByTrip);

router.get('/', async (req, res) => {
  const trips = await Trip.find().populate('route').populate('bus').sort({ createdAt: -1 });
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

    // Lấy danh sách ghế hiện có
    let seats = await TripSeatStatus.find({ trip: trip._id }).sort({ seat_number: 1 });

    // Nếu chưa có ghế nào và trip có bus với seat_count, tự động tạo ghế
    if (seats.length === 0 && trip.bus && trip.bus.seat_count) {
      const seatCount = trip.bus.seat_count;
      const seatDocs = [];
      
      for (let i = 1; i <= seatCount; i++) {
        seatDocs.push({
          trip: trip._id,
          seat_number: String(i),
          status: 'available',
          booking_id: null
        });
      }

      if (seatDocs.length > 0) {
        await TripSeatStatus.insertMany(seatDocs);
        // Lấy lại danh sách ghế sau khi tạo
        seats = await TripSeatStatus.find({ trip: trip._id }).sort({ seat_number: 1 });
      }
    }

    // Lấy danh sách điểm dừng của tuyến
    const stops = trip.route && trip.route._id 
      ? await RouteStop.find({ route: trip.route._id }).sort({ order: 1 }).lean()
      : [];

    res.json({ trip, seats, stops });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;

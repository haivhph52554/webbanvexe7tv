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
  const trips = await Trip.find().populate('route').populate('bus').sort({ createdAt: -1 }).lean();

  // Attach assigned driver/assistant summary for each trip to avoid extra client calls
  const Driver = require('../models/Driver');
  const Assistant = require('../models/Assistant');

  const enhanced = await Promise.all(trips.map(async (trip) => {
    try {
      const assignedDriver = await Driver.findOne({ $or: [{ assigned_trips: trip._id }, { assigned_routes: trip.route?._id }] }).select('name phone license_number').lean();
      const assignedAssistant = await Assistant.findOne({ $or: [{ assigned_trips: trip._id }, { assigned_routes: trip.route?._id }] }).select('name phone').lean();
      return { ...trip, driver: assignedDriver || null, assistant: assignedAssistant || null };
    } catch (e) {
      return { ...trip, driver: null, assistant: null };
    }
  }));

  res.json(enhanced);
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

    // Tìm tài xế và lơ xe được gán (nếu có) để trả về cùng
    const Driver = require('../models/Driver');
    const Assistant = require('../models/Assistant');
    const assignedDriver = await Driver.findOne({ $or: [{ assigned_trips: trip._id }, { assigned_routes: trip.route?._id }] }).select('name phone license_number').lean();
    const assignedAssistant = await Assistant.findOne({ $or: [{ assigned_trips: trip._id }, { assigned_routes: trip.route?._id }] }).select('name phone').lean();

    // Lấy danh sách điểm dừng của tuyến
    const stops = trip.route && trip.route._id 
      ? await RouteStop.find({ route: trip.route._id }).sort({ order: 1 }).lean()
      : [];

    res.json({ trip, seats, stops, driver: assignedDriver || null, assistant: assignedAssistant || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// DELETE /api/trips/bulk-delete
router.delete('/bulk-delete', async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) {
      return res.status(400).json({ error: 'Thiếu ngày cần xoá' });
    }

    // ❌ Chặn xoá quá khứ (backend bảo vệ)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(date) < today) {
      return res.status(400).json({ error: 'Không thể xoá chuyến trong quá khứ' });
    }

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    // Lấy danh sách trip cần xoá
    const trips = await Trip.find({
      start_time: { $gte: start, $lte: end }
    }).select('_id');

    const tripIds = trips.map(t => t._id);

    if (tripIds.length === 0) {
      return res.json({ success: true, deletedTrips: 0 });
    }

    // Xoá ghế trước
    await TripSeatStatus.deleteMany({ trip: { $in: tripIds } });

    // Xoá chuyến
    const result = await Trip.deleteMany({ _id: { $in: tripIds } });

    res.json({
      success: true,
      deletedTrips: result.deletedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;

const mongoose = require('mongoose');
const Route = require('../models/Route');
const RouteStop = require('../models/RouteStop');
const Trip = require('../models/Trip');
const TripSeatStatus = require('../models/TripSeatStatus');
const Review = require('../models/Review');

/* =========================
   HELPER VALIDATE
========================= */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/* =========================
   GET /api/routes/detailed
========================= */
exports.getAllRoutesDetailed = async (req, res) => {
  try {
    const { date } = req.query;

    // Validate date nếu có
    let searchDate, nextDay;
    if (date) {
      searchDate = new Date(date);
      if (isNaN(searchDate.getTime())) {
        return res.status(400).json({ error: 'Ngày tìm kiếm không hợp lệ' });
      }
      nextDay = new Date(searchDate);
      nextDay.setDate(searchDate.getDate() + 1);
    }

    const routes = await Route.find().lean();
    if (!routes.length) return res.json([]);

    const routeIds = routes.map(r => r._id);

    const tripFilter = { route: { $in: routeIds } };
    if (date) {
      tripFilter.start_time = { $gte: searchDate, $lt: nextDay };
    }

    const trips = await Trip.find(tripFilter).populate('bus').lean();

    const tripsByRoute = {};
    trips.forEach(trip => {
      const key = trip.route.toString();
      if (!tripsByRoute[key]) tripsByRoute[key] = [];
      tripsByRoute[key].push(trip);
    });

    const tripIds = trips.map(t => t._id);
    const tripSeats = tripIds.length
      ? await TripSeatStatus.aggregate([
          { $match: { trip: { $in: tripIds } } },
          {
            $group: {
              _id: '$trip',
              availableSeats: {
                $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
              }
            }
          }
        ])
      : [];

    const seatsByTrip = {};
    tripSeats.forEach(s => (seatsByTrip[s._id] = s.availableSeats));

    const ratings = tripIds.length
      ? await Review.aggregate([
          { $match: { trip: { $in: tripIds } } },
          {
            $lookup: {
              from: 'trips',
              localField: 'trip',
              foreignField: '_id',
              as: 'trip'
            }
          },
          { $unwind: '$trip' },
          {
            $group: {
              _id: '$trip.route',
              avgRating: { $avg: '$rating' }
            }
          }
        ])
      : [];

    const ratingsByRoute = {};
    ratings.forEach(r => (ratingsByRoute[r._id] = r.avgRating));

    const detailedRoutes = routes
      .map(route => {
        const routeTrips = tripsByRoute[route._id.toString()] || [];
        routeTrips.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
        const nextTrip = routeTrips[0];

        if (!nextTrip) return null;

        return {
          _id: route._id,
          from_city: route.from_city,
          to_city: route.to_city,
          estimated_duration_min: route.estimated_duration_min,
          base_price: nextTrip.base_price,
          start_time: nextTrip.start_time,
          end_time: nextTrip.end_time,
          bus_type: nextTrip.bus?.bus_type,
          availableSeats: seatsByTrip[nextTrip._id] || 0,
          avgRating: ratingsByRoute[route._id] || 0,
          company: route.company,
          features: route.features || []
        };
      })
      .filter(Boolean);

    res.json(detailedRoutes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Lỗi server' });
  }
};

/* =========================
   POST /api/routes
========================= */
exports.createRoute = async (req, res) => {
  try {
    const { from_city, to_city, estimated_duration_min, company } = req.body;

    // VALIDATE
    if (!from_city || !to_city) {
      return res.status(400).json({ error: 'Điểm đi và điểm đến không được để trống' });
    }

    if (from_city === to_city) {
      return res.status(400).json({ error: 'Điểm đi và điểm đến không được trùng nhau' });
    }

    if (estimated_duration_min && estimated_duration_min <= 0) {
      return res.status(400).json({ error: 'Thời gian dự kiến phải > 0' });
    }

    const route = await Route.create(req.body);
    res.status(201).json(route);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/* =========================
   GET /api/routes
========================= */
exports.getAllRoutes = async (req, res) => {
  try {
    const routes = await Route.find();
    res.json(routes);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
};

/* =========================
   POST /api/routes/:routeId/stops
========================= */
exports.createStop = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { name, order } = req.body;

    if (!isValidObjectId(routeId)) {
      return res.status(400).json({ error: 'Route ID không hợp lệ' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Tên điểm dừng không được để trống' });
    }

    if (order < 0) {
      return res.status(400).json({ error: 'Thứ tự điểm dừng không hợp lệ' });
    }

    const stop = await RouteStop.create({ ...req.body, route: routeId });
    res.status(201).json(stop);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/* =========================
   GET /api/routes/:routeId/stops
========================= */
exports.getStops = async (req, res) => {
  try {
    const { routeId } = req.params;

    if (!isValidObjectId(routeId)) {
      return res.status(400).json({ error: 'Route ID không hợp lệ' });
    }

    const stops = await RouteStop.find({ route: routeId }).sort({ order: 1 });
    res.json(stops);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
};

/* =========================
   GET /api/routes/:routeId
========================= */
exports.getRouteDetail = async (req, res) => {
  try {
    const { routeId } = req.params;

    if (!isValidObjectId(routeId)) {
      return res.status(400).json({ error: 'Route ID không hợp lệ' });
    }

    const route = await Route.findById(routeId).lean();
    if (!route) {
      return res.status(404).json({ error: 'Không tìm thấy tuyến' });
    }

    const stops = await RouteStop.find({ route: routeId }).sort({ order: 1 }).lean();
    const trips = await Trip.find({ route: routeId }).populate('bus').lean();

    const tripsWithSeats = await Promise.all(
      trips.map(async trip => {
        const availableSeats = await TripSeatStatus.countDocuments({
          trip: trip._id,
          status: 'available'
        });

        return {
          _id: trip._id,
          start_time: trip.start_time,
          end_time: trip.end_time,
          base_price: trip.base_price,
          status: trip.status,
          direction: trip.direction,
          bus: trip.bus,
          availableSeats
        };
      })
    );

    let avgRating = null;
    const tripIds = trips.map(t => t._id);
    if (tripIds.length) {
      const ratingAgg = await Review.aggregate([
        { $match: { trip: { $in: tripIds } } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ]);
      avgRating = ratingAgg[0]?.avgRating || null;
    }

    res.json({ route, stops, trips: tripsWithSeats, avgRating });
  } catch (err) {
    res.status(500).json({ error: 'Lỗi server' });
  }
};

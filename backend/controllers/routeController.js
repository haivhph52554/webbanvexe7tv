// controllers/routeController.js
const Route = require('../models/Route');
const RouteStop = require('../models/RouteStop');
const Trip = require('../models/Trip');
const TripSeatStatus = require('../models/TripSeatStatus');
const Review = require('../models/Review');

// GET /api/routes/detailed
exports.getAllRoutesDetailed = async (req, res) => {
  try {
    // Get all routes
    const routes = await Route.find().lean();
    
    // Get all trips for all routes
    const routeIds = routes.map(r => r._id);
    const trips = await Trip.find({ route: { $in: routeIds } })
      .populate('bus')
      .lean();

    // Group trips by route
    const tripsByRoute = {};
    trips.forEach(trip => {
      if (!tripsByRoute[trip.route]) {
        tripsByRoute[trip.route] = [];
      }
      tripsByRoute[trip.route].push(trip);
    });

    // Get available seats for all trips
    const tripSeats = await TripSeatStatus.aggregate([
      { $match: { trip: { $in: trips.map(t => t._id) } } },
      { $group: { 
        _id: '$trip',
        availableSeats: { 
          $sum: { $cond: [{ $eq: ['$status', 'available'] }, 1, 0] }
        }
      }}
    ]);

    // Create seats lookup
    const seatsByTrip = {};
    tripSeats.forEach(ts => {
      seatsByTrip[ts._id] = ts.availableSeats;
    });

    // Get average ratings for all routes
    const ratings = await Review.aggregate([
      { $match: { trip: { $in: trips.map(t => t._id) } } },
      { $lookup: {
        from: 'trips',
        localField: 'trip',
        foreignField: '_id',
        as: 'trip'
      }},
      { $unwind: '$trip' },
      { $group: {
        _id: '$trip.route',
        avgRating: { $avg: '$rating' }
      }}
    ]);

    // Create ratings lookup
    const ratingsByRoute = {};
    ratings.forEach(r => {
      ratingsByRoute[r._id] = r.avgRating;
    });

    // Combine all data
    const detailedRoutes = routes.map(route => {
      const routeTrips = tripsByRoute[route._id] || [];
      // Sort trips by start time and get the soonest
      routeTrips.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
      const nextTrip = routeTrips[0];

      return {
        _id: route._id,
        from_city: route.from_city,
        to_city: route.to_city,
        estimated_duration_min: route.estimated_duration_min,
        base_price: nextTrip?.base_price,
        start_time: nextTrip?.start_time,
        end_time: nextTrip?.end_time,
        bus_type: nextTrip?.bus?.bus_type,
        availableSeats: nextTrip ? (seatsByTrip[nextTrip._id] || 0) : 0,
        avgRating: ratingsByRoute[route._id] || 0,
        company: route.company,
        features: route.features || []
      };
    });

    res.json(detailedRoutes);
  } catch (err) {
    console.error('Error in getAllRoutesDetailed:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/routes
exports.createRoute = async (req, res) => {
  try {
    const route = await Route.create(req.body);
    res.status(201).json(route);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET /api/routes
exports.getAllRoutes = async (req, res) => {
  try {
    const routes = await Route.find();
    res.json(routes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/routes/:routeId/stops
exports.createStop = async (req, res) => {
  try {
    const stop = await RouteStop.create({ ...req.body, route: req.params.routeId });
    res.status(201).json(stop);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET /api/routes/:routeId/stops
exports.getStops = async (req, res) => {
  try {
    const stops = await RouteStop.find({ route: req.params.routeId }).sort({ order: 1 });
    res.json(stops);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/routes/:routeId
// returns route document, stops, and a trips summary (with bus populated and availableSeats)
exports.getRouteDetail = async (req, res) => {
  try {
    const routeId = req.params.routeId;
    const route = await Route.findById(routeId).lean();
    if (!route) return res.status(404).json({ error: 'Route not found' });

    const stops = await RouteStop.find({ route: routeId }).sort({ order: 1 }).lean();

    // find trips for this route (returning scheduled/upcoming and departed)
    const trips = await Trip.find({ route: routeId }).populate('bus').lean();

    // for each trip compute available seats (count in TripSeatStatus)
    const tripsWithSeats = await Promise.all(
      trips.map(async (t) => {
        const availableSeats = await TripSeatStatus.countDocuments({ trip: t._id, status: 'available' });
        return {
          _id: t._id,
          start_time: t.start_time,
          end_time: t.end_time,
          base_price: t.base_price,
          status: t.status,
          direction: t.direction,
          bus: t.bus,
          availableSeats
        };
      })
    );

    // compute average rating from reviews of trips on this route
    let avgRating = null;
    const tripIds = trips.map(t => t._id);
    if (tripIds.length > 0) {
      const agg = await Review.aggregate([
        { $match: { trip: { $in: tripIds } } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ]);
      if (agg && agg.length) avgRating = agg[0].avgRating;
    }

    res.json({ route, stops, trips: tripsWithSeats, avgRating });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

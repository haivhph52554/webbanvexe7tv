// controllers/routeController.js
const Route = require('../models/Route');
const RouteStop = require('../models/RouteStop');

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

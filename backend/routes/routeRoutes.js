// routes/routeRoutes.js
const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');

// POST /api/routes  → tạo tuyến
router.post('/', routeController.createRoute);

// GET  /api/routes  → lấy tất cả tuyến (dùng cho "popular routes")
router.get('/', routeController.getAllRoutes);

// POST /api/routes/:routeId/stops → tạo điểm dừng cho tuyến
router.post('/:routeId/stops', routeController.createStop);

// GET  /api/routes/:routeId/stops → lấy điểm dừng theo tuyến (sort by order ASC)
router.get('/:routeId/stops', routeController.getStops);

module.exports = router;

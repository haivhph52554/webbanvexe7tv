// routes/routeRoutes.js
const express = require('express');
const router = express.Router();
const routeController = require('../controllers/routeController');

// POST /api/routes  → tạo tuyến
router.post('/', routeController.createRoute);

// GET  /api/routes  → lấy tất cả tuyến (dùng cho "popular routes")
router.get('/', routeController.getAllRoutes);

// GET  /api/routes/detailed  → lấy tất cả tuyến với thông tin chi tiết
router.get('/detailed', routeController.getAllRoutesDetailed);

// POST /api/routes/:routeId/stops → tạo điểm dừng cho tuyến
router.post('/:routeId/stops', routeController.createStop);

// GET  /api/routes/:routeId/stops → lấy điểm dừng theo tuyến (sort by order ASC)
router.get('/:routeId/stops', routeController.getStops);

// GET /api/routes/:routeId → chi tiết tuyến (route + stops + trips summary)
router.get('/:routeId', routeController.getRouteDetail);

module.exports = router;

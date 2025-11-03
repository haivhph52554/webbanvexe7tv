const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Trang admin dashboard
router.get('/', adminController.dashboard);
router.get('/users', adminController.users);
router.get('/buses', adminController.buses);
router.get('/routes', adminController.routes);
router.get('/trips', adminController.trips);
router.get('/bookings', adminController.bookings);
router.get('/statistics', adminController.statistics);

// API để xóa booking
router.delete('/bookings/:id', adminController.deleteBooking);

// API để xóa trip
router.delete('/trips/:id', adminController.deleteTrip);

// API để xóa user
router.delete('/users/:id', adminController.deleteUser);

// API để xóa bus
router.delete('/buses/:id', adminController.deleteBus);

// API để xóa route
router.delete('/routes/:id', adminController.deleteRoute);

// API để cập nhật status booking
router.put('/bookings/:id/status', adminController.updateBookingStatus);

module.exports = router;


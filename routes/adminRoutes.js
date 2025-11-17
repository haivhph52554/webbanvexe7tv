const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Trang admin dashboard
router.get('/', adminController.dashboard);
router.get('/users', adminController.users);
router.get('/buses', adminController.buses);
// Buses create/edit
router.get('/buses/new', adminController.newBus);
router.post('/buses', adminController.createBus);
router.get('/buses/:id/edit', adminController.editBus);
router.post('/buses/:id', adminController.updateBus);
router.get('/routes', adminController.routes);
// Routes create/edit
router.get('/routes/new', adminController.newRoute);
router.post('/routes', adminController.createRouteAdmin || adminController.createRoute);
router.get('/routes/:id/edit', adminController.editRoute);
router.post('/routes/:id', adminController.updateRoute);
// Trips create/edit (admin)
router.get('/trips/new', adminController.newTrip);
router.post('/trips', adminController.createTrip);
router.get('/trips/:id/edit', adminController.editTrip);
router.post('/trips/:id', adminController.updateTrip);
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


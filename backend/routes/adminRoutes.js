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
// Assistants create/edit
router.get('/assistants/new', adminController.newAssistant);
router.get('/assistants/:id/edit', adminController.editAssistant);
router.get('/assistants/:id', adminController.assistantDetail);
router.get('/assistants', adminController.assistants);
router.post('/assistants', adminController.createAssistant);
router.post('/assistants/:id', adminController.updateAssistant);

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

// API để xóa assistant
router.delete('/assistants/:id', adminController.deleteAssistant);

// API để check-in hành khách
router.post('/assistants/:id/checkin', adminController.checkinPassenger);

// API để cập nhật status booking
router.put('/bookings/:id/status', adminController.updateBookingStatus);

// --- QUẢN LÝ TÀI XẾ (DRIVER) ---
router.get('/drivers', adminController.drivers);           // Danh sách
router.get('/drivers/new', adminController.newDriver);     // Form tạo
router.post('/drivers', adminController.createDriver);     // Lưu mới
router.get('/drivers/:id', adminController.driverDetail);  // Xem chi tiết & Lịch trình (Quan trọng)
router.get('/drivers/:id/edit', adminController.editDriver); // Form sửa
router.post('/drivers/:id', adminController.updateDriver); // Lưu sửa
router.delete('/drivers/:id', adminController.deleteDriver); // Xóa

module.exports = router;

module.exports = router;


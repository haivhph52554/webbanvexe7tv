const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const ensureAuthUI = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer')) {
      token = authHeader.replace('Bearer ', '');
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }
    if (!token) return res.redirect('/admin/login');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.redirect('/admin/login');
    req.user = user;
    next();
  } catch (err) {
    return res.redirect('/admin/login');
  }
};

const requireRolesUI = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.redirect('/admin/login');
    if (!roles.includes(req.user.role)) return res.status(403).send('Không có quyền truy cập');
    next();
  };
};

// Trang admin dashboard
router.get('/login', adminController.adminLoginPage);
router.post('/login', adminController.adminLoginPost);
router.get('/logout', adminController.adminLogout);

router.get('/', ensureAuthUI, requireRolesUI('admin'), adminController.dashboard);
router.get('/users', ensureAuthUI, requireRolesUI('admin'), adminController.users);
router.get('/buses', ensureAuthUI, requireRolesUI('admin'), adminController.buses);
// Buses create/edit
router.get('/buses/new', ensureAuthUI, requireRolesUI('admin'), adminController.newBus);
router.post('/buses', ensureAuthUI, requireRolesUI('admin'), adminController.createBus);
router.get('/buses/:id/edit', ensureAuthUI, requireRolesUI('admin'), adminController.editBus);
router.post('/buses/:id', ensureAuthUI, requireRolesUI('admin'), adminController.updateBus);
router.get('/routes', ensureAuthUI, requireRolesUI('admin'), adminController.routes);
// Routes create/edit
router.get('/routes/new', ensureAuthUI, requireRolesUI('admin'), adminController.newRoute);
router.post('/routes', ensureAuthUI, requireRolesUI('admin'), adminController.createRouteAdmin || adminController.createRoute);
router.get('/routes/:id/edit', ensureAuthUI, requireRolesUI('admin'), adminController.editRoute);
router.post('/routes/:id', ensureAuthUI, requireRolesUI('admin'), adminController.updateRoute);
// Trips create/edit (admin)
router.get('/trips/new', ensureAuthUI, requireRolesUI('admin'), adminController.newTrip);
router.post('/trips', ensureAuthUI, requireRolesUI('admin'), adminController.createTrip);
router.post('/trips/recurring', ensureAuthUI, requireRolesUI('admin'), adminController.createRecurringTrips);
router.get('/trips/:id/edit', ensureAuthUI, requireRolesUI('admin'), adminController.editTrip);
router.post('/trips/:id', ensureAuthUI, requireRolesUI('admin'), adminController.updateTrip);
// Cập nhật trạng thái chuyến (cho admin và tài xế)
router.put('/trips/:id/status', ensureAuthUI, requireRolesUI('admin','driver'), adminController.updateTripStatus);
router.get('/trips', ensureAuthUI, requireRolesUI('admin'), adminController.trips);
router.get('/bookings', ensureAuthUI, requireRolesUI('admin'), adminController.bookings);
router.get('/statistics', ensureAuthUI, requireRolesUI('admin'), adminController.statistics);
// Assistants create/edit
router.get('/assistants/new', ensureAuthUI, requireRolesUI('admin'), adminController.newAssistant);
router.get('/assistants/:id/edit', ensureAuthUI, requireRolesUI('admin'), adminController.editAssistant);
router.get('/assistants/:id', ensureAuthUI, requireRolesUI('admin','assistant'), adminController.assistantDetail);
router.get('/assistants', ensureAuthUI, requireRolesUI('admin'), adminController.assistants);
router.post('/assistants', ensureAuthUI, requireRolesUI('admin'), adminController.createAssistant);
router.post('/assistants/:id', ensureAuthUI, requireRolesUI('admin'), adminController.updateAssistant);

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
router.get('/drivers', ensureAuthUI, requireRolesUI('admin'), adminController.drivers);
router.get('/drivers/new', ensureAuthUI, requireRolesUI('admin'), adminController.newDriver);
router.post('/drivers', ensureAuthUI, requireRolesUI('admin'), adminController.createDriver);
router.get('/drivers/:id', ensureAuthUI, requireRolesUI('admin','driver'), adminController.driverDetail);
router.get('/drivers/:id/edit', ensureAuthUI, requireRolesUI('admin'), adminController.editDriver);
router.post('/drivers/:id', ensureAuthUI, requireRolesUI('admin'), adminController.updateDriver);
router.delete('/drivers/:id', ensureAuthUI, requireRolesUI('admin'), adminController.deleteDriver);

// Bootstrap sample drivers & assistants

module.exports = router;

module.exports = router;


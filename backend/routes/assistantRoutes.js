const express = require('express');
const router = express.Router();
const assistantController = require('../controllers/assistantController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Các route này yêu cầu đăng nhập và phải là role 'assistant'
router.use(protect);
router.use(authorize('assistant'));

router.get('/my-trips', assistantController.getMyTrips);
router.get('/trip/:tripId/passengers', assistantController.getTripPassengers);
router.post('/checkin', assistantController.checkInPassenger);

module.exports = router;
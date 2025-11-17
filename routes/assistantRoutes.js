const express = require('express');
const router = express.Router();
const assistantController = require('../controllers/assistantController');
const authMiddleware = require('../middleware/authMiddleware');

// Tất cả route yêu cầu xác thực
router.use(authMiddleware);

router.get('/info', assistantController.getAssistantInfo);
router.get('/passengers', assistantController.getPassengerList);
router.post('/checkin', assistantController.checkInPassenger);
router.post('/report-seat', assistantController.reportSeatIssue);
router.post('/end-trip', assistantController.endTrip);
router.put('/rating', assistantController.updateRating);

module.exports = router;
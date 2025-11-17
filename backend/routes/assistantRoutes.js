// ...existing code...
const express = require('express');
const router = express.Router();
const assistantController = require('../controllers/assistantController');
const authMiddleware = require('../middleware/authMiddleware');

// đảm bảo authMiddleware là middleware function trước khi dùng
if (typeof authMiddleware === 'function') {
  router.use(authMiddleware);
} else if (authMiddleware && typeof authMiddleware.authenticate === 'function') {
  router.use(authMiddleware.authenticate);
} else if (authMiddleware && typeof authMiddleware.verifyToken === 'function') {
  router.use(authMiddleware.verifyToken);
} // nếu không tìm thấy function thì không đăng ký middleware (hoặc sửa middleware file)

// routes (tất cả yêu cầu xác thực nếu middleware được đăng ký)
router.get('/info', assistantController.getAssistantInfo);
router.get('/passengers', assistantController.getPassengerList);
router.post('/checkin', assistantController.checkInPassenger);
router.post('/report-seat', assistantController.reportSeatIssue);
router.post('/end-trip', assistantController.endTrip);
router.put('/rating', assistantController.updateRating);

module.exports = router;
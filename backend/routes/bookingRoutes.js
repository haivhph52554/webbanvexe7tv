// routes/bookingRoutes.js
const express = require('express');
const router = express.Router();

const bookingController = require('../controllers/bookingController');

// === Booking APIs ===

// FE bấm “Thanh toán” gọi endpoint này -> lưu Booking, Payment, cập nhật ghế
router.post('/checkout', bookingController.checkout);

// Lấy danh sách booking (tuỳ ý dùng cho “Vé của tôi” hoặc admin)
// - có thể truyền ?userId=... hoặc ?phone=... để lọc
router.get('/', bookingController.listOfUser);

// Lấy chi tiết 1 booking theo id
router.get('/:id', bookingController.detail);

module.exports = router;

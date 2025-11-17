// routes/bookingRoutes.js
const express = require('express');
const router = express.Router();

const bookingController = require('../controllers/bookingController');
const jwt = require("jsonwebtoken");
const User = require('../models/User');

// Middleware optional - nếu có token thì authenticate, không thì bỏ qua
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer")) {
      token = authHeader.replace("Bearer ", "");
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
      }
    }
  } catch (err) {
    // Ignore auth errors - continue without user
  }
  next();
};

// === Booking APIs ===

// FE bấm "Thanh toán" gọi endpoint này -> lưu Booking, Payment, cập nhật ghế
// Middleware optional - nếu có user đăng nhập thì gắn vào booking
router.post('/checkout', optionalAuth, bookingController.checkout);

// Lấy danh sách booking (tuỳ ý dùng cho "Vé của tôi" hoặc admin)
// - Nếu có user đăng nhập: tự động lấy bookings của user đó
// - Có thể truyền ?userId=... hoặc ?phone=... để lọc (cho admin)
router.get('/', optionalAuth, bookingController.listOfUser);

// Lấy chi tiết 1 booking theo id
router.get('/:id', bookingController.detail);

module.exports = router;

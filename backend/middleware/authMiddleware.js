const jwt = require("jsonwebtoken");
const User = require('../models/User');

// Middleware kiểm tra token
const protect = async (req, res, next) => {
  try {
    let token;

    // Check header
    const authHeader = req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer")) {
      token = authHeader.replace("Bearer ", "");
    } 
    // Check cookie
    else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: "Vui lòng đăng nhập để tiếp tục" });
    }

    // Xác thực token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: "Không tìm thấy người dùng" });
    }

    // Gán thông tin user vào request
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn!" });
  }
};

// Middleware kiểm tra role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Role ${req.user.role} không có quyền thực hiện thao tác này`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };

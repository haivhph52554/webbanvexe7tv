const jwt = require("jsonwebtoken");

// Middleware kiểm tra token
const authMiddleware = (req, res, next) => {
  try {
    // Lấy token từ header
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "Không có token, truy cập bị từ chối!" });
    }

    // Xác thực token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    req.user = decoded; // Gán thông tin user vào request
    next(); // Cho phép đi tiếp
  } catch (err) {
    res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn!" });
  }
};

module.exports = authMiddleware;

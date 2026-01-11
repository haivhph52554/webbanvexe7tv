require('dotenv').config();
const connectDB = require('../db');
const Route = require('../models/Route');
const RouteStop = require('../models/RouteStop');

(async () => {
  try {
    await connectDB();
    console.log('🔎 Tìm tuyến: Hà Nội - TP. Hồ Chí Minh');
    const route = await Route.findOne({ name: 'Hà Nội - TP. Hồ Chí Minh' });
    if (!route) {
      console.log('Không tìm thấy tuyến Hà Nội - TP. Hồ Chí Minh.');
      process.exit(0);
    }

    const stop = await RouteStop.findOne({ route: route._id, stop_name: 'Bến xe Vinh' });
    if (!stop) {
      console.log('Không tìm thấy điểm dừng Bến xe Vinh trên tuyến này.');
      process.exit(0);
    }

    if (stop.type === 'dropoff') {
      console.log('Điểm dừng Bến xe Vinh đã là điểm trả (dropoff). Không cần thay đổi.');
      process.exit(0);
    }

    stop.type = 'dropoff';
    await stop.save();
    console.log('✅ Đã cập nhật Bến xe Vinh thành điểm trả (dropoff).');
    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi cập nhật điểm dừng:', err);
    process.exit(1);
  }
})();

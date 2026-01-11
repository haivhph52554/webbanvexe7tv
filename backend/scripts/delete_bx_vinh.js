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

    await RouteStop.deleteOne({ _id: stop._id });
    console.log('✅ Đã xóa điểm dừng Bến xe Vinh.');

    // Sắp xếp lại order của các điểm còn lại
    const remaining = await RouteStop.find({ route: route._id }).sort('order');
    for (let i = 0; i < remaining.length; i++) {
      remaining[i].order = i + 1;
      await remaining[i].save();
    }
    console.log('✅ Đã cập nhật lại order cho các điểm dừng còn lại.');

    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi xóa điểm dừng:', err);
    process.exit(1);
  }
})();

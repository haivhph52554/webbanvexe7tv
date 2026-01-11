require('dotenv').config();
const connectDB = require('../db');
const Route = require('../models/Route');
const RouteStop = require('../models/RouteStop');

(async () => {
  try {
    await connectDB();
    console.log('🔎 Tìm tuyến: Thái Nguyên - Hà Nội');
    const route = await Route.findOne({ name: 'Thái Nguyên - Hà Nội' });
    if (!route) {
      console.log('Không tìm thấy tuyến Thái Nguyên - Hà Nội.');
      process.exit(0);
    }

    const stops = await RouteStop.find({ route: route._id }).sort('order');
    console.log(`Tìm thấy ${stops.length} điểm dừng trên tuyến.`);
    if (stops.length <= 2) {
      console.log('Đã có <=2 điểm dừng, không cần xóa.');
      process.exit(0);
    }

    const toDelete = stops.slice(1, -1).map(s => s._id);
    console.log(`Xóa ${toDelete.length} điểm dừng giữa...`);
    await RouteStop.deleteMany({ _id: { $in: toDelete } });

    // Cập nhật lại thứ tự cho hai điểm còn lại
    const remaining = await RouteStop.find({ route: route._id }).sort('order');
    if (remaining.length === 2) {
      remaining[0].order = 1;
      remaining[1].order = 2;
      await remaining[0].save();
      await remaining[1].save();
      console.log('Cập nhật lại order cho hai điểm dừng còn lại.');
    }

    console.log('✅ Hoàn tất xóa điểm dừng giữa cho tuyến Thái Nguyên - Hà Nội');
    process.exit(0);
  } catch (err) {
    console.error('Lỗi khi xóa điểm dừng giữa:', err);
    process.exit(1);
  }
})();

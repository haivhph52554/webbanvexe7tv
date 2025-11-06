require('dotenv').config();
const connectDB = require('./db');
const User = require('./models/User');
const Bus = require('./models/Bus');
const Route = require('./models/Route');
const RouteStop = require('./models/RouteStop');
const Trip = require('./models/Trip');
const Booking = require('./models/Booking');
const TripSeatStatus = require('./models/TripSeatStatus');

(async () => {
  try {
    await connectDB();
    
    console.log('🗑️  Xóa dữ liệu cũ...');
    await User.deleteMany();
    await Bus.deleteMany();
    await Route.deleteMany();
    await RouteStop.deleteMany();
    await Trip.deleteMany();
    await Booking.deleteMany();

    console.log('👥 Tạo users...');
    // Admin
    const admin = await User.create({ 
      name: 'Admin Hệ Thống', 
      phone: '0901111111', 
      email: 'admin@basevex.com', 
      password: 'admin123',
      role: 'admin'
    });

    // Customers
    const customer1 = await User.create({ 
      name: 'Nguyễn Văn An', 
      phone: '0901234567', 
      email: 'an@gmail.com', 
      password: 'password123',
      role: 'user' 
    });
    const customer2 = await User.create({ 
      name: 'Trần Thị Bình', 
      phone: '0912345678', 
      email: 'binh@gmail.com', 
      password: 'password123',
      role: 'user' 
    });
    const customer3 = await User.create({ 
      name: 'Lê Văn Cường', 
      phone: '0923456789', 
      email: 'cuong@gmail.com', 
      password: 'password123',
      role: 'user' 
    });

    // Drivers
    const driver1 = await User.create({ 
      name: 'Phạm Văn Đức', 
      phone: '0934567890', 
      email: 'duc.tx@gmail.com', 
      password: 'password123',
      role: 'user' 
    });
    const driver2 = await User.create({ 
      name: 'Hoàng Văn Hùng', 
      phone: '0945678901', 
      email: 'hung.tx@gmail.com', 
      password: 'password123',
      role: 'user' 
    });

    // Assistants
    const assistant1 = await User.create({ 
      name: 'Nguyễn Thị Lan', 
      phone: '0956789012', 
      email: 'lan.phuxe@gmail.com', 
      password: 'password123',
      role: 'user' 
    });
    const assistant2 = await User.create({ 
      name: 'Trần Thị Mai', 
      phone: '0967890123', 
      email: 'mai.phuxe@gmail.com', 
      password: 'password123',
      role: 'user' 
    });

    console.log('🚌 Tạo xe buýt...');
    const buses = [];
    buses.push(await Bus.create({ 
      license_plate: '29B-12345', 
      bus_type: 'Ghế ngồi 29 chỗ có điều hòa', 
      seat_count: 29,
      active: true
    }));
    buses.push(await Bus.create({ 
      license_plate: '29B-67890', 
      bus_type: 'Giường nằm 40 chỗ có điều hòa', 
      seat_count: 40,
      active: true
    }));
    buses.push(await Bus.create({ 
      license_plate: '29B-11111', 
      bus_type: 'Ghế ngồi 45 chỗ cao cấp', 
      seat_count: 45,
      active: true
    }));
    buses.push(await Bus.create({ 
      license_plate: '30B-22222', 
      bus_type: 'Giường nằm 32 chỗ VIP', 
      seat_count: 32,
      active: true
    }));

    console.log('📍 Tạo tuyến đường...');
    
    // Route 1: Thái Nguyên - Hà Nội
    const route1 = await Route.create({ 
      name: 'Thái Nguyên - Hà Nội', 
      from_city: 'Thái Nguyên', 
      to_city: 'Hà Nội', 
      total_distance_km: 80, 
      estimated_duration_min: 120,
      active: true
    });

    await RouteStop.create({ route: route1._id, stop_name: 'Bến xe Thái Nguyên', order: 1, type: 'pickup', km_from_start: 0 });
    await RouteStop.create({ route: route1._id, stop_name: 'Cầu Nhật Tân', order: 2, type: 'both', km_from_start: 40 });
    await RouteStop.create({ route: route1._id, stop_name: 'Bến xe Mỹ Đình', order: 3, type: 'dropoff', km_from_start: 80 });

    // Route 2: Hà Nội - Sài Gòn
    const route2 = await Route.create({ 
      name: 'Hà Nội - TP. Hồ Chí Minh', 
      from_city: 'Hà Nội', 
      to_city: 'TP. Hồ Chí Minh', 
      total_distance_km: 1700, 
      estimated_duration_min: 1440,
      active: true
    });

    await RouteStop.create({ route: route2._id, stop_name: 'Bến xe Mỹ Đình', order: 1, type: 'pickup', km_from_start: 0 });
    await RouteStop.create({ route: route2._id, stop_name: 'Bến xe Vinh', order: 2, type: 'both', km_from_start: 850 });
    await RouteStop.create({ route: route2._id, stop_name: 'Bến xe Nước Ngầm', order: 3, type: 'dropoff', km_from_start: 1700 });

    // Route 3: Hà Nội - Đà Nẵng
    const route3 = await Route.create({ 
      name: 'Hà Nội - Đà Nẵng', 
      from_city: 'Hà Nội', 
      to_city: 'Đà Nẵng', 
      total_distance_km: 760, 
      estimated_duration_min: 840,
      active: true
    });

    await RouteStop.create({ route: route3._id, stop_name: 'Bến xe Mỹ Đình', order: 1, type: 'pickup', km_from_start: 0 });
    await RouteStop.create({ route: route3._id, stop_name: 'Bến xe Huế', order: 2, type: 'both', km_from_start: 380 });
    await RouteStop.create({ route: route3._id, stop_name: 'Bến xe Đà Nẵng', order: 3, type: 'dropoff', km_from_start: 760 });

    console.log('🕐 Tạo chuyến xe...');
    const trips = [];
    
    // Trips for Route 1
    for (let i = 0; i < 3; i++) {
      const startTime = new Date();
      startTime.setDate(startTime.getDate() + i);
      startTime.setHours(8, 0, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setHours(10, 0, 0, 0);

      trips.push(await Trip.create({ 
        route: route1._id, 
        bus: buses[0]._id, 
        start_time: startTime, 
        end_time: endTime, 
        base_price: 100000, 
        direction: 'go',
        status: 'scheduled'
      }));

      const returnStartTime = new Date(startTime);
      returnStartTime.setHours(14, 0, 0, 0);
      const returnEndTime = new Date(returnStartTime);
      returnEndTime.setHours(16, 0, 0, 0);

      trips.push(await Trip.create({ 
        route: route1._id, 
        bus: buses[0]._id, 
        start_time: returnStartTime, 
        end_time: returnEndTime, 
        base_price: 100000, 
        direction: 'return',
        status: 'scheduled'
      }));
    }

    // Trips for Route 2
    const trip2Start = new Date();
    trip2Start.setDate(trip2Start.getDate() + 1);
    trip2Start.setHours(18, 0, 0, 0);
    const trip2End = new Date(trip2Start);
    trip2End.setDate(trip2End.getDate() + 2);
    trip2End.setHours(18, 0, 0, 0);

    trips.push(await Trip.create({ 
      route: route2._id, 
      bus: buses[1]._id, 
      start_time: trip2Start, 
      end_time: trip2End, 
      base_price: 500000, 
      direction: 'go',
      status: 'scheduled'
    }));

    // Trips for Route 3
    const trip3Start = new Date();
    trip3Start.setDate(trip3Start.getDate() + 1);
    trip3Start.setHours(20, 0, 0, 0);
    const trip3End = new Date(trip3Start);
    trip3End.setDate(trip3End.getDate() + 1);
    trip3End.setHours(8, 0, 0, 0);

    trips.push(await Trip.create({ 
      route: route3._id, 
      bus: buses[2]._id, 
      start_time: trip3Start, 
      end_time: trip3End, 
      base_price: 450000, 
      direction: 'go',
      status: 'scheduled'
    }));

    // Tạo TripSeatStatus cho mỗi chuyến để có dữ liệu số ghế trống
    console.log('💺 Tạo trạng thái ghế cho các chuyến...');
    for (const t of trips) {
      try {
        const bus = await Bus.findById(t.bus);
        const seatCount = bus?.seat_count || 0;
        const seatDocs = [];
        for (let i = 1; i <= seatCount; i++) {
          seatDocs.push({ trip: t._id, seat_number: String(i), status: 'available' });
        }
        if (seatDocs.length) await TripSeatStatus.insertMany(seatDocs);
      } catch (err) {
        console.error('Lỗi khi tạo TripSeatStatus cho trip', t._id, err);
      }
    }
    
    console.log('🎫 Tạo đặt chỗ...');
    // Create bookings
    await Booking.create({
      user: customer1._id,
      trip: trips[0]._id,
      seat_numbers: ['A1', 'A2'],
      total_price: 200000,
      status: 'paid'
    });

    await Booking.create({
      user: customer2._id,
      trip: trips[0]._id,
      seat_numbers: ['B3'],
      total_price: 100000,
      status: 'paid'
    });

    await Booking.create({
      user: customer3._id,
      trip: trips[2]._id,
      seat_numbers: ['C5', 'C6'],
      total_price: 200000,
      status: 'completed'
    });

    await Booking.create({
      user: customer1._id,
      trip: trips[5]._id,
      seat_numbers: ['A1', 'A2', 'A3'],
      total_price: 1500000,
      status: 'pending'
    });

    await Booking.create({
      user: customer2._id,
      trip: trips[6]._id,
      seat_numbers: ['D1', 'D2'],
      total_price: 900000,
      status: 'paid'
    });

    console.log('✅ Seed hoàn tất!');
    console.log(`- ${await User.countDocuments()} users`);
    console.log(`- ${await Bus.countDocuments()} buses`);
    console.log(`- ${await Route.countDocuments()} routes`);
    console.log(`- ${await Trip.countDocuments()} trips`);
    console.log(`- ${await Booking.countDocuments()} bookings`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi seed:', err);
    process.exit(1);
  }
})();

const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const Route = require('../models/Route');
const Bus = require('../models/Bus');
const User = require('../models/User');
const TripSeatStatus = require('../models/TripSeatStatus');

// --- Buses CRUD helpers for admin UI ---
exports.newBus = async (req, res) => {
  try {
    res.render('admin/bus_form', { bus: null, page: 'buses', errors: null });
  } catch (err) {
    console.error('Error rendering new bus form:', err);
    res.status(500).send('Lỗi khi tải form tạo xe: ' + err.message);
  }
};

exports.createBus = async (req, res) => {
  try {
    const payload = {
      license_plate: req.body.license_plate,
      bus_type: req.body.bus_type,
      seat_count: Number(req.body.seat_count) || 0,
      active: req.body.active === 'on'
    };
    await Bus.create(payload);
    res.redirect('/admin/buses');
  } catch (err) {
    console.error('Error creating bus:', err);
    res.status(500).send('Lỗi khi tạo xe: ' + err.message);
  }
};

exports.editBus = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);\
    if (!bus) return res.status(404).send('Xe không tồn tại');
    res.render('admin/bus_form', { bus, page: 'buses', errors: null });
  } catch (err) {
    console.error('Error rendering edit bus form:', err);
    res.status(500).send('Lỗi khi tải form sửa xe: ' + err.message);
  }
};

exports.updateBus = async (req, res) => {
  try {
    const payload = {
      license_plate: req.body.license_plate,
      bus_type: req.body.bus_type,
      seat_count: Number(req.body.seat_count) || 0,
      active: req.body.active === 'on'
    };
    await Bus.findByIdAndUpdate(req.params.id, payload);
    res.redirect('/admin/buses');
  } catch (err) {
    console.error('Error updating bus:', err);
    res.status(500).send('Lỗi khi cập nhật xe: ' + err.message);
  }
};

// --- Routes CRUD helpers for admin UI ---
exports.newRoute = async (req, res) => {
  try {
    res.render('admin/route_form', { route: null, page: 'routes', errors: null });
  } catch (err) {
    console.error('Error rendering new route form:', err);
    res.status(500).send('Lỗi khi tải form tạo tuyến: ' + err.message);
  }
};

exports.createRouteAdmin = async (req, res) => {
  try {
    const payload = {
      name: req.body.name,
      from_city: req.body.from_city,
      to_city: req.body.to_city,
      total_distance_km: Number(req.body.total_distance_km) || 0,
      estimated_duration_min: Number(req.body.estimated_duration_min) || 0,
      active: req.body.active === 'on'
    };
    await Route.create(payload);
    res.redirect('/admin/routes');
  } catch (err) {
    console.error('Error creating route:', err);
    res.status(500).send('Lỗi khi tạo tuyến: ' + err.message);
  }
};

exports.editRoute = async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) return res.status(404).send('Tuyến không tồn tại');
    res.render('admin/route_form', { route, page: 'routes', errors: null });
  } catch (err) {
    console.error('Error rendering edit route form:', err);
    res.status(500).send('Lỗi khi tải form sửa tuyến: ' + err.message);
  }
};

exports.updateRoute = async (req, res) => {
  try {
    const payload = {
      name: req.body.name,
      from_city: req.body.from_city,
      to_city: req.body.to_city,
      total_distance_km: Number(req.body.total_distance_km) || 0,
      estimated_duration_min: Number(req.body.estimated_duration_min) || 0,
      active: req.body.active === 'on'
    };
    await Route.findByIdAndUpdate(req.params.id, payload);
    res.redirect('/admin/routes');
  } catch (err) {
    console.error('Error updating route:', err);
    res.status(500).send('Lỗi khi cập nhật tuyến: ' + err.message);
  }
};


// Hiển thị admin dashboard
exports.dashboard = async (req, res) => {
  try {
    // Lấy tất cả trips với populate route và bus
    const trips = await Trip.find()
      .populate('route')
      .populate('bus')
      .sort({ start_time: -1 });

    // Lấy tất cả bookings với populate
    const bookings = await Booking.find()
      .populate('user')
      .populate('trip')
      .sort({ createdAt: -1 });

    // Tính toán thống kê
    const stats = {
      totalTrips: trips.length,
      totalBookings: bookings.length,
      completedBookings: bookings.filter(b => b.status === 'completed').length,
      pendingBookings: bookings.filter(b => b.status === 'pending').length,
      totalRevenue: bookings
        .filter(b => b.status === 'paid' || b.status === 'completed')
        .reduce((sum, b) => sum + (b.total_price || 0), 0)
    };

    res.render('admin/dashboard', {
      trips,
      bookings,
      stats,
      page: 'dashboard'
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).send('Lỗi khi tải trang admin: ' + err.message);
  }
};

// API endpoint để xóa booking
exports.deleteBooking = async (req, res) => {
  try {
    // Get the booking first to get the trip and seat info
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Không tìm thấy đơn đặt chỗ' });
    }

    // Check if booking has trip and seat information
    if (booking.trip && booking.seat_numbers && booking.seat_numbers.length > 0) {
      // Find all affected seat statuses
      const seatStatuses = await TripSeatStatus.find({
        trip: booking.trip,
        seat_number: { $in: booking.seat_numbers }
      });

      // Reset the seat statuses to available
      await TripSeatStatus.updateMany(
        {
          trip: booking.trip,
          seat_number: { $in: booking.seat_numbers }
        },
        {
          $set: {
            status: 'available',
            booking_id: null
          }
        }
      );

      console.log(`Reset ${seatStatuses.length} seats to available for booking ${booking._id}`);
    }

    // Delete the booking
    await Booking.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Đã xóa đặt chỗ và cập nhật trạng thái ghế thành công' });
  } catch (err) {
    console.error('Error deleting booking:', err);
    res.status(500).json({ error: 'Lỗi khi xóa đặt chỗ: ' + err.message });
  }
};

// API endpoint để xóa trip
exports.deleteTrip = async (req, res) => {
  try {
    await Trip.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Đã xóa chuyến xe thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// API endpoint để thay đổi status của booking
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Trang Users Management
exports.users = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    const stats = {
      total: users.length,
      customers: users.filter(u => u.role === 'customer').length,
      drivers: users.filter(u => u.role === 'driver').length,
      assistants: users.filter(u => u.role === 'assistant').length,
      admins: users.filter(u => u.role === 'admin').length
    };
    res.render('admin/users', { users, stats, page: 'users' });
  } catch (err) {
    console.error('Error loading users:', err);
    res.status(500).send('Lỗi khi tải trang users: ' + err.message);
  }
};

// Trang Buses Management
exports.buses = async (req, res) => {
  try {
    const buses = await Bus.find().sort({ createdAt: -1 });
    const stats = {
      total: buses.length,
      active: buses.filter(b => b.active).length,
      inactive: buses.filter(b => !b.active).length
    };
    res.render('admin/buses', { buses, stats, page: 'buses' });
  } catch (err) {
    console.error('Error loading buses:', err);
    res.status(500).send('Lỗi khi tải trang buses: ' + err.message);
  }
};

// Trang Routes Management
exports.routes = async (req, res) => {
  try {
    const RouteStop = require('../models/RouteStop');
    const routes = await Route.find().sort({ createdAt: -1 });
    
    // Get stops for each route
    for (let route of routes) {
      route.stops = await RouteStop.find({ route: route._id }).sort({ order: 1 });
    }
    
    const stats = {
      total: routes.length,
      active: routes.filter(r => r.active).length,
      inactive: routes.filter(r => !r.active).length
    };
    
    res.render('admin/routes', { routes, stats, page: 'routes' });
  } catch (err) {
    console.error('Error loading routes:', err);
    res.status(500).send('Lỗi khi tải trang routes: ' + err.message);
  }
};

// Trang Trips Management
exports.trips = async (req, res) => {
  try {
    const trips = await Trip.find()
      .populate('route')
      .populate('bus')
      .sort({ start_time: -1 });
    
    const stats = {
      total: trips.length,
      scheduled: trips.filter(t => t.status === 'scheduled').length,
      departed: trips.filter(t => t.status === 'departed').length,
      completed: trips.filter(t => t.status === 'completed').length
    };
    
    res.render('admin/trips', { trips, stats, page: 'trips' });
  } catch (err) {
    console.error('Error loading trips:', err);
    res.status(500).send('Lỗi khi tải trang trips: ' + err.message);
  }
};

// Trang Bookings Management
exports.bookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user')
      .populate('trip')
      .sort({ createdAt: -1 });
    
    const stats = {
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'pending').length,
      paid: bookings.filter(b => b.status === 'paid').length,
      completed: bookings.filter(b => b.status === 'completed').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
      totalRevenue: bookings
        .filter(b => b.status === 'paid' || b.status === 'completed')
        .reduce((sum, b) => sum + (b.total_price || 0), 0)
    };
    
    res.render('admin/bookings', { bookings, stats, page: 'bookings' });
  } catch (err) {
    console.error('Error loading bookings:', err);
    res.status(500).send('Lỗi khi tải trang bookings: ' + err.message);
  }
};

// Trang Statistics
exports.statistics = async (req, res) => {
  try {
    const users = await User.find();
    const trips = await Trip.find().populate('route').populate('bus');
    const bookings = await Booking.find().populate('user').populate('trip');
    const buses = await Bus.find();
    const routes = await Route.find();
    
    const stats = {
      users: {
        total: users.length,
        byRole: {
          customer: users.filter(u => u.role === 'customer').length,
          driver: users.filter(u => u.role === 'driver').length,
          assistant: users.filter(u => u.role === 'assistant').length,
          admin: users.filter(u => u.role === 'admin').length
        }
      },
      buses: {
        total: buses.length,
        active: buses.filter(b => b.active).length
      },
      routes: {
        total: routes.length,
        active: routes.filter(r => r.active).length
      },
      trips: {
        total: trips.length,
        byStatus: {
          scheduled: trips.filter(t => t.status === 'scheduled').length,
          departed: trips.filter(t => t.status === 'departed').length,
          completed: trips.filter(t => t.status === 'completed').length,
          cancelled: trips.filter(t => t.status === 'cancelled').length
        }
      },
      bookings: {
        total: bookings.length,
        byStatus: {
          pending: bookings.filter(b => b.status === 'pending').length,
          paid: bookings.filter(b => b.status === 'paid').length,
          completed: bookings.filter(b => b.status === 'completed').length,
          cancelled: bookings.filter(b => b.status === 'cancelled').length
        },
        revenue: bookings
          .filter(b => b.status === 'paid' || b.status === 'completed')
          .reduce((sum, b) => sum + (b.total_price || 0), 0)
      }
    };
    
    res.render('admin/statistics', { stats, page: 'statistics' });
  } catch (err) {
    console.error('Error loading statistics:', err);
    res.status(500).send('Lỗi khi tải trang statistics: ' + err.message);
  }
};

// API endpoints để xóa
exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Đã xóa user thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteBus = async (req, res) => {
  try {
    await Bus.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Đã xóa xe buýt thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteRoute = async (req, res) => {
  try {
    await Route.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Đã xóa tuyến đường thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- Trips CRUD helpers for admin UI ---
exports.newTrip = async (req, res) => {
  try {
    const routes = await Route.find().sort({ createdAt: -1 });
    const buses = await Bus.find().sort({ createdAt: -1 });
    res.render('admin/trip_form', { trip: null, routes, buses, page: 'trips', errors: null });
  } catch (err) {
    console.error('Error rendering new trip form:', err);
    res.status(500).send('Lỗi khi tải form tạo chuyến: ' + err.message);
  }
};

exports.createTrip = async (req, res) => {
  try {
    const payload = {
      route: req.body.route,
      bus: req.body.bus,
      start_time: req.body.start_time ? new Date(req.body.start_time) : null,
      end_time: req.body.end_time ? new Date(req.body.end_time) : null,
      base_price: Number(req.body.base_price) || 0,
      direction: req.body.direction || 'go',
      status: req.body.status || 'scheduled'
    };

    const trip = await Trip.create(payload);

    // create seats based on bus seat_count
    const bus = await Bus.findById(trip.bus);
    const seatCount = bus?.seat_count || 0;
    const seatDocs = [];
    for (let i = 1; i <= seatCount; i++) {
      seatDocs.push({ trip: trip._id, seat_number: String(i), status: 'available' });
    }
    if (seatDocs.length) await TripSeatStatus.insertMany(seatDocs);

    res.redirect('/admin/trips');
  } catch (err) {
    console.error('Error creating trip:', err);
    res.status(500).send('Lỗi khi tạo chuyến: ' + err.message);
  }
};

exports.editTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).send('Chuyến không tồn tại');
    const routes = await Route.find().sort({ createdAt: -1 });
    const buses = await Bus.find().sort({ createdAt: -1 });
    res.render('admin/trip_form', { trip, routes, buses, page: 'trips', errors: null });
  } catch (err) {
    console.error('Error rendering edit trip form:', err);
    res.status(500).send('Lỗi khi tải form sửa chuyến: ' + err.message);
  }
};

exports.updateTrip = async (req, res) => {
  try {
    const payload = {
      route: req.body.route,
      bus: req.body.bus,
      start_time: req.body.start_time ? new Date(req.body.start_time) : null,
      end_time: req.body.end_time ? new Date(req.body.end_time) : null,
      base_price: Number(req.body.base_price) || 0,
      direction: req.body.direction || 'go',
      status: req.body.status || 'scheduled'
    };

    await Trip.findByIdAndUpdate(req.params.id, payload);
    res.redirect('/admin/trips');
  } catch (err) {
    console.error('Error updating trip:', err);
    res.status(500).send('Lỗi khi cập nhật chuyến: ' + err.message);
  }
};


const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const Route = require('../models/Route');
const Bus = require('../models/Bus');
const User = require('../models/User');
assssâ

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
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Đã xóa đặt chỗ thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
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


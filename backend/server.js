require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const connectDB = require('./db');

// routes
const userRoutes = require('./routes/userRoutes');
const routeRoutes = require('./routes/routeRoutes');
const tripRoutes = require('./routes/tripRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true // allow cookies from cross-origin requests
}));

app.use(express.json());
app.use(cookieParser());
// parse application/x-www-form-urlencoded for form submissions from admin EJS
app.use(express.urlencoded({ extended: true }));

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// connect
connectDB();

// ✅ ép compile model đúng trước khi có file nào khác dùng
require('./models/RouteStop');        // collection: route_stops
require('./models/TripSeatStatus');   // collection: trip_seat_status

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/admin', adminRoutes);

app.get('/', (req, res) => res.send('Bus Booking API running'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

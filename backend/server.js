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
const assistantRoutes = require('./routes/assistantRoutes');
const vnpayRoutes = require('./routes/vnpayRoutes');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN ||
  'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json());
app.use(cookieParser());

app.use(express.urlencoded({ extended: true }));


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// connect
connectDB();


require('./models/RouteStop');        
require('./models/TripSeatStatus');   
// Contact model
const Contact = require('./models/Contact');

// Background jobs
const startCancelPendingBookings = require('./jobs/cancelPendingBookings');
const bookingTtlMinutes = parseInt(process.env.BOOKING_TTL_MINUTES || '2', 10);
const bookingCancelIntervalSeconds = parseInt(process.env.BOOKING_CANCEL_INTERVAL_SECONDS || '60', 10);
// Recurring trips generator
const startGenerateRecurringTrips = require('./jobs/generateRecurringTrips');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/vnpay', vnpayRoutes);


const crypto = require('crypto');
const { sendContactEmail } = require('./utils/mailer');
app.post('/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body || {};
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, error: 'Thiếu dữ liệu bắt buộc' });
    }

    // Tạo token công khai để khách có thể xem thread sau khi gửi
    const token = crypto.randomBytes(24).toString('hex');
    const tokenExpires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

    // Lưu contact vào DB trước
    const contact = new Contact({ name, email, phone, subject, message, publicToken: token, tokenExpires });
    await contact.save();

    // gửi email tới support (không block nếu lỗi gửi)
    try {
      const info = await sendContactEmail({
        fromName: name,
        fromEmail: email,
        fromPhone: phone,
        subject,
        message,
        to: process.env.SUPPORT_EMAIL || 'vexe7tv@gmail.com',
        contactId: contact._id,
        token
      });
      if (info && info.messageId) {
        contact.sent = true;
        contact.sentAt = new Date();
        contact.messageId = info.messageId;
      }
      await contact.save();
    } catch (sendErr) {
      console.error('Contact saved but mail send failed:', sendErr && sendErr.message ? sendErr.message : sendErr);
      contact.sendError = (sendErr && sendErr.message) ? sendErr.message : String(sendErr);
      await contact.save();
    }

    // trả về contactId và token cho frontend để khách truy cập trang xem
    return res.json({ success: true, message: 'Đã gửi liên hệ thành công', contactId: contact._id, token });
  } catch (err) {
    console.error('Error /contact:', err);
    return res.status(500).json({ success: false, error: 'Lỗi khi gửi liên hệ' });
  }
});

// Public endpoint: lấy contact theo id + token (dùng cho khách không đăng nhập)
app.get('/public/contacts/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const token = req.query.token;
    if (!id || !token) return res.status(400).json({ success: false, error: 'Missing id or token' });
    const contact = await Contact.findById(id).lean();
    if (!contact) return res.status(404).json({ success: false, error: 'Not found' });
    if (!contact.publicToken || contact.publicToken !== token) return res.status(403).json({ success: false, error: 'Invalid token' });
    if (contact.tokenExpires && new Date(contact.tokenExpires) < new Date()) return res.status(403).json({ success: false, error: 'Token expired' });

    // trả về thông tin cần thiết (loại trừ sendError nếu bạn muốn)
    return res.json({ success: true, contact: {
      _id: contact._id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      subject: contact.subject,
      message: contact.message,
      sent: contact.sent,
      sentAt: contact.sentAt,
      messageId: contact.messageId,
      replies: contact.replies || [],
      createdAt: contact.createdAt
    }});
  } catch (e) {
    console.error('Error GET /public/contacts/:id', e);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Public endpoint: mark contact as replied (clicked from support Gmail link)
app.get('/public/contacts/:id/mark-replied', async (req, res) => {
  try {
    const id = req.params.id;
    const token = req.query.token;
    if (!id || !token) return res.status(400).send('Missing id or token');
    const contact = await Contact.findById(id);
    if (!contact) return res.status(404).send('Not found');
    if (!contact.publicToken || contact.publicToken !== token) return res.status(403).send('Invalid token');
    if (contact.tokenExpires && new Date(contact.tokenExpires) < new Date()) return res.status(403).send('Token expired');

    // Push a generic reply entry indicating admin replied via Gmail
    const reply = {
      adminName: 'Hỗ trợ VeXe7TV',
      message: 'Phản hồi đã được gửi qua Gmail. Vui lòng kiểm tra hộp thư của bạn.',
      createdAt: new Date()
    };
    contact.replies = contact.replies || [];
    contact.replies.push(reply);
    contact.sent = true;
    contact.sentAt = new Date();
    await contact.save();

    // Simple HTML response for admin who clicked the link
    return res.send('<html><body><h3>Ghi nhận phản hồi thành công</h3><p>Phản hồi đã được ghi nhận trên hệ thống. Khách hàng sẽ thấy thông báo trên trang Liên hệ.</p></body></html>');
  } catch (e) {
    console.error('Error mark-replied:', e);
    return res.status(500).send('Server error');
  }
});

// Admin EJS routes
app.use('/admin', adminRoutes);

// static / health
app.get('/', (req, res) => res.redirect('/admin/login'));

// error handler (basic)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

// Start background job after server is listening
try {
  startCancelPendingBookings({ ttlMinutes: bookingTtlMinutes, intervalSeconds: bookingCancelIntervalSeconds });
} catch (e) {
  console.error('Failed to start cancelPendingBookings job:', e);
}

try {
  startGenerateRecurringTrips({ windowDays: parseInt(process.env.RECURRING_WINDOW_DAYS || '30', 10), runOnStart: true });
} catch (e) {
  console.error('Failed to start generateRecurringTrips job:', e);
}

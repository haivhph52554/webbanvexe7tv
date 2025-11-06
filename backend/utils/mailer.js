const nodemailer = require('nodemailer');

// Create transporter from environment variables. If not configured, fallback to a disabled sender.
// Required envs (example):
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM

async function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, ''); // Gmail app password: remove spaces

  if (!host || !user || !pass) {
    // Fallback: Ethereal test account (for development/demo)
    if (String(process.env.USE_ETHEREAL || 'false').toLowerCase() === 'true') {
      try {
        const testAccount = await nodemailer.createTestAccount();
        const etherealTransport = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: { user: testAccount.user, pass: testAccount.pass }
        });
        console.log('[mailer] Using Ethereal test SMTP. Emails will NOT deliver to real inbox.');
        return etherealTransport;
      } catch (e) {
        console.warn('[mailer] Failed to init Ethereal transport:', e.message);
        return null;
      }
    }
    return null;
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: { user, pass }
  });
  console.log('[mailer] Using real SMTP host:', host, 'port:', port);
  return transport;
}

let transporterPromise = null;
function getTransporter() {
  if (!transporterPromise) transporterPromise = createTransporter();
  return transporterPromise;
}

async function sendMail({ to, subject, html, text }) {
  const transporter = await getTransporter();
  if (!transporter) {
    console.log('[mailer] Transporter not configured. Skip sending to:', to);
    return { skipped: true };
  }
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const info = await transporter.sendMail({ from, to, subject, html, text });
  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) {
    console.log('[mailer] Preview URL:', preview);
  }
  return info;
}

function renderBookingHtml(bookingSummary) {
  const {
    route,
    times,
    seats,
    passenger,
    totalAmount,
    paymentMethod,
    bookingId,
    paymentId,
  } = bookingSummary || {};

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Thanh toán thành công</h2>
      <p>Cảm ơn bạn đã đặt vé. Dưới đây là thông tin chi tiết:</p>
      <ul>
        <li><strong>Mã đặt chỗ:</strong> ${bookingId || '-'}</li>
        <li><strong>Mã thanh toán:</strong> ${paymentId || '-'}</li>
        <li><strong>Tuyến:</strong> ${(route?.from || '-') + ' → ' + (route?.to || '-')}</li>
        <li><strong>Thời gian:</strong> Khởi hành ${times?.departureTime ? new Date(times.departureTime).toLocaleString('vi-VN') : '-'}${times?.arrivalTime ? `, Đến ${new Date(times.arrivalTime).toLocaleString('vi-VN')}` : ''}</li>
        <li><strong>Ghế:</strong> ${(seats || []).join(', ') || '-'}</li>
        <li><strong>Hành khách:</strong> ${(passenger?.name || '-')}, ${passenger?.phone || '-'}</li>
        <li><strong>Tổng tiền:</strong> ${(Number(totalAmount || 0)).toLocaleString('vi-VN')}₫</li>
        <li><strong>Phương thức:</strong> ${paymentMethod || '-'}</li>
      </ul>
      <p>Chúc bạn có chuyến đi an toàn và thoải mái!</p>
    </div>
  `;
}

async function sendBookingConfirmationEmail(to, bookingSummary) {
  if (!to) return;
  const subject = 'Xác nhận thanh toán & đặt vé thành công';
  const html = renderBookingHtml(bookingSummary);
  const text = `Thanh toán thành công. Mã đặt chỗ: ${bookingSummary?.bookingId || ''}.`;
  try {
    await sendMail({ to, subject, html, text });
  } catch (e) {
    console.error('[mailer] sendBookingConfirmationEmail error:', e);
  }
}

module.exports = {
  sendBookingConfirmationEmail,
};



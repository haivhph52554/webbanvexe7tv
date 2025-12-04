const nodemailer = require('nodemailer');


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

async function sendMail({ to, subject, html, text, replyTo }) {
  const transporter = await getTransporter();
  if (!transporter) {
    console.log('[mailer] Transporter not configured. Skip sending to:', to);
    return { skipped: true };
  }
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const mailOptions = { from, to, subject, html, text };
  if (replyTo) mailOptions.replyTo = replyTo;
  const info = await transporter.sendMail(mailOptions);
  // Log messageId and SMTP response for easier delivery verification
  try {
    if (info && info.messageId) console.log('[mailer] Sent messageId:', info.messageId);
    if (info && info.response) console.log('[mailer] SMTP response:', info.response);
  } catch (e) {
    console.warn('[mailer] Warning logging send result:', e && e.message ? e.message : e);
  }
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

async function sendBookingCancellationEmail(to, bookingSummary) {
  if (!to) return;
  const subject = 'Thông báo: Đơn hàng đã hủy do không thanh toán';
  const { bookingId, seats, totalAmount, createdAt } = bookingSummary || {};
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Đơn hàng đã được hủy</h2>
      <p>Đơn đặt chỗ <strong>${bookingId || '-'}</strong> của bạn đã được tự động hủy vì chưa thanh toán trong thời gian quy định.</p>
      <ul>
        <li><strong>Mã đặt chỗ:</strong> ${bookingId || '-'}</li>
        <li><strong>Ghế:</strong> ${(seats || []).join(', ') || '-'}</li>
        <li><strong>Tổng tiền:</strong> ${(Number(totalAmount || 0)).toLocaleString('vi-VN')}₫</li>
        <li><strong>Thời gian đặt:</strong> ${createdAt ? new Date(createdAt).toLocaleString('vi-VN') : '-'}</li>
      </ul>
      <p>Nếu bạn vẫn muốn đặt vé, vui lòng thực hiện đặt mới trên website.</p>
    </div>
  `;
  const text = `Đơn ${bookingId || ''} đã bị hủy vì không nhận được thanh toán.`;
  try {
    await sendMail({ to, subject, html, text });
  } catch (e) {
    console.error('[mailer] sendBookingCancellationEmail error:', e);
  }
}

module.exports = {
  sendBookingConfirmationEmail,
  sendBookingCancellationEmail,
};

// Gửi email từ form liên hệ (contact)
async function sendContactEmail({ fromName, fromEmail, fromPhone, subject, message, to, contactId, token }) {
  if (!to) to = process.env.SUPPORT_EMAIL || 'vexe7tv@gmail.com';
  const fullSubject = `[Liên hệ khách hàng] ${subject || '(Không có chủ đề)'} `;
  const serverUrl = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
  const markLink = contactId && token ? `${serverUrl}/public/contacts/${contactId}/mark-replied?token=${encodeURIComponent(token)}` : null;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6">
      <h2>Thông báo Liên hệ mới</h2>
      <p><strong>Người gửi:</strong> ${fromName || '-'} &lt;${fromEmail || '-'}&gt;</p>
      <p><strong>Số điện thoại:</strong> ${fromPhone || '-'}</p>
      <p><strong>Chủ đề:</strong> ${subject || '-'}</p>
      <hr />
      <div>${(message || '').replace(/\n/g, '<br/>')}</div>
      ${markLink ? `<hr/><p><a href="${markLink}">Đã trả lời qua Gmail? Nhấn vào đây để ghi nhận trên website</a></p>` : ''}
    </div>
  `;
  const text = `Liên hệ mới từ ${fromName || '-'} <${fromEmail || '-'}>\n\n${message || ''}`;
  try {
    return await sendMail({ to, subject: fullSubject, html, text, replyTo: fromEmail });
  } catch (e) {
    console.error('[mailer] sendContactEmail error:', e.message || e);
    throw e;
  }
}

module.exports.sendContactEmail = sendContactEmail;

// Gửi reply (admin -> khách) với template HTML đẹp hơn
async function sendReplyEmail({ to, subject, replyFromName, replyFromEmail, message, original }) {
  if (!to) throw new Error('Missing recipient');
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;
  const headerName = replyFromName || (from && from.split('<')[0].trim()) || 'VeXe7TV';
  const safeSubject = subject || 'Trả lời từ VeXe7TV';

  const html = `
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body{font-family:Inter,Segoe UI,Arial,Helvetica,sans-serif;background:#f6f8fb;margin:0;padding:20px}
        .container{max-width:680px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 6px 20px rgba(18,38,63,0.08)}
        .header{background:linear-gradient(90deg,#6366f1,#4f46e5);color:#fff;padding:18px}
        .header h1{margin:0;font-size:18px}
        .content{padding:20px;color:#0f172a}
        .greeting{font-size:16px;margin-bottom:12px}
        .reply-box{background:#f8fafc;border:1px solid #eef2ff;padding:16px;border-radius:6px;color:#0f172a;margin-bottom:16px}
        .original{border-left:4px solid #e6edf8;padding:12px 16px;background:#fbfdff;color:#334155;border-radius:6px}
        .meta{font-size:13px;color:#64748b;margin-bottom:6px}
        .footer{padding:16px;background:#fafafa;border-top:1px solid #f1f5f9;font-size:13px;color:#475569}
        a.button{display:inline-block;padding:10px 16px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${headerName} trả lời bạn</h1>
        </div>
        <div class="content">
          <div class="greeting">Xin chào,</div>
          <div class="meta">Nội dung trả lời từ <strong>${headerName}</strong> — <em>${new Date().toLocaleString('vi-VN')}</em></div>
          <div class="reply-box">${(message || '').replace(/\n/g, '<br/>')}</div>

          ${original ? `<div style="margin-bottom:8px;color:#64748b;font-size:13px">Nội dung gốc:</div>
            <div class="original">${original.replace(/\n/g, '<br/>')}</div>` : ''}

          <div style="margin-top:18px">Trân trọng,<br/><strong>${headerName}</strong></div>
        </div>
        <div class="footer">Bạn đang nhận mail từ VeXe7TV — vui lòng không trả lời vào địa chỉ này nếu bạn không thấy phần trả lời; thay vào đó hãy gửi tới email hỗ trợ: <a href="mailto:${process.env.SUPPORT_EMAIL || process.env.SMTP_USER}">${process.env.SUPPORT_EMAIL || process.env.SMTP_USER}</a></div>
      </div>
    </body>
    </html>
  `;

  const text = (message || '') + (original ? '\n\n----Original message----\n' + original : '');

  // gửi với Reply-To là replyFromEmail nếu có
  return await sendMail({ to, subject: safeSubject, html, text, replyTo: replyFromEmail || process.env.MAIL_FROM });
}

module.exports.sendReplyEmail = sendReplyEmail;



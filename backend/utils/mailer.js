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
    bus,
    driver,
    stops,
    pricePerSeat,
    originalTotal,
    discountAmount,
    voucherCode,
  } = bookingSummary || {};

  const formatBookingCode = (id) => {
    if (!id) return '-';
    const clean = String(id).replace(/-/g, '').toUpperCase();
    return `VXR-7TV-${clean.slice(-6)}`;
  };

  const formatPaymentCode = (id) => {
    if (!id) return '-';
    const clean = String(id).replace(/-/g, '').toUpperCase();
    return `PAY-${clean.slice(-8)}`;
  };

  const bookingCode = formatBookingCode(bookingId);
  const paymentCode = formatPaymentCode(paymentId);

  const formatTime = (iso) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '-';
    }
  };

  const formatDateTime = (iso) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      return d.toLocaleString('vi-VN', { 
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">VeXe7TV</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Xác nhận đặt vé thành công</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
          <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
            <p style="margin: 0; font-size: 16px; color: #1e40af;"><strong>✓ Thanh toán thành công!</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #1e3a8a;">Cảm ơn bạn đã sử dụng dịch vụ của VeXe7TV. Vui lòng lưu thông tin vé này.</p>
          </div>

          <!-- Booking Info -->
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; font-size: 18px; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Thông tin đặt vé</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Mã đặt vé:</strong></td>
                <td style="padding: 8px 0; color: #111827; font-weight: bold;">${bookingCode}</td>
              </tr>
              ${paymentCode && paymentCode !== '-' ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Mã thanh toán:</strong></td>
                <td style="padding: 8px 0; color: #111827;">${paymentCode}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Trạng thái:</strong></td>
                <td style="padding: 8px 0; color: #059669; font-weight: bold;">${paymentMethod === 'cod' ? 'Đã thanh toán' : paymentMethod === 'banking' || paymentMethod === 'momo' ? 'Chờ thanh toán' : 'Đã xác nhận'}</td>
              </tr>
            </table>
          </div>

          <!-- Route Info -->
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; font-size: 18px; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Thông tin chuyến đi</h2>
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
              <div style="flex: 1;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Điểm đón</p>
                <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold; color: #111827;">${stops?.pickupName || route?.from || '-'}</p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #4b5563;">${formatDateTime(times?.departureTime)}</p>
              </div>
              <div style="padding: 0 20px; font-size: 24px; color: #9ca3af;">→</div>
              <div style="flex: 1;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Điểm trả</p>
                <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: bold; color: #111827;">${stops?.dropoffName || route?.to || '-'}</p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #4b5563;">${formatDateTime(times?.arrivalTime)}</p>
              </div>
            </div>
            ${route?.durationMin ? `
            <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
              <strong>Thời gian di chuyển:</strong> ${Math.floor(route.durationMin / 60)}h ${route.durationMin % 60}m
            </p>
            ` : ''}
          </div>

          <!-- Passenger & Bus Info -->
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; font-size: 18px; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Chi tiết vé</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Ghế đã đặt:</strong></td>
                <td style="padding: 8px 0; color: #111827; font-weight: bold;">${(seats || []).join(', ') || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Số ghế:</strong></td>
                <td style="padding: 8px 0; color: #111827;">${(seats || []).length} ghế</td>
              </tr>
              ${bus?.busType ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Loại xe:</strong></td>
                <td style="padding: 8px 0; color: #111827;">${bus.busType}</td>
              </tr>
              ` : ''}
              ${bus?.licensePlate ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Biển số xe:</strong></td>
                <td style="padding: 8px 0; color: #111827; font-family: monospace;">${bus.licensePlate}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Hành khách:</strong></td>
                <td style="padding: 8px 0; color: #111827;">${passenger?.name || '-'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Số điện thoại:</strong></td>
                <td style="padding: 8px 0; color: #111827;">${passenger?.phone || '-'}</td>
              </tr>
              ${driver?.name ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Tài xế:</strong></td>
                <td style="padding: 8px 0; color: #111827;">${driver.name}</td>
              </tr>
              ` : ''}
              ${driver?.phone ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>SĐT tài xế:</strong></td>
                <td style="padding: 8px 0; color: #111827;">${driver.phone}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <!-- Payment Info -->
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <h2 style="margin-top: 0; font-size: 18px; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Thông tin thanh toán</h2>
            <table style="width: 100%; border-collapse: collapse;">
              ${pricePerSeat ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Giá vé/ghế:</strong></td>
                <td style="padding: 8px 0; color: #111827;">${Number(pricePerSeat).toLocaleString('vi-VN')}₫</td>
              </tr>
              ` : ''}
              ${originalTotal && originalTotal > totalAmount ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Tổng tiền gốc:</strong></td>
                <td style="padding: 8px 0; color: #6b7280; text-decoration: line-through;">${Number(originalTotal).toLocaleString('vi-VN')}₫</td>
              </tr>
              ` : ''}
              ${discountAmount && discountAmount > 0 ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Giảm giá${voucherCode ? ` (${voucherCode})` : ''}:</strong></td>
                <td style="padding: 8px 0; color: #059669;">-${Number(discountAmount).toLocaleString('vi-VN')}₫</td>
              </tr>
              ` : ''}
              <tr style="border-top: 2px solid #e5e7eb;">
                <td style="padding: 12px 0 8px 0; color: #111827; font-size: 16px;"><strong>Tổng thanh toán:</strong></td>
                <td style="padding: 12px 0 8px 0; color: #059669; font-size: 18px; font-weight: bold;">${Number(totalAmount || 0).toLocaleString('vi-VN')}₫</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;"><strong>Phương thức thanh toán:</strong></td>
                <td style="padding: 8px 0; color: #111827;">${paymentMethod === 'cod' ? 'Thanh toán tại xe' : paymentMethod === 'banking' ? 'Chuyển khoản ngân hàng' : paymentMethod === 'momo' ? 'Ví MoMo' : paymentMethod || '-'}</td>
              </tr>
            </table>
          </div>

          <!-- Footer -->
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; text-align: center;">
            <p style="margin: 0 0 10px 0; color: #4b5563; font-size: 14px;">
              <strong>Lưu ý:</strong> Vui lòng đến đúng giờ và điểm đón. Mang theo CMND/CCCD để đối chiếu khi lên xe.
            </p>
            <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 13px;">
              Chúc bạn có chuyến đi an toàn và thoải mái!<br>
              Mọi thắc mắc xin liên hệ: <strong>${process.env.SUPPORT_EMAIL || 'support@vexe7tv.com'}</strong>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #1f2937; color: #9ca3af; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} VeXe7TV. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendBookingConfirmationEmail(to, bookingSummary) {
  if (!to) {
    console.warn('[mailer] No recipient email provided for booking confirmation');
    return;
  }
  const subject = 'Xác nhận đặt vé thành công - VeXe7TV';
  const html = renderBookingHtml(bookingSummary);
  const bookingCode = bookingSummary?.bookingId ? `VXR-7TV-${String(bookingSummary.bookingId).replace(/-/g, '').toUpperCase().slice(-6)}` : '';
  const text = `Xác nhận đặt vé thành công!\n\nMã đặt vé: ${bookingCode}\nTuyến: ${bookingSummary?.route?.from || '-'} → ${bookingSummary?.route?.to || '-'}\nGhế: ${(bookingSummary?.seats || []).join(', ')}\nTổng thanh toán: ${Number(bookingSummary?.totalAmount || 0).toLocaleString('vi-VN')}₫\n\nChúc bạn có chuyến đi an toàn và thoải mái!`;
  try {
    const result = await sendMail({ to, subject, html, text });
    if (result && result.skipped) {
      console.warn('[mailer] Email sending skipped (no SMTP configured)');
    } else {
      console.log('[mailer] Booking confirmation email sent successfully to:', to);
    }
    return result;
  } catch (e) {
    console.error('[mailer] sendBookingConfirmationEmail error:', e.message || e);
    throw e;
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



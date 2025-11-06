async function sendBookingEmail(booking) {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = (process.env.SMTP_SECURE === "true") || String(port) === "465";
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.SMTP_FROM || user;

  if (!user || !pass) {
    console.warn("⚠️ Chưa cấu hình SMTP_USER / SMTP_PASS");
    return;
  }

  const transporter = nodemailer.createTransport({
    host, port, secure, auth: { user, pass }
  });

  const passenger = booking.passenger || {};
  const to = passenger.email;
  if (!to) {
    console.warn("⚠️ Không có email hành khách, bỏ qua gửi mail");
    return;
  }

  const qrPath = path.resolve("backend/public/ma-qr-ngan-hang-msb.png"); // ảnh QR ngân hàng bạn tự thêm vào đây
  const ticketPath = await generateTicketImage(booking);

  const subject = `🎫 Vé xe - Mã đặt chỗ ${booking._id}`;
  const html = `
    <div style="font-family: Arial; color: #111;">
      <h2>Xin chào ${passenger.name || ""},</h2>
      <p>Bạn đã đặt vé thành công!</p>
      <p>Dưới đây là mã QR ngân hàng để thanh toán:</p>
      <img src="cid:qrbank" style="width:180px;height:180px"/>
      <p>Vé điện tử của bạn được đính kèm trong email này.</p>
      <p>Cảm ơn bạn đã sử dụng VeXe7TV ❤️</p>
    </div>
  `;

  await transporter.sendMail({
    from, to, subject, html,
    attachments: [
      {
        filename: "qr-bank.png",
        path: qrPath,
        cid: "qrbank",
      },
      {
        filename: `ve-${booking._id}.png`,
        path: ticketPath,
      },
    ],
  });

  console.log("✅ Email gửi đến", to);
}

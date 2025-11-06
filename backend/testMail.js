import 'dotenv/config';
import nodemailer from 'nodemailer';

console.log({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS ? '✅ Có mật khẩu' : '❌ Không có mật khẩu'
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: process.env.SMTP_SECURE === 'true', // true cho 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendTestEmail() {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.SMTP_USER, // test gửi về chính email mình
      subject: "✅ Test mail từ VeXe7TV",
      text: "Gửi thử email thành công!",
    });
    console.log("✅ Email đã gửi:", info.response);
  } catch (err) {
    console.error("❌ Lỗi gửi email:", err.message);
  }
}

sendTestEmail();

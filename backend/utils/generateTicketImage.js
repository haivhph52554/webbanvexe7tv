import puppeteer from "puppeteer";
import fs from "fs";

export async function generateTicketImage(bookingData) {
  const html = `
  <html>
    <head>
      <style>
        body { font-family: Arial; padding: 20px; background: #f9f9f9; }
        .ticket {
          width: 600px;
          background: white;
          border: 2px solid #4CAF50;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        h2 { color: #4CAF50; text-align: center; }
        .info { margin: 10px 0; font-size: 16px; }
        .label { font-weight: bold; width: 160px; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="ticket">
        <h2>🎫 Vé xe điện tử - VeXe7TV</h2>
        <div class="info"><span class="label">Mã đặt vé:</span> ${bookingData.code}</div>
        <div class="info"><span class="label">Tuyến:</span> ${bookingData.from} → ${bookingData.to}</div>
        <div class="info"><span class="label">Ngày khởi hành:</span> ${bookingData.date}</div>
        <div class="info"><span class="label">Giờ khởi hành:</span> ${bookingData.time}</div>
        <div class="info"><span class="label">Ghế:</span> ${bookingData.seat}</div>
        <div class="info"><span class="label">Loại xe:</span> ${bookingData.type}</div>
        <div class="info"><span class="label">Hành khách:</span> ${bookingData.name}</div>
        <div class="info"><span class="label">SĐT:</span> ${bookingData.phone}</div>
        <div class="info"><span class="label">Giá vé:</span> ${bookingData.price}₫</div>
      </div>
    </body>
  </html>
  `;

  const filePath = `./public/images/ticket-${bookingData.code}.png`;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.screenshot({ path: filePath, fullPage: true });
  await browser.close();

  return filePath;
}

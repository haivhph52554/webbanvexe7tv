# Giải thích: Tự động xác nhận thanh toán

## ⚠️ QUAN TRỌNG: Hệ thống KHÔNG tự động xác nhận nếu chưa setup webhook

Hiện tại, hệ thống **CHƯA THỂ tự động xác nhận** khi có người chuyển khoản vào tài khoản, trừ khi bạn đã setup webhook từ VietQR hoặc ngân hàng.

## 🔄 Cách hoạt động hiện tại

### 1. Khi khách hàng chuyển khoản
- Khách hàng quét QR code và chuyển khoản với nội dung: `VEXE {bookingId}`
- Tiền được chuyển vào tài khoản BIDV của bạn
- **NHƯNG** hệ thống chưa biết có giao dịch này (vì chưa có webhook)

### 2. Để tự động xác nhận (CẦN SETUP)

#### Cách 1: Webhook từ VietQR (Khuyến nghị) ✅
1. Đăng ký tài khoản tại https://vietqr.io
2. Kết nối tài khoản ngân hàng BIDV
3. Cấu hình webhook URL trong dashboard:
   ```
   https://your-domain.com/api/payments/vietqr-webhook
   ```
4. Khi có chuyển khoản, VietQR sẽ tự động gửi POST request đến webhook
5. Hệ thống tự động xác nhận thanh toán

**Lưu ý:** Cần domain có HTTPS và server phải accessible từ internet.

#### Cách 2: API từ ngân hàng
- Một số ngân hàng cung cấp API để query giao dịch
- Cần liên hệ BIDV để đăng ký API
- Tích hợp vào job `checkBankingPayments.js`

### 3. Xác nhận thủ công (Hiện tại đang dùng)

Nếu chưa có webhook, bạn có thể xác nhận thủ công:

#### A. Qua trang Admin
1. Vào `/admin/bookings`
2. Tìm booking đang `pending`
3. Click "Chi tiết"
4. Click nút **"✅ Xác nhận thanh toán"**
5. Hệ thống tự động cập nhật status thành `paid`

#### B. Qua API
```bash
POST /api/payments/confirm-banking
Content-Type: application/json

{
  "bookingId": "booking_id_here",
  "transactionCode": "TX123456789",  // Mã giao dịch từ ngân hàng (tùy chọn)
  "amount": 500000  // Số tiền (tùy chọn)
}
```

## 📋 Quy trình đề xuất

### Hiện tại (Chưa có webhook):
1. Khách hàng chuyển khoản
2. Admin kiểm tra tài khoản ngân hàng
3. Admin vào trang admin, tìm booking tương ứng
4. Admin click "Xác nhận thanh toán"
5. Hệ thống cập nhật và gửi email xác nhận cho khách

### Khi đã có webhook:
1. Khách hàng chuyển khoản
2. VietQR gửi webhook tự động
3. Hệ thống tự động xác nhận (trong vài giây)
4. Khách hàng nhận email xác nhận tự động

## 🛠️ Setup webhook local (Testing)

Nếu muốn test webhook trên local:

1. Cài đặt ngrok:
   ```bash
   npm install -g ngrok
   ```

2. Chạy ngrok:
   ```bash
   ngrok http 5000
   ```

3. Lấy URL từ ngrok (ví dụ: `https://abc123.ngrok.io`)

4. Cấu hình webhook trong VietQR:
   ```
   https://abc123.ngrok.io/api/payments/vietqr-webhook
   ```

5. Test bằng cách gửi POST request:
   ```bash
   curl -X POST http://localhost:5000/api/payments/vietqr-webhook \
     -H "Content-Type: application/json" \
     -d '{
       "accountNumber": "8851715585",
       "amount": 500000,
       "content": "VEXE 65a1b2c3d4e5f6",
       "transactionDate": "2024-01-15T10:30:00Z",
       "reference": "TX123456789"
     }'
   ```

## ✅ Tóm tắt

- **Hiện tại:** Cần xác nhận thủ công qua admin panel
- **Tương lai:** Setup webhook từ VietQR để tự động xác nhận
- **Endpoint webhook:** Đã sẵn sàng tại `/api/payments/vietqr-webhook`
- **Admin panel:** Đã có nút xác nhận thanh toán dễ dàng



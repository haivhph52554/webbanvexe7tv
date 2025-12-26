# Hướng dẫn thiết lập thanh toán tự động

## 1. Cấu hình thông tin ngân hàng

Thêm vào file `.env`:

```env
# Thông tin ngân hàng
BANK_CODE=BIDV
BANK_ACCOUNT=8851715585
BANK_ACCOUNT_NAME=NGUYEN TIEN DUNG
BANK_NAME=BIDV - PGD Lê Trọng Tấn
```

## 2. Tự động xác nhận thanh toán

Có 2 cách để tự động xác nhận thanh toán khi có chuyển khoản:

### Cách 1: Sử dụng Webhook từ VietQR (Khuyến nghị)

VietQR cung cấp webhook để tự động thông báo khi có giao dịch chuyển khoản.

**Bước 1:** Đăng ký tài khoản VietQR tại https://vietqr.io

**Bước 2:** Cấu hình webhook URL trong dashboard VietQR:
```
https://your-domain.com/api/payments/vietqr-webhook
```

**Bước 3:** VietQR sẽ gửi POST request đến webhook khi có giao dịch với format:
```json
{
  "accountNumber": "8851715585",
  "amount": 500000,
  "content": "VEXE ABC12345",
  "transactionDate": "2024-01-15T10:30:00Z",
  "reference": "TX123456789"
}
```

**Bước 4:** Hệ thống sẽ tự động:
- Tìm booking theo nội dung chuyển khoản (VEXE {bookingId})
- Kiểm tra số tiền khớp
- Cập nhật payment và booking thành công

### Cách 2: Xác nhận thủ công qua API

Nếu webhook không hoạt động, có thể xác nhận thủ công:

```bash
POST /api/payments/confirm-banking
Content-Type: application/json

{
  "bookingId": "booking_id_here",
  "transactionCode": "TX123456789",
  "amount": 500000
}
```

## 3. Kiểm tra trạng thái thanh toán

Frontend tự động polling để kiểm tra trạng thái:
- PaymentSuccess: Poll mỗi 5 giây khi vé đang pending
- TicketDetailPage: Có thể refresh để cập nhật

## 4. Format nội dung chuyển khoản

**Bắt buộc:** Nội dung chuyển khoản phải có format:
```
VEXE {bookingId}
```

Ví dụ:
```
VEXE 65a1b2c3d4e5f6
```

## 5. Lưu ý

- QR code tự động tạo với thông tin ngân hàng từ `.env`
- Hệ thống chỉ xác nhận tự động khi:
  - Số tài khoản khớp
  - Số tiền khớp (cho phép sai lệch ±1000 VND)
  - Nội dung chuyển khoản đúng format
- Nếu không có webhook, cần xác nhận thủ công hoặc tích hợp API ngân hàng

## 6. Testing

Để test webhook local, có thể dùng ngrok:

```bash
ngrok http 5000
```

Sau đó cấu hình webhook URL trong VietQR:
```
https://your-ngrok-url.ngrok.io/api/payments/vietqr-webhook
```



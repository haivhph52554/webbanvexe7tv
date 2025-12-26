// Job tự động kiểm tra và xác nhận thanh toán chuyển khoản
// Chạy định kỳ để kiểm tra các booking đang pending
// Lưu ý: Job này chỉ hoạt động nếu bạn có API từ ngân hàng hoặc VietQR để query giao dịch
// Nếu không có, nên dùng webhook từ VietQR

const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

/**
 * Kiểm tra và xác nhận thanh toán chuyển khoản
 * Lưu ý: Hàm này cần tích hợp với API ngân hàng hoặc VietQR để query giao dịch
 * Hiện tại chỉ là template, cần implement logic query giao dịch thực tế
 */
async function checkBankingPayments() {
  try {
    // Lấy tất cả booking đang pending với phương thức banking/momo
    const pendingBookings = await Booking.find({
      status: 'pending'
    }).populate('payment');

    console.log(`Checking ${pendingBookings.length} pending bookings...`);

    for (const booking of pendingBookings) {
      const payment = booking.payment;
      
      if (!payment || payment.status !== 'pending') continue;
      if (payment.method !== 'banking' && payment.method !== 'momo') continue;

      // TODO: Gọi API VietQR hoặc ngân hàng để kiểm tra giao dịch
      // Ví dụ:
      // const transactions = await vietqrAPI.getTransactions({
      //   accountNumber: process.env.BANK_ACCOUNT,
      //   fromDate: booking.createdAt,
      //   toDate: new Date(),
      //   content: `VEXE ${booking._id}`
      // });
      
      // Tạm thời bỏ qua vì cần tích hợp API thực tế
      // Khi có webhook từ VietQR, webhook sẽ xử lý tự động
    }

    console.log('Banking payment check completed');
  } catch (error) {
    console.error('Error checking banking payments:', error);
  }
}

/**
 * Khởi chạy job kiểm tra định kỳ
 * @param {Object} options
 * @param {Number} options.intervalMinutes - Khoảng thời gian chạy (phút)
 */
function startBankingPaymentCheckJob(options = {}) {
  const intervalMinutes = options.intervalMinutes || 5; // Mặc định 5 phút
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`Starting banking payment check job (interval: ${intervalMinutes} minutes)`);

  // Chạy ngay lần đầu
  checkBankingPayments();

  // Sau đó chạy định kỳ
  const intervalId = setInterval(() => {
    checkBankingPayments();
  }, intervalMs);

  return {
    stop: () => {
      clearInterval(intervalId);
      console.log('Banking payment check job stopped');
    }
  };
}

module.exports = {
  checkBankingPayments,
  startBankingPaymentCheckJob,
};



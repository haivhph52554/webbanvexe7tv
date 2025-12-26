// Cấu hình thông tin ngân hàng để hiển thị QR code
// Có thể lấy từ environment variables hoặc database

const BANK_CONFIG = {
  // Mã ngân hàng theo VietQR (BIDV = BIDV)
  bankCode: process.env.BANK_CODE || 'BIDV',
  
  // Số tài khoản
  accountNumber: process.env.BANK_ACCOUNT || '8851715585',
  
  // Tên chủ tài khoản
  accountName: process.env.BANK_ACCOUNT_NAME || 'NGUYEN TIEN DUNG',
  
  // Tên ngân hàng và chi nhánh
  bankName: process.env.BANK_NAME || 'BIDV - PGD Lê Trọng Tấn',
};

/**
 * Tạo URL QR code từ VietQR
 * @param {Number} amount - Số tiền (VND)
 * @param {String} content - Nội dung chuyển khoản
 * @returns {String} URL QR code
 */
function generateQRCodeUrl(amount, content) {
  const { bankCode, accountNumber } = BANK_CONFIG;
  const encodedContent = encodeURIComponent(content);
  return `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact.jpg?amount=${amount}&addInfo=${encodedContent}`;
}

module.exports = {
  BANK_CONFIG,
  generateQRCodeUrl,
};



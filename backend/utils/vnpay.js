const crypto = require('crypto');
const querystring = require('querystring');

// Cấu hình VNPay (lấy từ environment variables)
const VNPAY_CONFIG = {
  vnp_TmnCode: process.env.VNPAY_TMN_CODE || 'YOUR_TMN_CODE',
  vnp_HashSecret: process.env.VNPAY_HASH_SECRET || 'YOUR_HASH_SECRET',
  vnp_Url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  vnp_ReturnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:5000/api/payments/vnpay-return',
  vnp_Api: process.env.VNPAY_API || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
};

/**
 * Tạo URL thanh toán VNPay
 * @param {Object} params - Thông tin thanh toán
 * @param {String} params.orderId - Mã đơn hàng (booking ID)
 * @param {Number} params.amount - Số tiền (VND)
 * @param {String} params.orderDescription - Mô tả đơn hàng
 * @param {String} params.orderType - Loại đơn hàng
 * @param {String} params.locale - Ngôn ngữ (vn/en)
 * @param {String} params.ipAddr - IP của khách hàng
 * @returns {String} URL thanh toán VNPay
 */
function createPaymentUrl(params) {
  const {
    orderId,
    amount,
    orderDescription = 'Thanh toan ve xe',
    orderType = 'other',
    locale = 'vn',
    ipAddr = '127.0.0.1',
  } = params;

  const date = new Date();
  const createDate = date.toISOString().replace(/[-:]/g, '').split('.')[0] + '00';
  const expireDate = new Date(date.getTime() + 15 * 60 * 1000) // 15 phút
    .toISOString()
    .replace(/[-:]/g, '')
    .split('.')[0] + '00';

  const vnp_Params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: VNPAY_CONFIG.vnp_TmnCode,
    vnp_Locale: locale,
    vnp_CurrCode: 'VND',
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderDescription,
    vnp_OrderType: orderType,
    vnp_Amount: amount * 100, // VNPay yêu cầu số tiền nhân 100
    vnp_ReturnUrl: VNPAY_CONFIG.vnp_ReturnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  // Sắp xếp params theo thứ tự alphabet
  const sortedParams = Object.keys(vnp_Params)
    .sort()
    .reduce((result, key) => {
      result[key] = vnp_Params[key];
      return result;
    }, {});

  // Tạo query string
  const signData = querystring.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.vnp_HashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  // Thêm chữ ký vào params
  vnp_Params['vnp_SecureHash'] = signed;

  // Tạo URL thanh toán
  const paymentUrl = VNPAY_CONFIG.vnp_Url + '?' + querystring.stringify(vnp_Params, { encode: false });
  
  return paymentUrl;
}

/**
 * Xác thực chữ ký từ VNPay callback
 * @param {Object} vnp_Params - Các tham số từ VNPay callback
 * @returns {Boolean} true nếu chữ ký hợp lệ
 */
function verifyReturnUrl(vnp_Params) {
  const secureHash = vnp_Params['vnp_SecureHash'];
  delete vnp_Params['vnp_SecureHash'];
  delete vnp_Params['vnp_SecureHashType'];

  // Sắp xếp params theo thứ tự alphabet
  const sortedParams = Object.keys(vnp_Params)
    .sort()
    .reduce((result, key) => {
      result[key] = vnp_Params[key];
      return result;
    }, {});

  // Tạo query string
  const signData = querystring.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.vnp_HashSecret);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return secureHash === signed;
}

/**
 * Xử lý kết quả thanh toán từ VNPay
 * @param {Object} vnp_Params - Các tham số từ VNPay callback
 * @returns {Object} Kết quả thanh toán
 */
function processReturn(vnp_Params) {
  const isValid = verifyReturnUrl(vnp_Params);

  if (!isValid) {
    return {
      success: false,
      message: 'Chữ ký không hợp lệ',
    };
  }

  const responseCode = vnp_Params['vnp_ResponseCode'];
  const transactionStatus = vnp_Params['vnp_TransactionStatus'];
  const orderId = vnp_Params['vnp_TxnRef'];
  const amount = parseInt(vnp_Params['vnp_Amount']) / 100; // Chia 100 để lấy số tiền thực
  const transactionNo = vnp_Params['vnp_TransactionNo'];
  const bankCode = vnp_Params['vnp_BankCode'];
  const payDate = vnp_Params['vnp_PayDate'];

  // ResponseCode = '00' và TransactionStatus = '00' nghĩa là thanh toán thành công
  if (responseCode === '00' && transactionStatus === '00') {
    return {
      success: true,
      message: 'Thanh toán thành công',
      orderId,
      amount,
      transactionNo,
      bankCode,
      payDate,
      responseCode,
    };
  } else {
    return {
      success: false,
      message: getResponseMessage(responseCode),
      orderId,
      amount,
      transactionNo,
      responseCode,
    };
  }
}

/**
 * Lấy thông báo lỗi từ response code
 */
function getResponseMessage(responseCode) {
  const responseMessages = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).',
    '09': 'Thẻ/Tài khoản chưa đăng ký dịch vụ InternetBanking',
    '10': 'Xác thực thông tin thẻ/tài khoản không đúng. Quá 3 lần nhập sai',
    '11': 'Đã hết hạn chờ thanh toán. Xin vui lòng thực hiện lại giao dịch.',
    '12': 'Thẻ/Tài khoản bị khóa.',
    '13': 'Nhập sai mật khẩu xác thực giao dịch (OTP). Quá 3 lần nhập sai.',
    '51': 'Tài khoản không đủ số dư để thực hiện giao dịch.',
    '65': 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày.',
    '75': 'Ngân hàng thanh toán đang bảo trì.',
    '79': 'Nhập sai mật khẩu thanh toán InternetBanking quá số lần quy định.',
    '99': 'Lỗi không xác định',
  };

  return responseMessages[responseCode] || 'Lỗi không xác định';
}

module.exports = {
  createPaymentUrl,
  verifyReturnUrl,
  processReturn,
  VNPAY_CONFIG,
};



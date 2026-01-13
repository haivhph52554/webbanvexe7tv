const crypto = require('crypto');

const pad2 = (num) => String(num).padStart(2, '0');

const formatVnpDate = (date = new Date()) => {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
    pad2(date.getHours()),
    pad2(date.getMinutes()),
    pad2(date.getSeconds())
  ].join('');
};

const buildQuery = (params) => {
  return Object.keys(params)
    .sort()
    .map((key) => {
      const value = params[key];
      const encKey = encodeURIComponent(key);
      const encValue = encodeURIComponent(String(value)).replace(/%20/g, '+');
      return `${encKey}=${encValue}`;
    })
    .join('&');
};

const createVnpayUrl = ({
  amount,
  orderId,
  orderInfo,
  orderType,
  returnUrl,
  bankCode,
  locale,
  ipAddr,
  tmnCode,
  secretKey,
  vnpUrl
}) => {
  const vnp_Params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: locale || 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: orderType || 'other',
    vnp_Amount: Math.round(Number(amount) || 0) * 100,
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr || '127.0.0.1',
    vnp_CreateDate: formatVnpDate()
  };

  if (bankCode) {
    vnp_Params.vnp_BankCode = bankCode;
  }

  const signData = buildQuery(vnp_Params);
  const secureHash = crypto
    .createHmac('sha512', secretKey)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');

  vnp_Params.vnp_SecureHash = secureHash;

  return `${vnpUrl}?${buildQuery(vnp_Params)}`;
};

const verifyVnpayReturn = (query, secretKey) => {
  const vnp_Params = { ...query };
  const secureHash = vnp_Params.vnp_SecureHash;

  delete vnp_Params.vnp_SecureHash;
  delete vnp_Params.vnp_SecureHashType;

  const signData = buildQuery(vnp_Params);
  const signed = crypto
    .createHmac('sha512', secretKey)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');

  return { isValid: secureHash === signed, vnp_Params };
};

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }
  return (
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.connection?.socket?.remoteAddress ||
    '127.0.0.1'
  );
};

module.exports = {
  createVnpayUrl,
  verifyVnpayReturn,
  getClientIp
};

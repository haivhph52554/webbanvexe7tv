const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const authMiddleware = require("../middleware/authMiddleware");

// Public routes (không cần auth)
router.post("/create-vnpay-url", paymentController.createVnpayUrl);
router.get("/vnpay-return", paymentController.vnpayReturn);
router.post("/vietqr-webhook", paymentController.vietqrWebhook); // Webhook từ VietQR
router.post("/confirm-banking", paymentController.confirmBankingPayment); // Xác nhận thủ công
router.get("/:id", paymentController.getPaymentById);

// Protected routes (có thể cần auth)
router.get("/", paymentController.getAllPayments);
router.post("/", paymentController.createPayment);

module.exports = router;

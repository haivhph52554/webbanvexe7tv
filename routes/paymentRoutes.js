const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", paymentController.getAllPayments);
router.post("/", paymentController.createPayment);
router.get("/", authMiddleware, paymentController.getAllPayments);
router.post("/", authMiddleware, paymentController.createPayment);

module.exports = router;

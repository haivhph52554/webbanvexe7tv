const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticketController");
const authMiddleware = require("../middleware/authMiddleware");


router.get("/", authMiddleware, ticketController.getAllTickets);
router.post("/", authMiddleware, ticketController.createTicket);

router.get("/", ticketController.getAllTickets);
router.post("/", ticketController.createTicket);

module.exports = router;

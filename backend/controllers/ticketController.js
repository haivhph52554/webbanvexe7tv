const Ticket = require("../models/Ticket");

// 🟢 Lấy danh sách vé
exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find().populate("tripId");
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🟢 Đặt vé (kiểm tra trùng ghế)
exports.createTicket = async (req, res) => {
  try {
    const { tripId, seatNumber, customerName, customerPhone } = req.body;

    // Kiểm tra trùng ghế
    const existing = await Ticket.findOne({ tripId, seatNumber });
    if (existing) {
      return res.status(400).json({ message: "Ghế này đã được đặt rồi!" });
    }

    const newTicket = new Ticket({ tripId, seatNumber, customerName, customerPhone });
    const savedTicket = await newTicket.save();
    res.status(201).json(savedTicket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

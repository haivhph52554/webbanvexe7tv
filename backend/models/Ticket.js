const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
  userId: { type: String }, // hoặc ObjectId nếu bạn có model User
  seatNumber: { type: String, required: true },
  status: { type: String, default: "booked" }
});

module.exports = mongoose.model("Ticket", ticketSchema);

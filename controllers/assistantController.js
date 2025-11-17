const Assistant = require('../models/Assistant');
const Ticket = require('../models/Ticket');
const Checkin = require('../models/Checkin');
const Trip = require('../models/Trip');
const TripSeatStatus = require('../models/TripSeatStatus');

exports.getAssistantInfo = async (req, res) => {
  try {
    const assistant = await Assistant.findOne({ userId: req.user.id })
      .populate('userId', 'name phone email role')
      .populate('busId')
      .populate('currentTrip');

    if (!assistant) return res.status(404).json({ message: 'Không tìm thấy lơ xe' });
    res.json(assistant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPassengerList = async (req, res) => {
  try {
    const assistant = await Assistant.findOne({ userId: req.user.id });
    if (!assistant || !assistant.currentTrip) {
      return res.status(400).json({ message: 'Không có chuyến hiện tại' });
    }

    const tickets = await Ticket.find({ tripId: assistant.currentTrip })
      .populate('userId', 'name phone email')
      .populate('seatId');

    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.checkInPassenger = async (req, res) => {
  try {
    const { ticketId } = req.body;
    if (!ticketId) return res.status(400).json({ message: 'ticketId là bắt buộc' });

    const assistant = await Assistant.findOne({ userId: req.user.id });
    if (!assistant) return res.status(404).json({ message: 'Không tìm thấy lơ xe' });

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: 'Không tìm thấy vé' });

    // Kiểm tra vé thuộc chuyến hiện tại
    if (assistant.currentTrip && ticket.tripId.toString() !== assistant.currentTrip.toString()) {
      return res.status(400).json({ message: 'Vé không thuộc chuyến hiện tại' });
    }

    // Tạo bản ghi checkin
    const checkin = new Checkin({
      ticketId: ticket._id,
      assistantId: assistant._id,
      checkedInTime: new Date(),
      status: 'checked_in'
    });
    await checkin.save();

    // Cập nhật vé và danh sách checkIn của assistant
    ticket.status = 'checked_in';
    await ticket.save();

    assistant.checkInList.push({
      passengerId: ticket.userId,
      ticketId: ticket._id,
      checkedIn: true,
      checkedInTime: new Date()
    });
    await assistant.save();

    res.json({ message: 'Check-in thành công', checkin });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.reportSeatIssue = async (req, res) => {
  try {
    const { seatStatusId, issue } = req.body;
    if (!seatStatusId || !issue) return res.status(400).json({ message: 'seatStatusId và issue là bắt buộc' });

    const assistant = await Assistant.findOne({ userId: req.user.id });
    if (!assistant) return res.status(404).json({ message: 'Không tìm thấy lơ xe' });

    const updated = await TripSeatStatus.findByIdAndUpdate(
      seatStatusId,
      { status: 'broken', issue },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Không tìm thấy trạng thái ghế' });
    res.json({ message: 'Báo cáo sự cố thành công', seat: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.endTrip = async (req, res) => {
  try {
    const { tripId, notes } = req.body;
    if (!tripId) return res.status(400).json({ message: 'tripId là bắt buộc' });

    const assistant = await Assistant.findOne({ userId: req.user.id });
    if (!assistant) return res.status(404).json({ message: 'Không tìm thấy lơ xe' });

    const trip = await Trip.findByIdAndUpdate(tripId, { status: 'completed', assistantNotes: notes }, { new: true });
    if (!trip) return res.status(404).json({ message: 'Không tìm thấy chuyến' });

    assistant.currentTrip = null;
    assistant.status = 'available';
    assistant.totalTrips = (assistant.totalTrips || 0) + 1;
    await assistant.save();

    res.json({ message: 'Kết thúc chuyến thành công', trip });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateRating = async (req, res) => {
  try {
    const { rating } = req.body;
    if (typeof rating !== 'number') return res.status(400).json({ message: 'rating phải là số' });

    const assistant = await Assistant.findOne({ userId: req.user.id });
    if (!assistant) return res.status(404).json({ message: 'Không tìm thấy lơ xe' });

    // Cập nhật trung bình đơn giản
    assistant.rating = (assistant.rating + rating) / 2;
    await assistant.save();

    res.json({ message: 'Cập nhật đánh giá thành công', assistant });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
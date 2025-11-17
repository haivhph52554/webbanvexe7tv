const Trip = require("../models/Trip");
const TripSeatStatus = require("../models/TripSeatStatus");

// 🟢 Lấy danh sách tất cả chuyến xe
exports.getAllTrips = async (req, res) => {
  try {
    const trips = await Trip.find();
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🟢 Thêm chuyến xe mới
exports.createTrip = async (req, res) => {
  try {
    const newTrip = new Trip(req.body);
    const savedTrip = await newTrip.save();
    res.status(201).json(savedTrip);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 🟢 Cập nhật chuyến xe
exports.updateTrip = async (req, res) => {
  try {
    const updatedTrip = await Trip.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedTrip);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 🟢 Xóa chuyến xe
exports.deleteTrip = async (req, res) => {
  try {
    await Trip.findByIdAndDelete(req.params.id);
    res.json({ message: "Trip deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy danh sách chuyến của 1 route
exports.getTripsByRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const { date } = req.query;

    const filter = { route: routeId };

    if (date) {
      const searchDate = new Date(date);
      const nextDay = new Date(date);
      nextDay.setDate(searchDate.getDate() + 1);

      filter.start_time = {
        $gte: searchDate,
        $lt: nextDay,
      };
    }

    const trips = await Trip.find(filter).sort({ start_time: 1 });
    res.json(trips);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy danh sách ghế của 1 chuyến
exports.getSeatsByTrip = async (req, res) => {
  try {
    const seats = await TripSeatStatus.find({ trip: req.params.tripId }).sort({ seat_number: 1 });
    res.json(seats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

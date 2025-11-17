const mongoose = require("mongoose");

const FeedbackSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, // ID của người dùng phản hồi
    tripId: { type: String, required: true }, // ID chuyến xe
    rating: { type: Number, min: 1, max: 5, required: true }, // đánh giá từ 1-5
    comment: { type: String, required: true }, // nội dung phản hồi
    createdAt: { type: Date, default: Date.now }
  },
  { collection: "feedbacks" } // tên collection trong MongoDB
);

module.exports = mongoose.model("Feedback", FeedbackSchema);

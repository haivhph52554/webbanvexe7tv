const mongoose = require('mongoose');

const ReplySchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  adminName: { type: String },
  message: { type: String },
  messageId: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const ContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  subject: { type: String },
  message: { type: String },
  // public token so non-authenticated users can view their thread
  publicToken: { type: String },
  tokenExpires: { type: Date },
  sent: { type: Boolean, default: false },
  sentAt: { type: Date },
  sendError: { type: String },
  messageId: { type: String },
  replies: [ReplySchema]
}, { timestamps: true });

module.exports = mongoose.model('Contact', ContactSchema);

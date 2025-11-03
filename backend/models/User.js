const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  phone: String,
  email: { type: String, unique: true, sparse: true },
  password_hash: String,
  role: { type: String, enum: ['customer','driver','assistant','admin'], default: 'customer' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);


require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/bus_booking');
    console.log('MongoDB Connected');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

const createAdmin = async () => {
  await connectDB();

  try {
    const email = 'admin@vexe7tv.com';
    const password = 'admin123';
    
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log('Admin user exists. Updating...');
      existingAdmin.password = password;
      existingAdmin.role = 'admin';
      await existingAdmin.save();
    } else {
      await User.create({
        name: 'Administrator',
        email: email,
        password: password,
        phone: '0900000000',
        role: 'admin'
      });
      console.log('Admin user created.');
    }
    
    console.log('Email: ' + email);
    console.log('Password: ' + password);

  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
};

createAdmin();

const express = require('express');
const router = express.Router();
const User = require('../models/User'); // ✅ Đường dẫn đúng

// create user
router.post('/', async (req, res) => {
  try {
    const u = await User.create(req.body);
    res.status(201).json(u);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

module.exports = router;

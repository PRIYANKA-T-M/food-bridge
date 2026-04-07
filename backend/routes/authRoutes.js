import express from 'express';
import User from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { role, name, email, password, location, watchRadius } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const userData = {
      role, name, email, passwordHash: password, location
    };
    
    if (role === 'ngo' && watchRadius) {
      userData.watchRadius = watchRadius;
    }

    const user = await User.create(userData);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location,
      watchRadius: user.watchRadius,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({ email });

    // Validate role is passed and matches
    if (user && user.role === role && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        watchRadius: user.watchRadius,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get profile
router.get('/profile', protect, async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    location: req.user.location,
    watchRadius: req.user.watchRadius,
    strikes: req.user.strikes
  });
});

export default router;

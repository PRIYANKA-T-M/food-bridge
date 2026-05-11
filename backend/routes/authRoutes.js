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
      strikes: user.strikes,
      isSuspended: user.isSuspended,
      language: user.language,
      theme: user.theme,
      ratingAverage: user.ratingAverage,
      ratingCount: user.ratingCount,
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
        strikes: user.strikes,
        isSuspended: user.isSuspended,
        language: user.language,
        theme: user.theme,
        ratingAverage: user.ratingAverage,
        ratingCount: user.ratingCount,
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
    strikes: req.user.strikes,
    isSuspended: req.user.isSuspended,
    language: req.user.language,
    theme: req.user.theme,
    ratingAverage: req.user.ratingAverage,
    ratingCount: req.user.ratingCount
  });
});

router.put('/preferences', protect, async (req, res) => {
  try {
    const { fcmToken, language, theme } = req.body;
    const update = {};

    if (typeof fcmToken === 'string') update.fcmToken = fcmToken;
    if (['en', 'ta', 'hi', 'ml'].includes(language)) update.language = language;
    if (theme?.mode || theme?.accent) {
      update.theme = {
        mode: theme.mode || req.user.theme?.mode || 'light',
        accent: theme.accent || req.user.theme?.accent || '#f97316'
      };
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select('-passwordHash');

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      location: updatedUser.location,
      watchRadius: updatedUser.watchRadius,
      strikes: updatedUser.strikes,
      isSuspended: updatedUser.isSuspended,
      language: updatedUser.language,
      theme: updatedUser.theme,
      ratingAverage: updatedUser.ratingAverage,
      ratingCount: updatedUser.ratingCount,
      token: req.headers.authorization.split(' ')[1]
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

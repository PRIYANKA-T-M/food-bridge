import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-passwordHash');
      return next();
    } catch (error) {
      console.error('Token Error Details:', {
        passedToken: token,
        secretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
        errorMessage: error.message
      });
      return res.status(401).json({ message: 'Not authorized, token failed: ' + error.message });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const requireNgo = (req, res, next) => {
  if (req.user && req.user.role === 'ngo') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an NGO' });
  }
};

export const requireRestaurant = (req, res, next) => {
  if (req.user && req.user.role === 'restaurant') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a Restaurant' });
  }
};

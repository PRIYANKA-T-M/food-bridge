import express from 'express';
import User from '../models/User.js';
import Listing from '../models/Listing.js';
import Claim from '../models/Claim.js';
import Feedback from '../models/Feedback.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect, requireAdmin);

router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/listings', async (req, res) => {
  try {
    const listings = await Listing.find().populate('donor', 'name email role isSuspended').sort({ createdAt: -1 }).limit(100);
    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/claims', async (req, res) => {
  try {
    const claims = await Claim.find()
      .populate('ngoId', 'name email strikes')
      .populate({ path: 'listingId', populate: { path: 'donor', select: 'name email' } })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(claims);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/overview', async (req, res) => {
  try {
    const [users, listings, claims, feedback] = await Promise.all([
      User.find().select('role strikes isSuspended createdAt'),
      Listing.find().select('isExpired remainingQuantity totalQuantity expiryTime createdAt'),
      Claim.find().select('status createdAt'),
      Feedback.find().select('rating createdAt')
    ]);

    const noShows = claims.filter(claim => claim.status === 'no-show').length;
    const completed = claims.filter(claim => claim.status === 'picked_up').length;

    res.json({
      totals: {
        users: users.length,
        restaurants: users.filter(user => user.role === 'restaurant').length,
        ngos: users.filter(user => user.role === 'ngo').length,
        activeListings: listings.filter(item => !item.isExpired && item.remainingQuantity > 0 && item.expiryTime > new Date()).length,
        claims: claims.length,
        completed,
        noShows,
        suspendedUsers: users.filter(user => user.isSuspended).length,
        averageRating: feedback.length ? Number((feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length).toFixed(2)) : 0
      },
      noShowRate: claims.length ? Number(((noShows / claims.length) * 100).toFixed(1)) : 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/block-user/:id', async (req, res) => {
  try {
    const { isSuspended = true } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isSuspended }, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/listings/:id', async (req, res) => {
  try {
    const listing = await Listing.findByIdAndDelete(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    res.json({ message: 'Listing removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

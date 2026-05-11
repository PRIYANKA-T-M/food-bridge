import express from 'express';
import Feedback from '../models/Feedback.js';
import Claim from '../models/Claim.js';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, async (req, res) => {
  try {
    const { claimId, toUser, rating, comment } = req.body;
    const claim = await Claim.findById(claimId).populate({ path: 'listingId', select: 'donor' });
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (claim.status !== 'picked_up') return res.status(400).json({ message: 'Feedback is available after pickup completion' });

    const isNgo = claim.ngoId.toString() === req.user._id.toString();
    const isRestaurant = claim.listingId?.donor?.toString() === req.user._id.toString();
    if (!isNgo && !isRestaurant) return res.status(403).json({ message: 'Not allowed to review this claim' });

    const feedback = await Feedback.create({
      claim: claimId,
      fromUser: req.user._id,
      toUser,
      rating: Number(rating),
      comment
    });

    const stats = await Feedback.aggregate([
      { $match: { toUser: feedback.toUser } },
      { $group: { _id: '$toUser', average: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    if (stats[0]) {
      await User.findByIdAndUpdate(feedback.toUser, {
        ratingAverage: Number(stats[0].average.toFixed(2)),
        ratingCount: stats[0].count
      });
    }

    res.status(201).json(feedback);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'You already submitted feedback for this claim' });
    }
    res.status(500).json({ message: error.message });
  }
});

router.get('/:userId', protect, async (req, res) => {
  try {
    const feedback = await Feedback.find({ toUser: req.params.userId })
      .populate('fromUser', 'name role')
      .sort({ createdAt: -1 })
      .limit(30);
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

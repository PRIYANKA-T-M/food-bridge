import express from 'express';
import Claim from '../models/Claim.js';
import Listing from '../models/Listing.js';
import { protect, requireNgo } from '../middleware/authMiddleware.js';
import { io } from '../server.js';

const router = express.Router();

// Generate random 4 digit OTP
const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

// @route   POST /api/claims
// @desc    Create a claim (Partial or Full)
router.post('/', protect, requireNgo, async (req, res) => {
  try {
    const { listingId, requestedQty } = req.body;

    const listingCheck = await Listing.findById(listingId);
    if (!listingCheck) return res.status(404).json({ message: 'Listing not found' });
    
    // API Level Expiry validation
    if (new Date() > new Date(listingCheck.expiryTime) || listingCheck.isExpired) {
      return res.status(400).json({ message: 'This item has already expired' });
    }

    if (listingCheck.remainingQuantity < requestedQty) {
      return res.status(400).json({ message: 'Not enough quantity remaining' });
    }

    // Atomic update to prevent race conditions
    const listing = await Listing.findOneAndUpdate(
      { _id: listingId, remainingQuantity: { $gte: requestedQty } },
      { $inc: { remainingQuantity: -requestedQty } },
      { new: true }
    );

    if (!listing) {
      // If findOneAndUpdate returned null, another request claimed it first
      return res.status(409).json({ message: 'Sorry, this listing was heavily claimed simultaneously. Try again.' });
    }

    const otp = generateOTP();

    const claim = await Claim.create({
      listingId,
      ngoId: req.user._id,
      quantity: requestedQty,
      otpCode: otp
    });

    // Notify donor restaurant
    io.to(listingCheck.donor.toString()).emit('claim_notification', {
      listingId,
      quantity: requestedQty,
      ngoName: req.user.name,
      otpCode: otp
    });

    res.status(201).json({
      message: 'Claim successful. Please pickup before expiry.',
      claim,
      otpCode: otp // Usually we'd abstract this or share differently, but OK for MVP
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/claims/:id/pickup
// @desc    Complete pickup using OTP and photo verification url
router.put('/:id/pickup', protect, async (req, res) => {
  try {
    const { otpCode, pickupPhoto } = req.body; // Photo uploaded via frontend to Cloudinary first
    
    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ message: 'Claim not found' });

    if (claim.status !== 'pending') {
      return res.status(400).json({ message: `Claim is already ${claim.status}` });
    }

    if (claim.otpCode !== otpCode) {
      return res.status(400).json({ message: 'Invalid OTP code' });
    }

    if (!pickupPhoto) {
      return res.status(400).json({ message: 'Pickup photo required' });
    }

    claim.status = 'picked_up';
    claim.pickupPhoto = pickupPhoto;
    await claim.save();

    res.json({ message: 'Pickup completed successfully', claim });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

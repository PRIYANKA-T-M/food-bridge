import express from 'express';
import Claim from '../models/Claim.js';
import Listing from '../models/Listing.js';
import User from '../models/User.js';
import { protect, requireNgo, requireRestaurant } from '../middleware/authMiddleware.js';
import { io } from '../server.js';
import { notifyUser } from '../utils/notifications.js';

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
      otpCode: otp,
      currentLocation: undefined
    });

    // Notify donor restaurant
    io.to(listingCheck.donor.toString()).emit('claim_notification', {
      listingId,
      claimId: claim._id,
      quantity: requestedQty,
      ngoName: req.user.name,
      otpCode: otp
    });

    await notifyUser({
      recipient: listingCheck.donor,
      sender: req.user._id,
      type: 'CLAIM_ACCEPTED',
      title: 'New claim accepted',
      message: `${req.user.name} claimed ${requestedQty} portions. OTP: ${otp}`,
      data: { listingId, claimId: claim._id, quantity: requestedQty, otpCode: otp }
    });

    await notifyUser({
      recipient: req.user._id,
      sender: listingCheck.donor,
      type: 'CLAIM_ACCEPTED',
      title: 'Claim confirmed',
      message: `Your claim is confirmed. Show OTP ${otp} at pickup.`,
      data: { listingId, claimId: claim._id, quantity: requestedQty, otpCode: otp }
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

// @route   GET /api/claims/history
// @desc    Paginated claim history for the logged-in user
router.get('/history', protect, async (req, res) => {
  try {
    const { status, search = '', page = 1, limit = 20, sort = 'desc' } = req.query;
    const filter = {};

    if (req.user.role === 'ngo') {
      filter.ngoId = req.user._id;
    } else if (req.user.role === 'restaurant') {
      const listings = await Listing.find({ donor: req.user._id }).select('_id');
      filter.listingId = { $in: listings.map(item => item._id) };
    }

    if (status && status !== 'all') filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const direction = sort === 'asc' ? 1 : -1;
    const [claims, total] = await Promise.all([
      Claim.find(filter)
        .populate({ path: 'listingId', populate: { path: 'donor', select: 'name location ratingAverage ratingCount' } })
        .populate('ngoId', 'name location ratingAverage ratingCount strikes')
        .sort({ createdAt: direction })
        .skip(skip)
        .limit(Number(limit)),
      Claim.countDocuments(filter)
    ]);

    const normalizedSearch = search.toLowerCase();
    const items = normalizedSearch
      ? claims.filter(claim => {
          const listing = claim.listingId;
          const haystack = `${listing?.foodType || ''} ${listing?.donor?.name || ''} ${claim.ngoId?.name || ''}`.toLowerCase();
          return haystack.includes(normalizedSearch);
        })
      : claims;

    res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) || 1 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/claims/restaurant
// @desc    Active restaurant claims
router.get('/restaurant', protect, requireRestaurant, async (req, res) => {
  try {
    const listings = await Listing.find({ donor: req.user._id }).select('_id');
    const claims = await Claim.find({ listingId: { $in: listings.map(item => item._id) } })
      .populate('ngoId', 'name location ratingAverage ratingCount strikes')
      .populate('listingId')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(claims);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/claims/:id
// @desc    Claim detail
router.get('/:id', protect, async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id)
      .populate({ path: 'listingId', populate: { path: 'donor', select: 'name location ratingAverage ratingCount' } })
      .populate('ngoId', 'name location ratingAverage ratingCount strikes');
    if (!claim) return res.status(404).json({ message: 'Claim not found' });

    const isNgoOwner = claim.ngoId?._id?.toString() === req.user._id.toString();
    const isRestaurantOwner = claim.listingId?.donor?._id?.toString() === req.user._id.toString();
    if (!isNgoOwner && !isRestaurantOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed to view this claim' });
    }

    res.json(claim);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/start-delivery', protect, requireNgo, async (req, res) => {
  try {
    const { coordinates } = req.body;
    const claim = await Claim.findById(req.params.id).populate('listingId');
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (claim.ngoId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the claiming NGO can start pickup' });
    }

    claim.deliveryStatus = 'en_route';
    claim.deliveryStartedAt = new Date();
    if (Array.isArray(coordinates)) {
      claim.currentLocation = { type: 'Point', coordinates };
    }
    await claim.save();

    const payload = { claimId: claim._id, deliveryStatus: claim.deliveryStatus, currentLocation: claim.currentLocation };
    io.to(`claim:${claim._id}`).emit('START_DELIVERY', payload);
    io.to(claim.listingId.donor.toString()).emit('START_DELIVERY', payload);

    await notifyUser({
      recipient: claim.listingId.donor,
      sender: req.user._id,
      type: 'DELIVERY_UPDATE',
      title: 'Pickup started',
      message: `${req.user.name} started the pickup route.`,
      data: { claimId: claim._id }
    });

    res.json({ message: 'Pickup tracking started', claim });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/location', protect, requireNgo, async (req, res) => {
  try {
    const { coordinates, etaMinutes } = req.body;
    const claim = await Claim.findById(req.params.id).populate('listingId');
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (claim.ngoId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the claiming NGO can update location' });
    }

    claim.deliveryStatus = 'en_route';
    claim.currentLocation = { type: 'Point', coordinates };
    await claim.save();

    const payload = { claimId: claim._id, deliveryStatus: claim.deliveryStatus, currentLocation: claim.currentLocation, etaMinutes };
    io.to(`claim:${claim._id}`).emit('LOCATION_UPDATE', payload);
    io.to(claim.listingId.donor.toString()).emit('LOCATION_UPDATE', payload);

    res.json({ message: 'Location updated', claim });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/arrived', protect, requireNgo, async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id).populate('listingId');
    if (!claim) return res.status(404).json({ message: 'Claim not found' });
    if (claim.ngoId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the claiming NGO can mark arrival' });
    }

    claim.deliveryStatus = 'arrived';
    if (claim.listingId?.location?.coordinates) {
      claim.currentLocation = {
        type: 'Point',
        coordinates: claim.listingId.location.coordinates
      };
    }
    await claim.save();

    const payload = {
      claimId: claim._id,
      deliveryStatus: claim.deliveryStatus,
      currentLocation: claim.currentLocation
    };
    io.to(`claim:${claim._id}`).emit('LOCATION_UPDATE', payload);
    io.to(claim.listingId.donor.toString()).emit('LOCATION_UPDATE', payload);

    await notifyUser({
      recipient: claim.listingId.donor,
      sender: req.user._id,
      type: 'DELIVERY_UPDATE',
      title: 'Pickup team arrived',
      message: `${req.user.name} reached the restaurant. Verify OTP ${claim.otpCode} to complete pickup.`,
      data: { claimId: claim._id, otpCode: claim.otpCode }
    });

    res.json({ message: 'Arrival marked', claim });
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
    claim.deliveryStatus = 'completed';
    claim.deliveryCompletedAt = new Date();
    claim.pickupPhoto = pickupPhoto;
    await claim.save();

    const listing = await Listing.findById(claim.listingId);
    io.to(`claim:${claim._id}`).emit('DELIVERY_COMPLETED', { claimId: claim._id, status: claim.status });
    if (listing?.donor) {
      io.to(listing.donor.toString()).emit('OTP_VERIFIED', { claimId: claim._id, status: claim.status });
      await notifyUser({
        recipient: listing.donor,
        sender: req.user._id,
        type: 'OTP_VERIFIED',
        title: 'Pickup verified',
        message: 'OTP verified and pickup marked complete.',
        data: { claimId: claim._id }
      });
    }

    await notifyUser({
      recipient: claim.ngoId,
      sender: listing?.donor,
      type: 'OTP_VERIFIED',
      title: 'Pickup completed',
      message: 'OTP verified. This pickup is now completed.',
      data: { claimId: claim._id }
    });

    res.json({ message: 'Pickup completed successfully', claim });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

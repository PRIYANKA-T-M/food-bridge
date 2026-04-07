import express from 'express';
import Listing from '../models/Listing.js';
import User from '../models/User.js';
import { protect, requireRestaurant, requireNgo } from '../middleware/authMiddleware.js';
import { io } from '../server.js';

const router = express.Router();

// @route   POST /api/listings
// @desc    Create a new listing & notify nearby NGOs
router.post('/', protect, requireRestaurant, async (req, res) => {
  try {
    const { foodType, totalQuantity, expiryTime, coordinates } = req.body;

    const listing = await Listing.create({
      donor: req.user._id,
      foodType,
      totalQuantity,
      remainingQuantity: totalQuantity,
      expiryTime,
      location: {
        type: 'Point',
        coordinates // [longitude, latitude]
      }
    });

    // Notify nearby NGOs using aggregation pipeline for dynamic radius
    try {
      const nearbyNgos = await User.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates },
            distanceField: 'dist.calculated',
            spherical: true,
            query: { role: 'ngo' }
          }
        },
        {
          $match: {
            $expr: {
              $lte: ['$dist.calculated', { $multiply: ['$watchRadius', 1000] }]
            }
          }
        }
      ]);

      nearbyNgos.forEach(ngo => {
        io.to(ngo._id.toString()).emit('NEW_SURPLUS', {
          message: 'New food surplus nearby!',
          listingId: listing._id,
          restaurantName: req.user.name,
          distanceMeters: ngo.dist.calculated
        });
      });
    } catch (pushErr) {
      console.error('Failed to send push notifications:', pushErr.message);
    }

    res.status(201).json(listing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/listings/nearby
// @desc    Get nearby listings for an NGO based on their watchRadius or map click
router.get('/nearby', protect, requireNgo, async (req, res) => {
  try {
    const ngo = req.user;
    let searchCoordinates = ngo.location?.coordinates;
    
    if (req.query.lat && req.query.lng) {
      searchCoordinates = [Number(req.query.lng), Number(req.query.lat)];
    }

    if (!searchCoordinates) {
      return res.status(400).json({ message: 'NGO location not set' });
    }

    const now = new Date();

    const listings = await Listing.find({
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: searchCoordinates
          },
          $maxDistance: (ngo.watchRadius || 5) * 1000 // meters
        }
      },
      remainingQuantity: { $gt: 0 },
      isExpired: false,
      expiryTime: { $gt: now } // DYNAMIC Expiry validation at API level
    }).populate('donor', 'name');

    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

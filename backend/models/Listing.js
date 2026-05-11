import mongoose from 'mongoose';

const listingSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  foodType: { type: String, required: true },
  totalQuantity: { type: Number, required: true },
  remainingQuantity: { type: Number, required: true },
  expiryTime: { type: Date, required: true },
  isExpired: { type: Boolean, default: false },
  location: { 
    type: { type: String, default: 'Point' }, 
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  }
}, { timestamps: true });

listingSchema.index({ location: '2dsphere' });
listingSchema.index({ donor: 1, isExpired: 1, createdAt: -1 });
listingSchema.index({ expiryTime: 1, isExpired: 1 });

const Listing = mongoose.model('Listing', listingSchema);
export default Listing;

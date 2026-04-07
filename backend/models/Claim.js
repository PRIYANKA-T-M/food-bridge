import mongoose from 'mongoose';

const claimSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quantity: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'picked_up', 'no-show'], default: 'pending' },
  pickupPhoto: { type: String }, // Cloudinary URL
  otpCode: { type: String, required: true },
}, { timestamps: true });

const Claim = mongoose.model('Claim', claimSchema);
export default Claim;

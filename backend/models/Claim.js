import mongoose from 'mongoose';

const claimSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  ngoId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quantity: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'picked_up', 'no-show'], default: 'pending' },
  pickupPhoto: { type: String }, // Cloudinary URL
  otpCode: { type: String, required: true },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: function() {
        return Array.isArray(this.currentLocation?.coordinates) && this.currentLocation.coordinates.length === 2;
      }
    },
    coordinates: {
      type: [Number],
      validate: {
        validator(value) {
          return value === undefined || (Array.isArray(value) && value.length === 2);
        },
        message: 'currentLocation.coordinates must contain [longitude, latitude]'
      }
    }
  },
  deliveryStatus: {
    type: String,
    enum: ['not_started', 'en_route', 'arrived', 'completed'],
    default: 'not_started'
  },
  deliveryStartedAt: { type: Date },
  deliveryCompletedAt: { type: Date },
}, { timestamps: true });

claimSchema.index({ ngoId: 1, status: 1, createdAt: -1 });
claimSchema.index({ listingId: 1, status: 1, createdAt: -1 });
claimSchema.index(
  { currentLocation: '2dsphere' },
  { partialFilterExpression: { 'currentLocation.coordinates': { $exists: true } } }
);

claimSchema.pre('validate', function() {
  const coordinates = this.currentLocation?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    this.currentLocation = undefined;
  } else {
    this.currentLocation.type = 'Point';
  }
});

const Claim = mongoose.model('Claim', claimSchema);
export default Claim;

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['restaurant', 'ngo', 'admin'],
    required: true
  },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  location: { 
    type: { type: String, default: 'Point' }, 
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  watchRadius: { type: Number, default: 5 }, // In km, typically for NGO
  strikes: { type: Number, default: 0 },
  isSuspended: { type: Boolean, default: false },
  fcmToken: { type: String, default: '' },
  language: { type: String, enum: ['en', 'ta', 'hi', 'ml'], default: 'en' },
  theme: {
    mode: { type: String, enum: ['light', 'dark'], default: 'light' },
    accent: { type: String, default: '#f97316' }
  },
  ratingAverage: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 }
}, { timestamps: true });

// 2dsphere index for geospatial queries
userSchema.index({ location: '2dsphere' });

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

const User = mongoose.model('User', userSchema);
export default User;

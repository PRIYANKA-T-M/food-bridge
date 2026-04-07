import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  role: { 
    type: String, 
    enum: ['restaurant', 'ngo'],
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
  strikes: { type: Number, default: 0 }
}, { timestamps: true });

// 2dsphere index for geospatial queries
userSchema.index({ location: '2dsphere' });

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

const User = mongoose.model('User', userSchema);
export default User;

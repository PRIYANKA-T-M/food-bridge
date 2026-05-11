import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  claim: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim', required: true },
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, trim: true, maxlength: 600, default: '' }
}, { timestamps: true });

feedbackSchema.index({ toUser: 1, createdAt: -1 });
feedbackSchema.index({ claim: 1, fromUser: 1 }, { unique: true });

const Feedback = mongoose.model('Feedback', feedbackSchema);
export default Feedback;

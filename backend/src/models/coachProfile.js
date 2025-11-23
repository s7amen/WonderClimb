import mongoose from 'mongoose';

const coachProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  defaultRate: {
    type: Number,
    default: null,
    min: 0,
  },
  currency: {
    type: String,
    default: 'EUR',
    trim: true,
  },
  notes: {
    type: String,
    default: '',
    trim: true,
  },
}, {
  timestamps: true,
});

// Index on userId (already unique, but explicit)
coachProfileSchema.index({ userId: 1 }, { unique: true });

export const CoachProfile = mongoose.model('CoachProfile', coachProfileSchema);


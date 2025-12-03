import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    index: true,
  },
  climberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  bookedById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['booked', 'cancelled'],
    default: 'booked',
  },
  trainingPassId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingPass',
    default: null,
  },
  pricingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pricing',
    default: null,
  },
  amount: {
    type: Number,
    default: null,
  },
  createdById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedById: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Compound index to prevent double booking for same session
bookingSchema.index({ sessionId: 1, climberId: 1 }, { unique: true, partialFilterExpression: { status: 'booked' } });

export const Booking = mongoose.model('Booking', bookingSchema);

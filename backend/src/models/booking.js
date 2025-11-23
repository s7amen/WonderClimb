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
  cancelledAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Compound index to prevent duplicate bookings (for active bookings only)
// Partial index: only applies to bookings with status 'booked'
bookingSchema.index(
  { sessionId: 1, climberId: 1 }, 
  { 
    unique: true,
    partialFilterExpression: { status: 'booked' }
  }
);

// Index on climberId for parent queries
bookingSchema.index({ climberId: 1 });

// Index on bookedById for user booking history
bookingSchema.index({ bookedById: 1 });

export const Booking = mongoose.model('Booking', bookingSchema);


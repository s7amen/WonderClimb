import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  date: {
    type: Date,
    required: true,
  },
  durationMinutes: {
    type: Number,
    required: true,
    min: 1,
  },
  capacity: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'cancelled', 'completed'],
    default: 'active',
  },
  coachIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: [],
  },
  coachFees: [{
    coachId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['unpaid', 'paid'],
      default: 'unpaid',
    },
    financeEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinanceEntry',
      default: null,
    },
  }],
  revenueFromPasses: {
    type: Number,
    default: 0,
  },
  revenueFromSingles: {
    type: Number,
    default: 0,
  },
  revenueTotal: {
    type: Number,
    default: 0,
  },
  location: {
    type: String,
    default: '',
    trim: true,
  },
  targetGroups: {
    type: [String],
    default: [],
  },
  ageGroups: {
    type: [String],
    default: [],
  },
}, {
  timestamps: true,
});

// Indexes for calendar and "today" queries
sessionSchema.index({ date: 1, status: 1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ coachIds: 1 });

export const Session = mongoose.model('Session', sessionSchema);


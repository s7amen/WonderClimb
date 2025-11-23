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
    enum: ['active', 'cancelled'],
    default: 'active',
  },
  coachIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: [],
  },
  coachPayoutAmount: {
    type: Number,
    default: null,
    min: 0,
  },
  coachPayoutStatus: {
    type: String,
    enum: ['unpaid', 'paid'],
    default: 'unpaid',
  },
  location: {
    type: String,
    default: '',
    trim: true,
  },
  targetGroups: {
    type: [String],
    enum: ['beginner', 'experienced', 'advanced'],
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


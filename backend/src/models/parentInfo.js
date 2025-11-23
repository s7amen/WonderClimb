import mongoose from 'mongoose';

const parentInfoSchema = new mongoose.Schema({
  climberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  parentName: {
    type: String,
    required: true,
    trim: true,
  },
  parentPhone: {
    type: String,
    default: '',
    trim: true,
  },
  parentEmail: {
    type: String,
    default: '',
    lowercase: true,
    trim: true,
  },
  relationship: {
    type: String,
    default: '',
    trim: true,
  },
  isPrimaryContact: {
    type: Boolean,
    default: false,
  },
  hasUserAccount: {
    type: Boolean,
    default: false,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

// Index on climberId for efficient queries
parentInfoSchema.index({ climberId: 1 });

// Index on userId for reverse lookups
parentInfoSchema.index({ userId: 1 });

export const ParentInfo = mongoose.model('ParentInfo', parentInfoSchema);


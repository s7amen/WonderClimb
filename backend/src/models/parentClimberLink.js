import mongoose from 'mongoose';

const parentClimberLinkSchema = new mongoose.Schema({
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  climberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Compound index for efficient parent->climber queries
parentClimberLinkSchema.index({ parentId: 1, climberId: 1 });

// Index on climberId for reverse lookups
parentClimberLinkSchema.index({ climberId: 1 });

export const ParentClimberLink = mongoose.model('ParentClimberLink', parentClimberLinkSchema);


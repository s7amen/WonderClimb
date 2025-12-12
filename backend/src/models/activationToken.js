import mongoose from 'mongoose';

const activationTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  usedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Index for finding valid tokens
activationTokenSchema.index({ userId: 1, expiresAt: 1 });
activationTokenSchema.index({ token: 1, expiresAt: 1 });

// Virtual to check if token is expired
activationTokenSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

// Virtual to check if token is used
activationTokenSchema.virtual('isUsed').get(function() {
  return this.usedAt !== null;
});

// Virtual to check if token is valid
activationTokenSchema.virtual('isValid').get(function() {
  return !this.isExpired && !this.isUsed;
});

export const ActivationToken = mongoose.model('ActivationToken', activationTokenSchema);




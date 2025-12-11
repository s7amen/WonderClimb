import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: false,
    // unique: true removed - using explicit index below with sparse/partialFilterExpression
    // sparse: true removed - using explicit index below
    // sparse: true, // Allows multiple null values but enforces uniqueness for non-null
    lowercase: true,
    trim: true,
    set: function (value) {
      // Ensure null stays null (don't transform null to empty string)
      if (value === null || value === undefined) {
        return null;
      }
      // Apply lowercase and trim only for non-null values
      return typeof value === 'string' ? value.toLowerCase().trim() : value;
    },
  },
  passwordHash: {
    type: String,
    required: false,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  middleName: {
    type: String,
    required: false,
    trim: true,
    default: null,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    default: '',
    trim: true,
  },
  roles: {
    type: [String],
    required: true,
    enum: ['admin', 'coach', 'climber', 'instructor'],
    validate: {
      validator: function (roles) {
        return roles && roles.length > 0;
      },
      message: 'User must have at least one role',
    },
  },
  accountStatus: {
    type: String,
    required: true,
    enum: ['active', 'inactive'],
    default: 'inactive',
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerifiedAt: {
    type: Date,
    default: null,
  },
  emailActivationStatus: {
    type: String,
    enum: ['activated', 'email_sent', 'not_activated'],
    default: null, // null за backward compatibility - третира се като 'activated'
  },
  isTrainee: {
    type: Boolean,
    default: false,
  },
  dateOfBirth: {
    type: Date,
    default: null,
  },
  notes: {
    type: String,
    default: '',
    trim: true,
  },
  photos: {
    type: [{
      filename: {
        type: String,
        required: true,
        trim: true,
      },
      isMain: {
        type: Boolean,
        default: false,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    default: [],
  },
  // Legacy fields - kept for backward compatibility during migration
  photo: {
    type: String,
    default: null,
    trim: true,
  },
  photoHistory: {
    type: [String],
    default: [],
  },
  clubMembership: {
    isCurrentMember: {
      type: Boolean,
      default: false,
    },
    membershipHistory: [{
      startDate: Date,
      endDate: Date,
      status: String,
    }],
  },
}, {
  timestamps: true,
});

// Indexes
userSchema.index({ email: 1 }, {
  unique: true,
  sparse: true,
  partialFilterExpression: { email: { $ne: null } }
});
userSchema.index({ accountStatus: 1 });
userSchema.index({ roles: 1 });
userSchema.index({ dateOfBirth: 1 });
// Compound index for duplicate checking
userSchema.index({ firstName: 1, lastName: 1, dateOfBirth: 1 });

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) {
    return false; // No password set, cannot compare
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Static method to hash password
userSchema.statics.hashPassword = async function (password) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

export const User = mongoose.model('User', userSchema);


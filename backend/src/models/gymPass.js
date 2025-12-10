import mongoose from 'mongoose';

const gymPassSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false, //  Optional if familyId is present
        index: true,
    },
    passId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    type: {
        type: String,
        required: true,
        enum: ['single', 'prepaid_entries', 'time_based'],
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    totalEntries: {
        type: Number,
        default: null,
    },
    remainingEntries: {
        type: Number,
        default: null,
    },
    validFrom: {
        type: Date,
        default: null,
    },
    validUntil: {
        type: Date,
        default: null,
    },
    isFamilyPass: {
        type: Boolean,
        default: false,
    },
    familyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Family',
        default: null,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    paymentStatus: {
        type: String,
        required: true,
        enum: ['paid', 'unpaid'],
        default: 'unpaid',
    },
    notes: {
        type: String,
        trim: true,
    },
    pricingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pricing',
        required: true,
    },
    pricingCode: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    discountPercent: {
        type: Number,
        default: null,
    },
    discountReason: {
        type: String,
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
    physicalCardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PhysicalCard',
        default: null,
    },
}, {
    timestamps: true,
});

// Indexes for performance
gymPassSchema.index({ userId: 1, isActive: 1, validUntil: 1 }); // User profile lookups
gymPassSchema.index({ validUntil: 1 }); // Expiry checks
gymPassSchema.index({ validFrom: 1 }); // Future checks
gymPassSchema.index({ isActive: 1 }); // Status filtering

// Virtual for checking validity logic
gymPassSchema.virtual('isValid').get(function () {
    const now = new Date();
    const isDateValid = (!this.validFrom || now >= this.validFrom) &&
        (!this.validUntil || now <= this.validUntil);

    const isEntriesValid = (this.totalEntries === null || this.totalEntries === 0) ||
        (this.remainingEntries !== null && this.remainingEntries > 0);

    return isDateValid && isEntriesValid;
});

// Middleware to ensure either userId or familyId is present
gymPassSchema.pre('save', function (next) {
    if (!this.userId && !this.familyId) {
        return next(new Error('GymPass must belong to either a User or a Family.'));
    }
    next();
});

export const GymPass = mongoose.model('GymPass', gymPassSchema);

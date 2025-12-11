import mongoose from 'mongoose';

const trainingPassSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
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
    passId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    type: {
        type: String,
        required: true,
        enum: ['monthly', 'pack', 'single', 'time_based', 'prepaid_entries'],
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    totalSessions: {
        type: Number,
        default: null,
    },
    remainingSessions: {
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

// Virtual for checking validity logic
trainingPassSchema.virtual('isValid').get(function () {
    const now = new Date();
    const isDateValid = (!this.validFrom || now >= this.validFrom) &&
        (!this.validUntil || now <= this.validUntil);

    const isSessionsValid = (this.totalSessions === null || this.totalSessions === 0) ||
        (this.remainingSessions !== null && this.remainingSessions > 0);

    return isDateValid && isSessionsValid;
});

// Middleware to ensure either userId or familyId is present
trainingPassSchema.pre('save', function (next) {
    if (!this.userId && !this.familyId) {
        return next(new Error('TrainingPass must belong to either a User or a Family.'));
    }
    next();
});

// Middleware to prevent passId changes after creation
trainingPassSchema.pre('save', function (next) {
    // Only check if this is an update (not a new document)
    if (!this.isNew && this.isModified('passId')) {
        return next(new Error('passId cannot be changed after creation'));
    }
    next();
});

export const TrainingPass = mongoose.model('TrainingPass', trainingPassSchema);

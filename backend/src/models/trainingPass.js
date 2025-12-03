import mongoose from 'mongoose';

const trainingPassSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
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
        enum: ['monthly', 'pack', 'single'],
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    totalSessions: {
        type: Number,
        required: true,
        min: 0,
    },
    remainingSessions: {
        type: Number,
        required: true,
        min: 0,
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
}, {
    timestamps: true,
});

// Virtual for checking validity logic
trainingPassSchema.virtual('isValid').get(function () {
    const now = new Date();
    const isDateValid = (!this.validFrom || now >= this.validFrom) &&
        (!this.validUntil || now <= this.validUntil);

    const isSessionsValid = this.remainingSessions > 0;

    return isDateValid && isSessionsValid;
});

export const TrainingPass = mongoose.model('TrainingPass', trainingPassSchema);

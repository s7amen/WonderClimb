import mongoose from 'mongoose';

const pricingSchema = new mongoose.Schema({
    pricingCode: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    labelBg: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: String,
        required: true,
        enum: ['gym_pass', 'training_pass', 'gym_single_visit', 'training_single', 'product', 'birthday', 'events', 'course', 'other'],
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    validityDays: {
        type: Number,
        default: null,
    },
    validityType: {
        type: String,
        enum: ['days', 'months'],
        default: 'days',
    },
    maxEntries: {
        type: Number,
        default: null,
    },
    validFrom: {
        type: Date,
        required: true,
        default: Date.now,
    },
    validUntil: {
        type: Date,
        default: null,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    notes: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
});

// Index for active pricings
pricingSchema.index({ pricingCode: 1, isActive: 1 });

export const Pricing = mongoose.model('Pricing', pricingSchema);

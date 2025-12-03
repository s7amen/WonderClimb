import mongoose from 'mongoose';

const gymVisitSchema = new mongoose.Schema({
    gymPassId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GymPass',
        default: null,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    type: {
        type: String,
        required: true,
        enum: ['single', 'pass', 'multisport'],
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
    checkInTime: {
        type: Date,
        required: true,
        default: Date.now,
    },
    checkedInById: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    pricingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pricing',
        default: null,
    },
    pricingCode: {
        type: String,
        default: null,
    },
    amount: {
        type: Number,
        default: null,
    },
}, {
    timestamps: true,
});

gymVisitSchema.index({ date: 1 });
gymVisitSchema.index({ userId: 1 });
gymVisitSchema.index({ gymPassId: 1 });

export const GymVisit = mongoose.model('GymVisit', gymVisitSchema);

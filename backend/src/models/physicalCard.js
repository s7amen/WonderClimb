import mongoose from 'mongoose';

const physicalCardSchema = new mongoose.Schema({
    physicalCardCode: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        match: /^\d{6}$/, // Exactly 6 digits
        index: true,
    },
    status: {
        type: String,
        required: true,
        enum: ['free', 'linked'],
        default: 'free',
        index: true,
    },
    linkedToCardInternalCode: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        index: true,
    },
    linkedToPassType: {
        type: String,
        enum: ['gym', 'training'],
        default: null,
        index: true,
    },
}, {
    timestamps: true,
});

// Compound indexes for faster lookups
physicalCardSchema.index({ status: 1, linkedToCardInternalCode: 1 });
physicalCardSchema.index({ status: 1, linkedToPassType: 1 });

export const PhysicalCard = mongoose.model('PhysicalCard', physicalCardSchema);


import mongoose from 'mongoose';

const physicalCardQueueSchema = new mongoose.Schema({
    physicalCardCode: {
        type: String,
        required: true,
        index: true,
        trim: true,
    },
    // Универсални полета - работят за gym И training
    pendingPassId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'passType',
    },
    passType: {
        type: String,
        required: true,
        enum: ['GymPass', 'TrainingPass'],
    },
    currentActivePassId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'currentPassType',
        default: null,
    },
    currentPassType: {
        type: String,
        enum: ['GymPass', 'TrainingPass'],
        default: null,
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'activated', 'cancelled'],
        default: 'pending',
        index: true,
    },
    queuedAt: {
        type: Date,
        default: Date.now,
    },
    activatedAt: {
        type: Date,
        default: null,
    },
    createdById: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});

// Compound index for faster queries
physicalCardQueueSchema.index({ status: 1, queuedAt: 1 });
physicalCardQueueSchema.index({ physicalCardCode: 1, status: 1 });

export const PhysicalCardQueue = mongoose.model('PhysicalCardQueue', physicalCardQueueSchema);


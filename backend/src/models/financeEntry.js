import mongoose from 'mongoose';

const financeEntrySchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['revenue', 'expense'],
        index: true,
    },
    area: {
        type: String,
        required: true,
        enum: ['gym', 'training', 'general'],
        index: true,
    },
    personId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    personRole: {
        type: String,
        default: null,
    },
    source: {
        type: String,
        required: true,
        enum: [
            'gym_pass',
            'training_pass',
            'gym_single_visit',
            'training_single',
            'coach_fee',
            'instructor_fee',
            'product',
            'birthday',
            'other'
        ],
    },
    sourceId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    sessionIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
    }],
    amount: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
    description: {
        type: String,
        trim: true,
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

financeEntrySchema.index({ date: 1 });
financeEntrySchema.index({ type: 1, area: 1 });

export const FinanceEntry = mongoose.model('FinanceEntry', financeEntrySchema);

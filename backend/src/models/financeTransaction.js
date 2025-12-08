import mongoose from 'mongoose';

const financeTransactionSchema = new mongoose.Schema({
    totalAmount: {
        type: Number,
        required: true,
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'bank', 'other'],
        default: 'cash',
        required: true,
    },
    paidAt: {
        type: Date,
        default: Date.now,
        required: true,
    },
    handledById: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    payerClimberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    source: {
        type: String,
        enum: ['gym', 'training', 'mixed'],
        required: true,
        default: 'gym',
    },
    notes: {
        type: String,
        default: null,
        trim: true,
    },
}, {
    timestamps: true,
});

// Create a virtual field to easily access the lines/entries of this transaction
financeTransactionSchema.virtual('entries', {
    ref: 'FinanceEntry',
    localField: '_id',
    foreignField: 'transactionId',
});

// Ensure virtuals are included in toJSON/toObject
financeTransactionSchema.set('toJSON', { virtuals: true });
financeTransactionSchema.set('toObject', { virtuals: true });

financeTransactionSchema.index({ paidAt: -1 });
financeTransactionSchema.index({ handledById: 1 });
financeTransactionSchema.index({ payerClimberId: 1 });

export const FinanceTransaction = mongoose.model('FinanceTransaction', financeTransactionSchema);

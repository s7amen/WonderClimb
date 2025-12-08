import mongoose from 'mongoose';

const financeEntrySchema = new mongoose.Schema({
    transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FinanceTransaction',
        required: true,
        index: true,
    },
    area: {
        type: String,
        required: true,
        enum: ['gym', 'training', 'general'],
        index: true,
    },
    type: { // revenue or expense
        type: String,
        required: true,
        enum: ['revenue', 'expense'],
        index: true,
    },
    itemType: {
        type: String,
        required: true,
        enum: [
            'gym_visit_single',
            'gym_pass',
            'gym_visit_multisport',
            'training_pass',
            'training_single',
            'product',
            'course',
            'coach_fee',
            'instructor_fee',
            'other'
        ],
    },
    pricingCode: {
        type: String,
        default: null,
    },
    quantity: {
        type: Number,
        required: true,
        default: 1,
    },
    unitAmount: {
        type: Number,
        required: true,
    },
    totalAmount: { // quantity * unitAmount
        type: Number,
        required: true,
    },
    // Compatibility field for existing queries that use 'amount'
    amount: {
        type: Number,
        default: function () { return this.totalAmount; }
    },

    // Domain Object Links
    climberId: { // Specific beneficiary
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    gymPassId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GymPass',
        default: null,
    },
    gymVisitId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GymVisit',
        default: null,
    },
    trainingPassId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TrainingPass',
        default: null,
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        default: null,
    },
    sessionIds: [{ // Keeping for session accounting
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
    }],

    // Meta
    date: {
        type: Date,
        required: true,
        default: Date.now,
    },
    description: {
        type: String,
        trim: true,
    },
    createdById: { // usually same as transaction.handledById
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: true,
});

financeEntrySchema.index({ date: 1 });
financeEntrySchema.index({ type: 1, area: 1 });
financeEntrySchema.index({ climberId: 1 });

export const FinanceEntry = mongoose.model('FinanceEntry', financeEntrySchema);

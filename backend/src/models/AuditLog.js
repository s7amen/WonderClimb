import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true,
        index: true
        // Examples: 'USER_LOGIN', 'SALE_PROCESSED', 'PRICE_UPDATE'
    },
    resource: {
        type: String,
        required: true
        // Examples: 'Auth', 'Sale', 'FinanceEntry', 'Pricing'
    },
    resourceId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress: {
        type: String,
    },
    userAgent: {
        type: String,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
});

// TTL Index: Automatically expire logs after 1 year (optional, can be adjusted)
// 31536000 seconds = 365 days
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    token: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    revoked: {
        type: Boolean,
        default: false,
    },
    revokedAt: {
        type: Date,
        default: null,
    },
    replacedByToken: {
        type: String,
        default: null,
    },
    createdIp: {
        type: String,
        default: null,
    },
}, {
    timestamps: true,
});

// Virtual to check if token is expired
refreshTokenSchema.virtual('isExpired').get(function () {
    return Date.now() >= this.expiresAt;
});

// Virtual to check if token is active
refreshTokenSchema.virtual('isActive').get(function () {
    return !this.revoked && !this.isExpired;
});

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

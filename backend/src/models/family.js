import mongoose from 'mongoose';

const familySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    memberIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
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

export const Family = mongoose.model('Family', familySchema);

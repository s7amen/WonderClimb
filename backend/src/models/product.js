import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    sku: {
        type: String,
        trim: true,
        default: null,
    },
    type: {
        type: String,
        required: true,
        enum: ['sale', 'rental'],
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    category: {
        type: String,
        trim: true,
        default: null,
    },
    unit: {
        type: String,
        trim: true,
        default: 'br',
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

export const Product = mongoose.model('Product', productSchema);

import { Product } from '../models/product.js';
import logger from '../middleware/logging.js';

/**
 * Create a new product
 */
export const createProduct = async (productData, createdById) => {
    try {
        const { name, sku, type, price, category, unit, isActive = true, stockQuantity, lowStockThreshold } = productData;

        const product = await Product.create({
            name,
            sku,
            type,
            price,
            category,
            unit,
            stockQuantity,
            lowStockThreshold,
            isActive,
            createdById,
        });

        logger.info({
            productId: product._id,
            name,
            createdById,
        }, 'Product created');

        return product;
    } catch (error) {
        logger.error({ error: error.message, productData }, 'Error creating product');
        throw error;
    }
};

/**
 * Get products with filters
 */
export const getProducts = async (filters = {}, pagination = {}) => {
    try {
        const { type, category, isActive } = filters;
        const { page = 1, limit = 50 } = pagination;

        const query = {};

        if (type) {
            query.type = type;
        }

        if (category) {
            query.category = category;
        }

        if (isActive !== undefined) {
            query.isActive = isActive;
        }

        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            Product.find(query)
                .sort({ name: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Product.countDocuments(query),
        ]);

        return {
            products,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        logger.error({ error: error.message, filters }, 'Error fetching products');
        throw error;
    }
};

/**
 * Get product by ID
 */
export const getProductById = async (productId) => {
    try {
        const product = await Product.findById(productId).lean();

        if (!product) {
            throw new Error('Product not found');
        }

        return product;
    } catch (error) {
        logger.error({ error: error.message, productId }, 'Error fetching product');
        throw error;
    }
};

/**
 * Update product
 */
export const updateProduct = async (productId, updates, updatedById) => {
    try {
        const product = await Product.findByIdAndUpdate(
            productId,
            updates,
            { new: true, runValidators: true }
        );

        if (!product) {
            throw new Error('Product not found');
        }

        logger.info({ productId, updates: Object.keys(updates), updatedById }, 'Product updated');

        return product;
    } catch (error) {
        logger.error({ error: error.message, productId }, 'Error updating product');
        throw error;
    }
};

/**
 * Deactivate product
 */
export const deactivateProduct = async (productId) => {
    try {
        const product = await Product.findByIdAndUpdate(
            productId,
            { isActive: false },
            { new: true }
        );

        if (!product) {
            throw new Error('Product not found');
        }

        logger.info({ productId }, 'Product deactivated');

        return product;
    } catch (error) {
        logger.error({ error: error.message, productId }, 'Error deactivating product');
        throw error;
    }
};

/**
 * Upload product image
 */
export const uploadProductImage = async (productId, imageBuffer, productName) => {
    try {
        const { processProductImage } = await import('../middleware/productImageUpload.js');

        // Process the image
        const { url } = await processProductImage(imageBuffer, productId, productName);

        // Update product with image URL
        const product = await Product.findByIdAndUpdate(
            productId,
            { imageUrl: url },
            { new: true }
        );

        if (!product) {
            throw new Error('Product not found');
        }

        logger.info({ productId, imageUrl: url }, 'Product image uploaded');

        return product;
    } catch (error) {
        logger.error({ error: error.message, productId }, 'Error uploading product image');
        throw error;
    }
};

/**
 * Hard delete product
 */
export const deleteProduct = async (productId) => {
    try {
        const product = await Product.findByIdAndDelete(productId);

        if (!product) {
            throw new Error('Product not found');
        }

        logger.info({ productId }, 'Product permanently deleted');

        return product;
    } catch (error) {
        logger.error({ error: error.message, productId }, 'Error deleting product');
        throw error;
    }
};

/**
 * Reactivate product
 */
export const reactivateProduct = async (productId) => {
    try {
        const product = await Product.findByIdAndUpdate(
            productId,
            { isActive: true },
            { new: true }
        );

        if (!product) {
            throw new Error('Product not found');
        }

        logger.info({ productId }, 'Product reactivated');

        return product;
    } catch (error) {
        logger.error({ error: error.message, productId }, 'Error reactivating product');
        throw error;
    }
};

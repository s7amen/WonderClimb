import * as productService from '../services/productService.js';
import logger from '../middleware/logging.js';

/**
 * GET /api/v1/products
 * List products
 */
export const getProducts = async (req, res) => {
    try {
        const { type, category, isActive, page, limit } = req.query;

        const filters = {};
        if (type) filters.type = type;
        if (category) filters.category = category;
        if (isActive !== undefined) filters.isActive = isActive === 'true';

        const pagination = {};
        if (page) pagination.page = parseInt(page);
        if (limit) pagination.limit = parseInt(limit);

        const result = await productService.getProducts(filters, pagination);

        res.json(result);
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching products');
        res.status(500).json({
            error: { message: 'Failed to fetch products' },
        });
    }
};

/**
 * GET /api/v1/products/:id
 * Get product details
 */
export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await productService.getProductById(id);

        res.json({ product });
    } catch (error) {
        logger.error({ error: error.message }, 'Error fetching product');
        res.status(404).json({
            error: { message: error.message || 'Product not found' },
        });
    }
};

/**
 * POST /api/v1/products
 * Create a product
 */
export const createProduct = async (req, res) => {
    try {
        const productData = req.body;
        const createdById = req.user.id;

        const product = await productService.createProduct(productData, createdById);

        res.status(201).json({
            message: 'Product created successfully',
            product,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error creating product');
        res.status(400).json({
            error: { message: error.message || 'Failed to create product' },
        });
    }
};

/**
 * PATCH /api/v1/products/:id
 * Update a product
 */
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const updatedById = req.user.id;

        const product = await productService.updateProduct(id, updates, updatedById);

        res.json({
            message: 'Product updated successfully',
            product,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error updating product');
        res.status(400).json({
            error: { message: error.message || 'Failed to update product' },
        });
    }
};

/**
 * DELETE /api/v1/products/:id
 * Deactivate a product
 */
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await productService.deactivateProduct(id);

        res.json({
            message: 'Product deactivated successfully',
            product,
        });
    } catch (error) {
        logger.error({ error: error.message }, 'Error deactivating product');
        res.status(400).json({
            error: { message: error.message || 'Failed to deactivate product' },
        });
    }
};

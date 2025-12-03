import express from 'express';
import * as productController from '../controllers/productController.js';
import { authenticate } from '../middleware/auth.js';
import { requireMinRole } from '../middleware/rbac.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/products - List products
// Available to all authenticated users
router.get('/', productController.getProducts);

// GET /api/v1/products/:id - Get product details
// Available to all authenticated users
router.get('/:id', productController.getProductById);

// POST /api/v1/products - Create product
// Requires: admin only
router.post(
    '/',
    requireMinRole('admin'),
    productController.createProduct
);

// PATCH /api/v1/products/:id - Update product
// Requires: admin only
router.patch(
    '/:id',
    requireMinRole('admin'),
    productController.updateProduct
);

// DELETE /api/v1/products/:id - Deactivate product
// Requires: admin only
router.delete(
    '/:id',
    requireMinRole('admin'),
    productController.deleteProduct
);

export default router;

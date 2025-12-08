import express from 'express';
import * as productController from '../controllers/productController.js';
import { authenticate } from '../middleware/auth.js';
import { requireMinRole } from '../middleware/rbac.js';
import { upload } from '../middleware/upload.js';

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

// POST /api/v1/products/:id/image - Upload product image
// Requires: admin only
router.post(
    '/:id/image',
    requireMinRole('admin'),
    upload.single('image'),
    productController.uploadProductImage
);

// DELETE /api/v1/products/:id - Deactivate product
// Requires: admin only
router.delete(
    '/:id',
    requireMinRole('admin'),
    productController.deleteProduct
);

// DELETE /api/v1/products/:id/permanent - Hard delete product
// Requires: admin only
router.delete(
    '/:id/permanent',
    requireMinRole('admin'),
    productController.hardDeleteProduct
);

// POST /api/v1/products/:id/reactivate - Reactivate product
// Requires: admin only
router.post(
    '/:id/reactivate',
    requireMinRole('admin'),
    productController.reactivateProduct
);

export default router;
